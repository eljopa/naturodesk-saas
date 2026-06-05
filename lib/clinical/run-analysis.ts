/**
 * lib/clinical/run-analysis.ts
 *
 * Orchestrateur principal du moteur d'analyse clinique V1.
 *
 * Pipeline en 6 étapes fonctionnelles :
 *   1. Normalisation des symptômes → SymptomMatch[]
 *   2. Résolution des médicaments  → DrugResolution[]
 *   3. Matching structuré          → RawMatch[]
 *   4. Scoring                     → ScoredItem[]
 *   5. Corroboration               → ScoredItem[] enrichis
 *   6. Synthèse                    → string
 *
 * Persistance :
 *   - ClinicalAnalysis créée en RUNNING avant le pipeline
 *   - AnalysisItem[] persistés en createMany (atomique)
 *   - ClinicalAnalysis mise à jour DONE + summary + durationMs
 *   - En cas d'erreur → FAILED, exception propagée vers l'appelant
 *
 * Garanties :
 *   - Déterministe complet — aucune logique LLM dans ce module
 *   - Médicaments non résolus → tracés dans unresolvedDrugs, non bloquants
 *   - drugInputs conservés tels quels dans ClinicalAnalysis.drugInputs (traçabilité)
 */

import { db } from "@/lib/db";
import { normalizeSymptoms } from "./normalize-symptoms";
import { resolveDrugs }      from "./resolve-drugs";
import { matchStructured }   from "./match-structured";
import { scoreMatches }      from "./score";
import { corroborateItems }  from "./corroborate";
import { synthesize }        from "./synthesize";
import type { ClinicalAnalysisInput, ClinicalAnalysisResult } from "./types";

export async function runClinicalAnalysis(
  input: ClinicalAnalysisInput,
): Promise<ClinicalAnalysisResult> {
  const startTs    = Date.now();
  const assessedAt = input.assessedAt ?? new Date();

  // ── Création ClinicalAnalysis (RUNNING) ───────────────────────────────────
  const analysis = await db.clinicalAnalysis.create({
    data: {
      userId:         input.userId,
      consultationId: input.consultationId ?? null,
      rawSymptoms:    input.rawSymptoms,
      drugInputs:     input.drugs as object,
      assessedAt,
      status:         "RUNNING",
    },
    select: { id: true },
  });

  try {
    // ── Étape 1 : normalisation des symptômes ──────────────────────────────
    const symptomMatches = await normalizeSymptoms(input.rawSymptoms);

    // ── Étape 2 : résolution des médicaments ───────────────────────────────
    const drugResolutions = await resolveDrugs(input.drugs);

    const unresolvedDrugs = drugResolutions
      .filter((d) => d.unresolved)
      .map((d) => d.input.name);

    if (unresolvedDrugs.length > 0) {
      console.warn(
        `[run-analysis] ${unresolvedDrugs.length} médicament(s) non résolu(s) : ` +
        unresolvedDrugs.join(", "),
      );
    }

    // ── Étape 3 : matching structuré ──────────────────────────────────────
    const rawMatches = matchStructured(symptomMatches, drugResolutions);

    // ── Étape 4 : scoring ─────────────────────────────────────────────────
    const scoredItems = scoreMatches(rawMatches);

    // ── Étape 5 : corroboration ────────────────────────────────────────────
    const corroboratedItems = await corroborateItems(scoredItems);

    // ── Étape 6 : synthèse ────────────────────────────────────────────────
    const { summary } = synthesize(corroboratedItems, input.rawSymptoms);

    // ── Persistance des AnalysisItem ──────────────────────────────────────
    if (corroboratedItems.length > 0) {
      await db.analysisItem.createMany({
        data: corroboratedItems.map((item) => ({
          analysisId:          analysis.id,
          symptomTermId:       item.symptomTermId,
          rawSymptomFragment:  item.rawSymptomFragment,
          drugSubstanceId:     item.drugSubstanceId,
          sideEffectId:        item.sideEffectId,
          nutrientDepletionId: item.nutrientDepletionId,
          knowledgeFactId:     item.knowledgeFactId,
          tier:                item.tier,
          confidenceScore:     item.confidenceScore,
          frequencyFactor:     item.frequencyFactor,
          evidenceCeiling:     item.evidenceCeiling,
          temporalModifier:    item.temporalModifier,
          corroborationBoost:  item.corroborationBoost,
          explanation:         null, // LLM reformulation — réservé Phase 4
        })),
      });
    }

    const durationMs = Date.now() - startTs;

    // ── Mise à jour ClinicalAnalysis → DONE ───────────────────────────────
    await db.clinicalAnalysis.update({
      where: { id: analysis.id },
      data: {
        status:    "DONE",
        summary,
        durationMs,
      },
    });

    const tier1Count = corroboratedItems.filter((i) => i.tier === "TIER_1_DIRECT").length;
    const tier2Count = corroboratedItems.filter((i) => i.tier === "TIER_2_INDIRECT").length;
    const tier4Count = corroboratedItems.filter((i) => i.tier === "TIER_4_UNMATCHED").length;

    const unmatchedSymptoms = [
      ...new Set(
        corroboratedItems
          .filter((i) => i.tier === "TIER_4_UNMATCHED")
          .map((i) => i._meta.symptomLabel ?? i.rawSymptomFragment ?? "?"),
      ),
    ];

    return {
      analysisId:       analysis.id,
      status:           "DONE",
      itemCount:        corroboratedItems.length,
      tier1Count,
      tier2Count,
      tier4Count,
      unresolvedDrugs,
      unmatchedSymptoms,
      summary,
      durationMs,
    };
  } catch (err) {
    // Marquer l'analyse comme échouée (non bloquant si la mise à jour elle-même échoue)
    await db.clinicalAnalysis
      .update({ where: { id: analysis.id }, data: { status: "FAILED" } })
      .catch(() => {});

    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[run-analysis] Analyse ${analysis.id} échouée : ${msg}`);
  }
}
