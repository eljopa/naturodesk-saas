/**
 * Batch d'extraction déterministe des KnowledgeFact.
 *
 * Séquence pour chaque chunk éligible :
 *   1. isChunkFactExtractable()  → filtre les kinds sans extracteur
 *   2. extractFactsFromChunk()   → retourne 0..N ExtractedFactInput
 *   3. createKnowledgeFact()     → persist idempotent par fact
 *
 * Idempotent : relancer le batch ne crée pas de doublons.
 * Robuste : une erreur sur un chunk n'arrête pas les suivants.
 */

import { getChunksEligibleForFactExtraction } from "./services/candidates";
import { isChunkFactExtractable, extractFactsFromChunk } from "./services/extract";
import { createKnowledgeFact } from "./services/create";
import type { FactExtractionBatchResult, FactExtractionError } from "./types";

interface ExtractFactsOptions {
  /** Nombre maximum de chunks à traiter. Défaut : 500. */
  limit?: number;
}

/**
 * Extrait et persiste les KnowledgeFact depuis tous les chunks éligibles.
 * Retourne un résumé complet de l'opération.
 */
export async function extractFactsBatch(
  opts: ExtractFactsOptions = {}
): Promise<FactExtractionBatchResult> {
  const limit = opts.limit ?? 500;
  const startedAt = Date.now();

  // Étape 1 — Récupérer les chunks éligibles
  const candidates = await getChunksEligibleForFactExtraction(limit);

  if (candidates.length === 0) {
    console.log("[knowledge:facts] Aucun chunk éligible trouvé.");
    return {
      totalCandidates: 0,
      chunksProcessed: 0,
      chunksSkipped: 0,
      factsCreated: 0,
      factsSkipped: 0,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  }

  console.log(
    `[knowledge:facts] ${candidates.length} chunks éligibles trouvés (kinds: side_effect, interaction, contraindication, warning)`
  );

  const errors: FactExtractionError[] = [];
  let chunksProcessed = 0;
  let chunksSkipped = 0;
  let factsCreated = 0;
  let factsSkipped = 0;

  // Étape 2 — Traitement chunk par chunk
  for (const candidate of candidates) {
    // Filtre : extracteur disponible pour ce kind ?
    if (!isChunkFactExtractable(candidate.kind)) {
      chunksSkipped++;
      continue;
    }

    chunksProcessed++;

    try {
      // Étape 3 — Extraction déterministe
      const extracted = extractFactsFromChunk(candidate);

      if (extracted.length === 0) {
        console.log(
          `[knowledge:facts] ↩ ${candidate.drugKey}/${candidate.kind} — aucun fait extractible (metaJson insuffisant)`
        );
        continue;
      }

      console.log(
        `[knowledge:facts] ▶ ${candidate.drugKey}/${candidate.kind} — ${extracted.length} fait(s) détecté(s)`
      );

      // Étape 4 — Persistance idempotente
      for (const factInput of extracted) {
        try {
          const { created, fact } = await createKnowledgeFact(factInput);
          if (created) {
            factsCreated++;
            console.log(
              `[knowledge:facts] ✓ ${fact.subject} ${fact.predicate} ${fact.object} [${fact.objectType}]`
            );
          } else {
            factsSkipped++;
            console.log(
              `[knowledge:facts] ↩ Déjà existant : ${factInput.subject} ${factInput.predicate} ${factInput.object}`
            );
          }
        } catch (factError) {
          const message =
            factError instanceof Error ? factError.message : String(factError);
          errors.push({
            chunkId: candidate.id,
            drugKey: candidate.drugKey,
            kind: candidate.kind,
            error: `createKnowledgeFact: ${message}`,
          });
        }
      }
    } catch (chunkError) {
      const message =
        chunkError instanceof Error ? chunkError.message : String(chunkError);
      console.error(
        `[knowledge:facts] ✗ ${candidate.drugKey}/${candidate.kind} — erreur: ${message}`
      );
      errors.push({
        chunkId: candidate.id,
        drugKey: candidate.drugKey,
        kind: candidate.kind,
        error: message,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[knowledge:facts] ✓ Terminé — processés=${chunksProcessed} ignorés=${chunksSkipped} créés=${factsCreated} doublons=${factsSkipped} erreurs=${errors.length} durée=${durationMs}ms`
  );

  return {
    totalCandidates: candidates.length,
    chunksProcessed,
    chunksSkipped,
    factsCreated,
    factsSkipped,
    errors,
    durationMs,
  };
}
