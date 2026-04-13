/**
 * Pipeline knowledge pour une consultation existante.
 *
 * runKnowledgeAnalysisForConsultation() :
 *   1. Charge les données de la consultation (medications, supplements, symptoms)
 *   2. Construit le ConsultationMatchInput
 *   3. Lance runSecureMatching() → runDeterministicAnalysis()
 *   4. Persiste les résultats via persistAnalysisResults()
 *   5. Retourne un résumé traçable
 *
 * Conception non-bloquante :
 *   Cette fonction est conçue pour être appelée avec .catch() par le runner principal.
 *   Si elle lève une erreur, le runner principal n'est pas affecté.
 *
 * Idempotence :
 *   Chaque appel crée un nouveau AnalysisRun (snapshot historique).
 *   Les findings du run précédent sont préservés.
 */

import { db } from "@/lib/db";
import { runSecureMatching } from "@/lib/knowledge/matching/services/run-matching";
import { runDeterministicAnalysis } from "@/lib/knowledge/analysis/services/run-analysis";
import { persistAnalysisResults } from "@/lib/knowledge/persistence/persist";
import type { RiskLevel } from "@/lib/knowledge/analysis/types";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface KnowledgeRunSummary {
  consultationId:  string;
  analysisRunId:   string;
  termsRecognized: number;
  termsRejected:   number;
  factsFound:      number;
  findingsCreated: number;
  findingsSkipped: number;
  highestRisk:     RiskLevel | null;
  durationMs:      number;
  errors:          Array<{ context: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Exécute le pipeline knowledge complet pour une consultation existante.
 * Charge les données de la consultation, lance matching + analyse, persiste.
 *
 * @throws Error si la consultation n'existe pas ou si le pipeline échoue de façon critique.
 */
export async function runKnowledgeAnalysisForConsultation(
  consultationId: string
): Promise<KnowledgeRunSummary> {
  const startedAt = Date.now();

  console.log(`[analysis:knowledge] ▶ Démarrage — consultation=${consultationId}`);

  // --- Chargement des données consultation ---
  const consultation = await db.consultation.findUnique({
    where:  { id: consultationId },
    select: {
      medications: { select: { name: true } },
      supplements: { select: { name: true } },
      symptoms:    { select: { label: true } },
    },
  });

  if (!consultation) {
    throw new Error(`Consultation ${consultationId} introuvable`);
  }

  const drugs      = consultation.medications.map((m) => m.name).filter(Boolean);
  const supplements = consultation.supplements.map((s) => s.name).filter(Boolean);
  const symptoms   = consultation.symptoms.map((s) => s.label).filter(Boolean);

  const totalInputs = drugs.length + supplements.length + symptoms.length;

  if (totalInputs === 0) {
    console.log(`[analysis:knowledge] ↩ Aucune donnée clinique — pipeline ignoré`);
    // Pas d'erreur — c'est un état normal (consultation vide)
    // On crée quand même un run vide pour traçabilité
    const emptyResult = await persistAnalysisResults(
      {
        alerts:           [],
        interactions:     [],
        warnings:         [],
        depletions:       [],
        contextual_notes: [],
        low_signal:       [],
        supporting_chunks: [],
        summary: {
          termsRecognized: 0, termsUnrecognized: 0, totalFacts: 0,
          alertCount: 0, interactionCount: 0, warningCount: 0,
          depletionCount: 0, contextualCount: 0, lowSignalCount: 0,
          highestRisk: null, semanticUsed: false,
        },
        termsMatched:   [],
        termsUnmatched: [],
        durationMs:     0,
        errors:         [],
      },
      consultationId
    );
    return {
      consultationId,
      analysisRunId:   emptyResult.analysisRunId,
      termsRecognized: 0, termsRejected: 0, factsFound: 0,
      findingsCreated: 0, findingsSkipped: 0, highestRisk: null,
      durationMs:      Date.now() - startedAt,
      errors:          [],
    };
  }

  console.log(
    `[analysis:knowledge] Données chargées — drugs=${drugs.length} ` +
      `supplements=${supplements.length} symptoms=${symptoms.length}`
  );

  // --- Matching ---
  const matchResult = await runSecureMatching({
    drugs,
    supplements,
    symptoms,
    includeSemanticComplement: false,
  });

  console.log(
    `[analysis:knowledge] Matching — reconnus=${matchResult.termsMatched.length} ` +
      `rejetés=${matchResult.termsUnmatched.length} facts=${matchResult.facts.length}`
  );

  // --- Analyse déterministe ---
  const analysisResult = runDeterministicAnalysis(matchResult);

  console.log(
    `[analysis:knowledge] Analyse — alerts=${analysisResult.summary.alertCount} ` +
      `interactions=${analysisResult.summary.interactionCount} ` +
      `depletions=${analysisResult.summary.depletionCount} ` +
      `highestRisk=${analysisResult.summary.highestRisk ?? "none"}`
  );

  // --- Persistance ---
  const persistResult = await persistAnalysisResults(analysisResult, consultationId);

  const durationMs = Date.now() - startedAt;

  console.log(
    `[analysis:knowledge] ✓ Terminé — run=${persistResult.analysisRunId} ` +
      `findings=${persistResult.findingsCreated} durée=${durationMs}ms`
  );

  return {
    consultationId,
    analysisRunId:   persistResult.analysisRunId,
    termsRecognized: matchResult.termsMatched.length,
    termsRejected:   matchResult.termsUnmatched.length,
    factsFound:      analysisResult.summary.totalFacts,
    findingsCreated: persistResult.findingsCreated,
    findingsSkipped: persistResult.findingsSkipped,
    highestRisk:     analysisResult.summary.highestRisk,
    durationMs,
    errors:          persistResult.errors,
  };
}
