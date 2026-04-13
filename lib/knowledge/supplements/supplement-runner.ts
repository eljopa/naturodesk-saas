/**
 * Orchestrateur du pipeline d'analyse suppléments (V1 ODS + V2 structuré).
 *
 * Pipeline en deux couches complémentaires :
 *
 * ── Couche V2 (structurée, par intake) ───────────────────────────────────
 *   Pour chaque supplément saisi :
 *     1. Parse riche → ParsedSupplementIntake (dose, unités, timing, etc.)
 *     2. Matching parent KnowledgeTerm via clé normalisée du parsedLabel
 *     3. Résolution variante KnowledgeTermVariant
 *     4. Persistance ConsultationSupplementIntake
 *
 * ── Couche V1 (findings ODS, par terme parent) ──────────────────────────
 *     5. Enrichissement ODS (batch sur termIds uniques)
 *     6. Génération findings (INTERACTION, SIDE_EFFECT, PROTOCOL, TERRAIN, QUESTION)
 *     7. Persistance findings
 *
 * Compatibilité :
 *   La couche V1 est entièrement préservée.
 *   Les intakes V2 s'ajoutent sans modifier le flux de findings existant.
 *
 * Non-bloquant :
 *   Les erreurs de persistance intake n'arrêtent pas la couche findings.
 *   Chaque couche retourne ses propres erreurs dans le summary.
 */

import { db } from "@/lib/db";
import { parseSupplementIntake } from "./services/parse-supplement-intake";
import { resolveVariant } from "./services/resolve-variant";
import { persistSupplementIntakes } from "./services/persist-intake";
import { enrichTermsFromOds } from "./services/enrich-from-ods";
import { generateEnrichedSupplementFindings } from "./services/generate-enriched-findings";
import { generateDrugSupplementFindings } from "./services/detect-drug-interactions";
import { finalizeAnalysisRun } from "@/lib/knowledge/persistence/services/create-run";
import { persistFindings } from "@/lib/knowledge/persistence/services/persist-findings";
import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import { resolveAlias } from "@/lib/knowledge/terms/utils/aliases";
import type { TermType } from "@prisma/client";
import type { TermMatchResult, TermNoMatch } from "@/lib/knowledge/matching/types";
import type { IntakeWithResolution, SupplementRunSummary, ResolutionConfidence } from "./types";
import type { MedicationEntry } from "@/lib/analysis/types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exécute le pipeline d'analyse suppléments complet (V1 + V2) pour une consultation.
 *
 * @throws Error si la consultation n'existe pas.
 */
export async function runSupplementAnalysis(
  consultationId: string
): Promise<SupplementRunSummary> {
  const startedAt = Date.now();
  const errors: Array<{ context: string; error: string }> = [];

  console.log(`[supplements] ▶ Démarrage — consultation=${consultationId}`);

  // ── 1. Chargement ────────────────────────────────────────────────────────
  const consultation = await db.consultation.findUnique({
    where:  { id: consultationId },
    select: {
      supplements: { select: { name: true } },
      medications: {
        select: { name: true, dosage: true, frequency: true, duration: true, drugKey: true },
      },
    },
  });

  if (!consultation) throw new Error(`Consultation ${consultationId} introuvable`);

  const rawNames = consultation.supplements
    .map((s) => s.name)
    .filter((n) => n.trim().length > 0);

  // Normalisation des médicaments pour le moteur de détection croisée.
  const medicationEntries: MedicationEntry[] = consultation.medications.map((m) => ({
    name:      m.name,
    dosage:    m.dosage,
    frequency: m.frequency,
    duration:  m.duration,
    drugKey:   m.drugKey,
  }));

  // ── 2. Création du run ───────────────────────────────────────────────────
  const run = await db.analysisRun.create({
    data: {
      consultationId,
      idempotencyKey: `supplement-ods:${consultationId}:${Date.now()}`,
      status:    "RUNNING",
      stage:     "SUPPLEMENT_ODS",
      startedAt: new Date(),
    },
  });

  console.log(`[supplements] AnalysisRun créé : ${run.id}`);

  try {
    if (rawNames.length === 0) {
      await finalizeAnalysisRun(run.id, "DONE");
      return emptyResult(consultationId, run.id, startedAt);
    }

    console.log(`[supplements] ${rawNames.length} supplément(s) à analyser`);

    // ── 3. Parsing riche (V2) ─────────────────────────────────────────────
    const parsedIntakes = rawNames.map((raw) => parseSupplementIntake(raw));

    // ── 4. Matching parent + résolution variante ─────────────────────────
    // On matche chaque intake individuellement (sans déduplication) pour
    // conserver les duplicatas termId nécessaires à la détection PROTOCOL.
    const intakesWithResolution: IntakeWithResolution[] = [];
    const matchedTerms:   TermMatchResult[] = [];
    const unmatchedTerms: TermNoMatch[]     = [];

    for (const parsed of parsedIntakes) {
      const resolution = await resolveIntake(parsed);

      intakesWithResolution.push({
        ...parsed,
        knowledgeTermId:        resolution.termId,
        knowledgeTermVariantId: resolution.variantId,
        canonicalName:          resolution.canonicalName,
        variantLabel:           resolution.variantLabel,
        variantType:            resolution.variantType,
        variantNotes:           resolution.variantNotes,
        resolutionConfidence:   resolution.resolutionConfidence,
      });

      if (resolution.termMatch) {
        matchedTerms.push(resolution.termMatch);
      } else {
        unmatchedTerms.push({
          rawInput:      parsed.rawText,
          normalizedKey: parsed.normalizedKey ?? "",
          reason:        "not_found",
        });
      }
    }

    console.log(
      `[supplements] Matching — reconnus=${matchedTerms.length} ` +
      `non-reconnus=${unmatchedTerms.length}`
    );

    // ── 5. Persistance des intakes (V2) ───────────────────────────────────
    const intakeResult = await persistSupplementIntakes(consultationId, intakesWithResolution);
    if (intakeResult.errors.length > 0) errors.push(...intakeResult.errors);

    const variantsResolvedCount = intakesWithResolution.filter(
      (i) => i.knowledgeTermVariantId !== null
    ).length;

    console.log(
      `[supplements] Intakes créés : ${intakeResult.created} ` +
      `(variantes résolues : ${variantsResolvedCount})`
    );

    // ── 6. Doublons (termId count) ────────────────────────────────────────
    const termIdCount = new Map<string, number>();
    for (const m of matchedTerms) {
      termIdCount.set(m.termId, (termIdCount.get(m.termId) ?? 0) + 1);
    }
    const duplicateCount = [...termIdCount.values()].filter((c) => c > 1).length;

    // ── 7. Enrichissement ODS (batch sur termIds uniques) ─────────────────
    const uniqueTerms = [
      ...new Map(matchedTerms.map((m) => [m.termId, m])).values(),
    ].map((m) => ({
      termId:        m.termId,
      normalizedKey: m.normalizedKey,
      canonicalName: m.canonicalName,
    }));

    const enrichment = await enrichTermsFromOds(uniqueTerms);
    const withOdsCount = [...enrichment.values()].filter((e) => e.hasOdsData).length;

    console.log(
      `[supplements] ODS — ${withOdsCount}/${uniqueTerms.length} terme(s) avec données`
    );

    // ── 8. Génération findings enrichis ODS (V2) ─────────────────────────
    const odsFindings = generateEnrichedSupplementFindings(
      intakesWithResolution,
      enrichment,
      consultationId,
      run.id
    );

    // ── 8.5. Interactions croisées médicaments ↔ suppléments (seeds V1) ──
    // Sous-étape déterministe et isolée — peut être extraite en runner dédié.
    const crossFindings = generateDrugSupplementFindings(
      intakesWithResolution,
      medicationEntries,
      consultationId,
      run.id,
    );

    if (crossFindings.length > 0) {
      console.log(
        `[supplements] Interactions croisées — ${crossFindings.length} finding(s) médicaments ↔ suppléments`
      );
    }

    const findingInputs = [...odsFindings, ...crossFindings];

    // ── 9. Persistance findings ───────────────────────────────────────────
    const persistResult = await persistFindings(findingInputs);
    if (persistResult.errors.length > 0) errors.push(...persistResult.errors);

    // ── 10. Finalisation ──────────────────────────────────────────────────
    await finalizeAnalysisRun(run.id, errors.length > 0 ? "ERROR" : "DONE");

    const durationMs = Date.now() - startedAt;
    console.log(
      `[supplements] ✓ Terminé — run=${run.id} ` +
      `intakes=${intakeResult.created} findings=${persistResult.findingsCreated} ` +
      `durée=${durationMs}ms`
    );

    return {
      consultationId,
      analysisRunId:         run.id,
      inputCount:            rawNames.length,
      matchedCount:          matchedTerms.length,
      unmatchedCount:        unmatchedTerms.length,
      withOdsCount,
      duplicateCount,
      variantsResolvedCount,
      intakesCreated:        intakeResult.created,
      findingsCreated:       persistResult.findingsCreated,
      findingsSkipped:       persistResult.findingsSkipped,
      durationMs,
      errors,
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[supplements] ✗ Erreur critique — run=${run.id} : ${msg}`);
    await finalizeAnalysisRun(run.id, "ERROR", msg).catch(() => {});

    return {
      consultationId,
      analysisRunId:         run.id,
      inputCount:            rawNames.length,
      matchedCount:          0,
      unmatchedCount:        0,
      withOdsCount:          0,
      duplicateCount:        0,
      variantsResolvedCount: 0,
      intakesCreated:        0,
      findingsCreated:       0,
      findingsSkipped:       0,
      durationMs:            Date.now() - startedAt,
      errors:                [{ context: "runSupplementAnalysis", error: msg }, ...errors],
    };
  }
}

// ---------------------------------------------------------------------------
// Matching + variant resolution (inline — évite un fichier pour 30 lignes)
// ---------------------------------------------------------------------------

interface IntakeResolution {
  termId:               string | null;
  canonicalName:        string | null;
  variantId:            string | null;
  variantLabel:         string | null;
  variantType:          string | null;
  variantNotes:         string | null;
  termMatch:            TermMatchResult | null;
  resolutionConfidence: ResolutionConfidence;
}

/**
 * Résout un intake parsé vers son terme parent et sa variante.
 * Réutilise le même pipeline lexical que matchConsultationTerms
 * (alias_dictionary → exact_key) sans requête ILIKE pour la performance.
 */
async function resolveIntake(
  parsed: ReturnType<typeof parseSupplementIntake>
): Promise<IntakeResolution> {
  const key = parsed.normalizedKey;

  if (!key) return { termId: null, canonicalName: null, variantId: null, variantLabel: null, variantType: null, variantNotes: null, termMatch: null, resolutionConfidence: "NONE" };

  // ── Étape 1 : alias_dictionary ───────────────────────────────────────────
  const aliasEntry = resolveAlias(key);
  let term = aliasEntry
    ? await db.knowledgeTerm.findUnique({
        where:  { normalizedKey: buildNormalizedKey(aliasEntry.canonicalName) },
        select: { id: true, canonicalName: true, normalizedKey: true, termType: true },
      })
    : null;
  let matchStep: "alias_dictionary" | "exact_key" | "alias_db" =
    (aliasEntry && term) ? "alias_dictionary" : "exact_key";

  // ── Étape 2 : exact_key ──────────────────────────────────────────────────
  if (!term) {
    term = await db.knowledgeTerm.findUnique({
      where:  { normalizedKey: key },
      select: { id: true, canonicalName: true, normalizedKey: true, termType: true },
    });
    if (term) matchStep = "exact_key";
  }

  // ── Étape 3 : alias_db ILIKE ─────────────────────────────────────────────
  if (!term && parsed.parsedLabel) {
    const rows = await db.$queryRaw<Array<{
      id: string; termType: string; canonicalName: string; normalizedKey: string;
    }>>`
      SELECT id, "termType", "canonicalName", "normalizedKey"
      FROM knowledge_terms
      WHERE ${parsed.parsedLabel} ILIKE ANY(aliases)
      LIMIT 1
    `;
    if (rows.length > 0) {
      const r = rows[0]!;
      term = { id: r.id, canonicalName: r.canonicalName, normalizedKey: r.normalizedKey, termType: r.termType as TermType };
      matchStep = "alias_db";
    }
  }

  if (!term) {
    console.log(`[supplements] not_found : "${parsed.rawText.slice(0, 50)}" (key=${key})`);
    return { termId: null, canonicalName: null, variantId: null, variantLabel: null, variantType: null, variantNotes: null, termMatch: null, resolutionConfidence: "NONE" };
  }

  // ── Dérivation resolutionConfidence ──────────────────────────────────────
  // alias_dictionary / exact_key → clé normalisée exacte     → HIGH
  // alias_db                     → correspondance ILIKE       → MEDIUM
  const resolutionConfidence: ResolutionConfidence =
    matchStep === "alias_db" ? "MEDIUM" : "HIGH";

  console.log(
    `[supplements] matched : "${parsed.rawText.slice(0, 50)}" → ${term.canonicalName} ` +
    `(${matchStep}, resolConf=${resolutionConfidence})`
  );

  const termMatch: TermMatchResult = {
    rawInput:      parsed.rawText,
    termId:        term.id,
    canonicalName: term.canonicalName,
    normalizedKey: term.normalizedKey,
    termType:      term.termType,
    matchMethod:   matchStep,
  };

  // ── Résolution variante ──────────────────────────────────────────────────
  const variantRes = key
    ? await resolveVariant(key, term.id)
    : null;

  if (variantRes) {
    console.log(
      `[supplements] variant : "${parsed.parsedLabel}" → ${variantRes.variantLabel}`
    );
  }

  return {
    termId:               term.id,
    canonicalName:        term.canonicalName,
    variantId:            variantRes?.variantId    ?? null,
    variantLabel:         variantRes?.variantLabel ?? null,
    variantType:          variantRes?.variantType  ?? null,
    variantNotes:         variantRes?.variantNotes ?? null,
    termMatch,
    resolutionConfidence,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function emptyResult(
  consultationId: string,
  analysisRunId:  string,
  startedAt:      number
): SupplementRunSummary {
  return {
    consultationId,
    analysisRunId,
    inputCount:            0,
    matchedCount:          0,
    unmatchedCount:        0,
    withOdsCount:          0,
    duplicateCount:        0,
    variantsResolvedCount: 0,
    intakesCreated:        0,
    findingsCreated:       0,
    findingsSkipped:       0,
    durationMs:            Date.now() - startedAt,
    errors:                [],
  };
}
