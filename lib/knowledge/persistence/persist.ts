/**
 * Orchestrateur de persistance des résultats d'analyse knowledge.
 *
 * persistAnalysisResults() :
 *   1. createKnowledgeAnalysisRun()  — crée le run en état RUNNING
 *   2. mapAnalysisResultToFindings() — convertit ScoredFact[] → FindingInput[]
 *   3. persistFindings()             — persiste findings + citations
 *   4. finalizeAnalysisRun()         — passe le run en DONE (ou ERROR)
 *
 * Idempotence :
 *   Chaque appel crée un nouveau run (historique préservé).
 *   Les doublons intra-run sont évités via dedup par titre.
 *   Les findings d'anciens runs ne sont jamais supprimés.
 *
 * En cas d'erreur lors de la persistance : le run passe en ERROR,
 * les findings déjà créés restent (pas de rollback global).
 */

import { createKnowledgeAnalysisRun, finalizeAnalysisRun } from "./services/create-run";
import { mapAnalysisResultToFindings } from "./services/map-findings";
import { persistFindings } from "./services/persist-findings";
import type { AnalysisResult } from "@/lib/knowledge/analysis/types";
import type { PersistenceResult } from "./types";

/**
 * Persiste les résultats d'une analyse knowledge pour une consultation donnée.
 *
 * @param analysisResult  Résultat de runDeterministicAnalysis().
 * @param consultationId  ID Prisma de la consultation liée.
 */
export async function persistAnalysisResults(
  analysisResult: AnalysisResult,
  consultationId: string
): Promise<PersistenceResult> {
  const startedAt = Date.now();

  // --- Étape 1 : Créer le run ---
  const run = await createKnowledgeAnalysisRun(consultationId);

  try {
    // --- Étape 2 : Mapper les findings ---
    const findingInputs = mapAnalysisResultToFindings(
      analysisResult,
      consultationId,
      run.id
    );

    console.log(
      `[persistence] ▶ ${findingInputs.length} finding(s) à persister pour run=${run.id}`
    );

    // --- Étape 3 : Persister ---
    const persistResult = await persistFindings(findingInputs);

    // --- Étape 4 : Finaliser le run ---
    const hasErrors = persistResult.errors.length > 0;
    await finalizeAnalysisRun(run.id, hasErrors ? "ERROR" : "DONE");

    const durationMs = Date.now() - startedAt;

    console.log(
      `[persistence] ✓ Run ${run.id} terminé — créés=${persistResult.findingsCreated} ` +
        `ignorés=${persistResult.findingsSkipped} citations=${persistResult.citationsCreated} ` +
        `erreurs=${persistResult.errors.length} durée=${durationMs}ms`
    );

    return {
      analysisRunId:   run.id,
      findingsCreated:  persistResult.findingsCreated,
      findingsSkipped:  persistResult.findingsSkipped,
      citationsCreated: persistResult.citationsCreated,
      durationMs,
      errors:           persistResult.errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[persistence] ✗ Erreur critique run=${run.id} : ${msg}`);

    await finalizeAnalysisRun(run.id, "ERROR", msg).catch(() => {});

    return {
      analysisRunId:   run.id,
      findingsCreated:  0,
      findingsSkipped:  0,
      citationsCreated: 0,
      durationMs:       Date.now() - startedAt,
      errors:           [{ context: "persistAnalysisResults", error: msg }],
    };
  }
}
