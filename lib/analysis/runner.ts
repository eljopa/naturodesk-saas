import { after } from "next/server";
import { db } from "@/lib/db";
import type { ConsultationSnapshot } from "./types";
import type { Prisma } from "@prisma/client";
import { runRules } from "./rules";
import { callOpenAI } from "./openai";
import { semanticSearchMulti } from "@/lib/knowledge/search";
import type { SearchResult } from "@/lib/knowledge/search";
import { runKnowledgeAnalysisForConsultation } from "@/lib/knowledge/consultation-runner";
import { runSupplementAnalysis } from "@/lib/knowledge/supplements/supplement-runner";
import { runMedicationAnalysis } from "@/lib/knowledge/medications/medication-runner";
import { buildBdpmContext } from "./services/build-bdpm-context";
import type { BdpmAnalysisContext } from "./services/build-bdpm-context";

// ---------------------------------------------------------------------------
// Load snapshot from DB
// ---------------------------------------------------------------------------

async function loadSnapshot(consultationId: string): Promise<ConsultationSnapshot> {
  const c = await db.consultation.findUniqueOrThrow({
    where: { id: consultationId },
    select: {
      id: true,
      context: true,
      symptoms: {
        select: { label: true, intensity: true, duration: true, category: true },
        orderBy: { createdAt: "asc" },
      },
      medications: {
        select: { name: true, dosage: true, frequency: true, duration: true, drugKey: true },
        orderBy: { createdAt: "asc" },
      },
      supplements: {
        select: { name: true, dosage: true, duration: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return c;
}

// ---------------------------------------------------------------------------
// Ensure rule records exist in DB (upsert on first run)
// ---------------------------------------------------------------------------

const RULE_DEFS = [
  { code: "MISSING_DATA_NO_SYMPTOMS", name: "Aucun symptôme renseigné", category: "MISSING_DATA" as const },
  { code: "MISSING_DATA_NO_CONTEXT", name: "Contexte clinique insuffisant", category: "MISSING_DATA" as const },
  { code: "MEDICATION_LOAD_HIGH", name: "Charge médicamenteuse élevée (≥5 médicaments)", category: "MEDICATION_LOAD" as const },
  { code: "DEPLETION_STATINS_COQ10", name: "Déplétion CoQ10 probable sous statine", category: "DEPLETION" as const },
  { code: "DEPLETION_PPI_B12_MG", name: "Risque déplétion B12/Mg sous IPP", category: "DEPLETION" as const },
  { code: "INTERACTION_ANTICOAG_NATURALS", name: "Interaction anticoagulant + fluidifiant naturel", category: "PROTOCOL_VIGILANCE" as const },
] as const;

async function ensureRules(): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>();

  for (const def of RULE_DEFS) {
    const rule = await db.rule.upsert({
      where: { code: def.code },
      update: {},
      create: { code: def.code, name: def.name, category: def.category, enabled: true },
      select: { id: true, code: true },
    });
    codeToId.set(rule.code, rule.id);
  }

  return codeToId;
}

// ---------------------------------------------------------------------------
// Format RAG context for the LLM prompt
// ---------------------------------------------------------------------------

function formatRagContext(results: SearchResult[]): string {
  if (results.length === 0) return "";
  const lines = ["## SOURCES DOCUMENTAIRES PERTINENTES", ""];
  for (const r of results.slice(0, 6)) {
    lines.push(`**${r.documentTitle}** (${(r.score * 100).toFixed(0)}% pertinence)`);
    lines.push(`> ${r.excerpt}`);
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main runner — called by the Server Action
// ---------------------------------------------------------------------------

export async function runAnalysis(consultationId: string, runId: string): Promise<void> {
  // Mark run as RUNNING
  await db.$transaction([
    db.analysisRun.update({
      where: { id: runId },
      data: { status: "RUNNING", stage: "INIT", startedAt: new Date() },
    }),
    db.consultation.update({
      where: { id: consultationId },
      data: { status: "ANALYSIS_RUNNING" },
    }),
  ]);

  try {
    // ---- 1. Load data ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "LOAD" } });
    const snapshot = await loadSnapshot(consultationId);

    // ---- 2. Ensure rule records exist ----
    const ruleCodeToId = await ensureRules();

    // ---- 3. Rules engine ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "RULES" } });
    const ruleResults = runRules(snapshot);

    // Persist RuleRun records
    await db.ruleRun.createMany({
      data: ruleResults
        .filter((r) => ruleCodeToId.has(r.ruleCode))
        .map((r) => ({
          consultationId,
          ruleId: ruleCodeToId.get(r.ruleCode)!,
          matched: r.matched,
          evidenceJson: r.evidence as Prisma.InputJsonValue,
        })),
    });

    // ---- 4. Semantic search (RAG) — graceful degradation if KB empty ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "SEMANTIC" } });
    let ragContext = "";
    let ragResults: SearchResult[] = [];
    try {
      const medQueries = snapshot.medications.map((m) => m.name);
      const symptomQueries = snapshot.symptoms.slice(0, 3).map((s) => s.label);
      const queries = [...medQueries, ...symptomQueries];

      if (queries.length > 0) {
        ragResults = await semanticSearchMulti(queries, 3, 0.55);
        ragContext = formatRagContext(ragResults);
      }
    } catch {
      // KB may be empty or embedding unavailable — continue without RAG
    }

    // ---- 4.5. BDPM context enrichment ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "BDPM_CONTEXT" } });
    let bdpmContext: BdpmAnalysisContext = { medications: [], summaryText: "" };
    try {
      // Passer uniquement m.name (label saisi par l'utilisateur) — le dosage et la fréquence
      // sont des champs structurés séparés, pas à réinjecter dans le parser de matching.
      const medNames = snapshot.medications.map((m) => m.name);
      if (medNames.length > 0) {
        bdpmContext = await buildBdpmContext(medNames);
        const resolved = bdpmContext.medications.filter(
          (med) => med.drugProductId ?? med.drugSubstanceId,
        ).length;
        console.log(
          `[analysis:bdpm] ${resolved}/${medNames.length} médicament(s) résolu(s) en BDPM — ` +
          `consultation=${consultationId}`,
        );
      }
    } catch (err) {
      // BDPM enrichment is non-blocking — analysis continues without it
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[analysis:bdpm] Enrichissement BDPM échoué (non bloquant) : ${msg}`);
    }

    // ---- 5. OpenAI ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "LLM" } });
    const llmResult = await callOpenAI(snapshot, ragContext, bdpmContext);

    // ---- 6. Persist findings ----
    await db.analysisRun.update({ where: { id: runId }, data: { stage: "PERSIST" } });

    // Delete previous auto-generated findings (keep MANUAL)
    await db.finding.deleteMany({
      where: { consultationId, sourceType: { in: ["RULE", "LLM", "SEMANTIC"] } },
    });

    // Rule-based findings
    const ruleFindingsData = ruleResults
      .filter((r) => r.matched && r.finding)
      .map((r) => ({
        consultationId,
        category: r.finding!.category,
        title: r.finding!.title,
        description: r.finding!.description,
        confidence: r.finding!.confidence,
        sourceType: "RULE" as const,
      }));

    // LLM findings
    const llmFindingsData = llmResult.findings.map((f) => ({
      consultationId,
      category:      f.category,
      title:         f.title,
      description:   f.description,
      confidence:    f.confidence,
      sourceType:    "LLM" as const,
      evidenceLevel: f.evidenceLevel ?? null,
    }));

    // Log traçabilité BDPM findings
    const documented = llmResult.findings.filter((f) => f.evidenceLevel === "DOCUMENTED").length;
    const signals    = llmResult.findings.filter((f) => f.evidenceLevel === "SIGNAL").length;
    const hypotheses = llmResult.findings.filter((f) => f.evidenceLevel === "HYPOTHESIS").length;
    if (llmResult.findings.length > 0) {
      console.log(
        `[analysis:llm] findings=${llmResult.findings.length} ` +
        `documented=${documented} signal=${signals} hypothesis=${hypotheses} ` +
        `consultation=${consultationId}`,
      );
    }

    // Semantic findings — one finding per unique document cited (if any)
    const seenDocs = new Set<string>();
    const semanticFindingsData = ragResults
      .filter((r) => {
        if (seenDocs.has(r.documentId)) return false;
        seenDocs.add(r.documentId);
        return true;
      })
      .map((r) => ({
        consultationId,
        category: "TERRAIN" as const,
        title: `Référence documentaire : ${r.documentTitle}`,
        description: `Extrait pertinent trouvé dans la base documentaire (${(r.score * 100).toFixed(0)}% pertinence) : « ${r.excerpt.slice(0, 300)}${r.excerpt.length > 300 ? "…" : ""} »`,
        confidence: r.score,
        sourceType: "SEMANTIC" as const,
      }));

    const allFindings = [...ruleFindingsData, ...llmFindingsData, ...semanticFindingsData];
    if (allFindings.length > 0) {
      await db.finding.createMany({ data: allFindings });
    }

    // ---- 7. Finalize ----
    const costEstimate = (llmResult.tokensUsed / 1_000_000) * 0.15;

    await db.$transaction([
      db.consultation.update({
        where: { id: consultationId },
        data: {
          status: "ANALYSIS_DONE",
          medicationLoadLevel: llmResult.medicationLoadLevel,
          medicationLoadScore: llmResult.medicationLoadScore,
          terrainSummary: llmResult.terrainSummary,
        },
      }),
      db.analysisRun.update({
        where: { id: runId },
        data: {
          status: "DONE",
          stage: "DONE",
          tokensUsed: llmResult.tokensUsed,
          costEstimate,
          finishedAt: new Date(),
        },
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.$transaction([
      db.consultation.update({
        where: { id: consultationId },
        data: { status: "ANALYSIS_ERROR" },
      }),
      db.analysisRun.update({
        where: { id: runId },
        data: {
          status: "ERROR",
          stage: "ERROR",
          errorCode: "RUNNER_ERROR",
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      }),
    ]);
    throw err;
  }

  // ---- 8. Knowledge pipeline (après réponse, retry max 2) ----
  // `after()` garantit l'exécution après envoi de la réponse — fiable self-hosted ET Vercel.
  after(async () => {
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await runKnowledgeAnalysisForConsultation(consultationId);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[analysis:knowledge] Tentative ${attempt}/${MAX_ATTEMPTS} échouée — ` +
            `réessai dans 2s — consultation=${consultationId} : ${msg}`
          );
          await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
        } else {
          console.error(
            `[analysis:knowledge] ✗ Échec définitif (${MAX_ATTEMPTS} tentatives) — ` +
            `consultation=${consultationId} : ${msg}`
          );
        }
      }
    }
  });

  // ---- 9. Supplement pipeline (après réponse) ----
  after(async () => {
    try {
      await runSupplementAnalysis(consultationId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[analysis:supplements] ✗ Échec — consultation=${consultationId} : ${msg}`
      );
    }
  });

  // ---- 10. Medication pipeline (après réponse) ----
  after(async () => {
    try {
      await runMedicationAnalysis(consultationId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[analysis:medications] ✗ Échec — consultation=${consultationId} : ${msg}`
      );
    }
  });
}
