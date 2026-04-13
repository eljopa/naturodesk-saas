/**
 * Batch de matching pour plusieurs consultations.
 *
 * runMatchingBatch() :
 *   Lance runSecureMatching() séquentiellement sur chaque input.
 *   Isole les erreurs par consultation sans arrêter le batch.
 *   Retourne un résumé consolidé.
 *
 * Usage principal : tests automatisés multi-cas.
 */

import { runSecureMatching } from "./services/run-matching";
import type { ConsultationMatchInput, MatchingBatchResult, MatchingError } from "./types";

/**
 * Lance le matching sur plusieurs consultations en séquence.
 * @param inputs Liste des consultations à matcher.
 */
export async function runMatchingBatch(
  inputs: ConsultationMatchInput[]
): Promise<MatchingBatchResult> {
  const startedAt = Date.now();
  const errors: MatchingError[] = [];
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`[matching:batch] ▶ ${inputs.length} consultation(s) à traiter`);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]!;
    const label = [
      ...(input.drugs ?? []),
      ...(input.supplements ?? []),
      ...(input.nutrients ?? []),
      ...(input.symptoms ?? []),
    ].join(", ");

    console.log(`[matching:batch] [${i + 1}/${inputs.length}] "${label}"`);

    try {
      const result = await runSecureMatching(input);
      results.push(result);
      successCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `consultation[${i}]: ${label}`, error: msg });
      errorCount++;
      console.error(`[matching:batch] ✗ Erreur consultation ${i + 1} : ${msg}`);
    }
  }

  const durationMs = Date.now() - startedAt;

  console.log(
    `[matching:batch] ✓ Terminé — succès=${successCount} erreurs=${errorCount} durée=${durationMs}ms`
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
