/**
 * Script de test local — persistance des résultats d'analyse (Phase 9).
 *
 * Prérequis :
 *   Phases 1 → 5 exécutées (import, facts, terms + linking)
 *   Une consultation existante en base (requise pour Finding.consultationId)
 *
 *   Si aucune consultation n'existe :
 *     Créer un patient + une consultation minimale via l'application,
 *     ou utiliser le script de seed ci-dessous (commenté).
 *
 * Exécution :
 *   npx tsx scripts/test-analysis-persistence.ts
 *
 *   Pour cibler une consultation spécifique :
 *   CONSULTATION_ID=<uuid> npx tsx scripts/test-analysis-persistence.ts
 *
 * Cas testés :
 *   Run 1 — metformine + oméprazole → déplétion B12/Mg
 *   Run 2 — même input (idempotence intra-run : 0 doublon)
 *   Run 3 — lévothyroxine + calcium → interactions
 */

import { db } from "../lib/db";
import { runSecureMatching } from "../lib/knowledge/matching/services/run-matching";
import { runDeterministicAnalysis } from "../lib/knowledge/analysis/services/run-analysis";
import { persistAnalysisResults } from "../lib/knowledge/persistence/persist";
import type { ConsultationMatchInput } from "../lib/knowledge/matching/types";

// ---------------------------------------------------------------------------
// Résolution de la consultationId
// ---------------------------------------------------------------------------

async function resolveConsultationId(): Promise<string> {
  const envId = process.env.CONSULTATION_ID;
  if (envId) {
    const exists = await db.consultation.findUnique({
      where: { id: envId },
      select: { id: true },
    });
    if (!exists) throw new Error(`Consultation ${envId} introuvable en base`);
    return envId;
  }

  // Prend la première consultation disponible
  const first = await db.consultation.findFirst({
    orderBy: { createdAt: "asc" },
    select:  { id: true, patientId: true },
  });

  if (!first) {
    throw new Error(
      "Aucune consultation en base. " +
        "Créez-en une via l'application ou renseignez CONSULTATION_ID=<uuid>."
    );
  }

  console.log(`[test] Consultation utilisée : ${first.id}`);
  return first.id;
}

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

const TEST_INPUTS: Array<{ label: string; input: ConsultationMatchInput }> = [
  {
    label: "Run 1 — Metformine + Oméprazole",
    input: { drugs: ["metformine", "oméprazole"] },
  },
  {
    label: "Run 2 — Même input (test idempotence)",
    input: { drugs: ["metformine", "oméprazole"] },
  },
  {
    label: "Run 3 — Lévothyroxine + Calcium",
    input: { drugs: ["lévothyroxine"], nutrients: ["calcium"] },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(64));
  console.log(" NaturoDesk — Test Persistance Analyse (Phase 9)");
  console.log("=".repeat(64));

  const consultationId = await resolveConsultationId();
  console.log();

  for (const tc of TEST_INPUTS) {
    console.log("─".repeat(64));
    console.log(` ${tc.label}`);
    console.log("─".repeat(64));

    // Pipeline complet matching → analyse
    const matchResult    = await runSecureMatching(tc.input);
    const analysisResult = runDeterministicAnalysis(matchResult);

    console.log(
      `[test] Analyse : terms=${matchResult.termsMatched.length} ` +
        `facts=${analysisResult.summary.totalFacts} ` +
        `highestRisk=${analysisResult.summary.highestRisk ?? "none"}`
    );

    // Persistance
    const result = await persistAnalysisResults(analysisResult, consultationId);

    console.log();
    console.log(`  AnalysisRun créé  : ${result.analysisRunId}`);
    console.log(`  Findings créés    : ${result.findingsCreated}`);
    console.log(`  Findings ignorés  : ${result.findingsSkipped} (doublons intra-run)`);
    console.log(`  Citations créées  : ${result.citationsCreated}`);
    console.log(`  Durée             : ${result.durationMs}ms`);

    if (result.errors.length > 0) {
      console.log(`  Erreurs (${result.errors.length}) :`);
      for (const e of result.errors) {
        console.log(`    ✗ [${e.context}] ${e.error}`);
      }
    } else {
      console.log("  Erreurs           : 0");
    }
    console.log();
  }

  // Vérification en base : lecture des findings du dernier run
  console.log("─".repeat(64));
  console.log(" Vérification en base");
  console.log("─".repeat(64));

  const runs = await db.analysisRun.findMany({
    where:   { consultationId, stage: "KNOWLEDGE" },
    orderBy: { createdAt: "desc" },
    take:    3,
    select:  {
      id:         true,
      status:     true,
      createdAt:  true,
      finishedAt: true,
      findings:   {
        select: {
          id:        true,
          category:  true,
          title:     true,
          riskLevel: true,
          confidence: true,
          citations: { select: { id: true, knowledgeFactId: true } },
        },
      },
    },
  });

  console.log(`\n  Runs KNOWLEDGE en base (${runs.length}) :`);
  for (const run of runs) {
    const dur = run.finishedAt
      ? `${run.finishedAt.getTime() - run.createdAt.getTime()}ms`
      : "en cours";
    console.log(`\n  Run ${run.id} [${run.status}] — ${dur}`);
    console.log(`    Findings : ${run.findings.length}`);
    for (const f of run.findings) {
      const citations = f.citations.length;
      console.log(
        `      • [${f.category}/${f.riskLevel}] ${f.title.slice(0, 55)}… (${citations} cit.)`
      );
    }
  }

  console.log();
  console.log("=".repeat(64));
  console.log(" Tests terminés.");
  console.log("=".repeat(64));

  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
