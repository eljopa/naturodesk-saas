/**
 * Batch d'analyse déterministe.
 *
 * runAnalysisBatch() :
 *   Lance le pipeline complet (matching + analyse) pour chaque ConsultationMatchInput.
 *   Séquentiel, erreurs isolées par consultation.
 *
 * Usage : tests automatisés multi-cas, futur endpoint API.
 */

import { runSecureMatching } from "../matching/services/run-matching";
import { runDeterministicAnalysis } from "./services/run-analysis";
import type { ConsultationMatchInput } from "../matching/types";
import type { AnalysisResult, AnalysisBatchResult, AnalysisError } from "./types";

/**
 * Exécute matching + analyse pour chaque consultation fournie.
 * @param inputs Liste des consultations à analyser.
 */
export async function runAnalysisBatch(
  inputs: ConsultationMatchInput[]
): Promise<AnalysisBatchResult> {
  const startedAt = Date.now();
  const errors: AnalysisError[] = [];
  const results: AnalysisResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`[analysis:batch] ▶ ${inputs.length} consultation(s) à analyser`);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]!;
    const label = [
      ...(input.drugs ?? []),
      ...(input.supplements ?? []),
      ...(input.nutrients ?? []),
      ...(input.symptoms ?? []),
    ].join(", ");

    console.log(`[analysis:batch] [${i + 1}/${inputs.length}] "${label}"`);

    try {
      const matchResult = await runSecureMatching(input);
      const analysisResult = runDeterministicAnalysis(matchResult);
      results.push(analysisResult);
      successCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `consultation[${i}]: ${label}`, error: msg });
      errorCount++;
      console.error(`[analysis:batch] ✗ Erreur consultation ${i + 1} : ${msg}`);
    }
  }

  const durationMs = Date.now() - startedAt;

  console.log(
    `[analysis:batch] ✓ Terminé — succès=${successCount} erreurs=${errorCount} durée=${durationMs}ms`
  );

  return {
    totalConsultations: inputs.length,
    successCount,
    errorCount,
    results,
    errors,
    durationMs,
  };
}
