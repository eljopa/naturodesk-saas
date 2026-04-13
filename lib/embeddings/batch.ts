/**
 * Batch d'embedding des KnowledgeChunk.
 *
 * Séquence :
 *   1. Récupérer les chunks sans embedding (SQL)
 *   2. Séparer indexables / ignorés
 *   3. Construire les textes d'embedding
 *   4. Envoyer en sous-batches à OpenAI (N textes par appel)
 *   5. Stocker chaque vecteur en base (pgvector)
 *   6. Retourner le résumé
 *
 * Idempotent : ne re-vectorise jamais un chunk qui a déjà un embedding.
 * Robuste : une erreur sur un sous-batch n'arrête pas les autres.
 */

import { getChunksNeedingEmbeddings } from "./services/candidates";
import { isChunkIndexable, buildEmbeddingText } from "./services/text-builder";
import { generateEmbeddingBatch } from "./services/generate";
import { storeEmbedding } from "./services/store";
import type { EmbeddingBatchResult, EmbeddingError, EmbeddingCandidate } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface EmbedPendingOptions {
  /**
   * Nombre de chunks envoyés par appel OpenAI.
   * Trop élevé → risque de timeout / rate limit.
   * Trop bas → trop d'appels réseau.
   * Défaut : 20 (bon compromis pour text-embedding-3-small).
   */
  batchSize?: number;
  /**
   * Nombre maximum de chunks récupérés en base pour cette exécution.
   * Permet de limiter le coût OpenAI par run.
   * Défaut : 200 (couvre un lot BDPM de ~30 médicaments × ~6 sections).
   */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Orchestrateur principal
// ---------------------------------------------------------------------------

/**
 * Vectorise tous les chunks indexables qui n'ont pas encore d'embedding.
 * Retourne un résumé complet de l'opération.
 */
export async function embedPendingChunks(
  opts: EmbedPendingOptions = {}
): Promise<EmbeddingBatchResult> {
  const batchSize = opts.batchSize ?? 20;
  const limit = opts.limit ?? 200;
  const startedAt = Date.now();

  // Étape 1 — Candidats sans embedding
  const allCandidates = await getChunksNeedingEmbeddings(limit);

  if (allCandidates.length === 0) {
    console.log("[knowledge:embeddings] Aucun chunk en attente d'embedding.");
    return {
      totalCandidates: 0,
      embedded: 0,
      skipped: 0,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  }

  console.log(
    `[knowledge:embeddings] ${allCandidates.length} chunks sans embedding trouvés`
  );

  // Étape 2 — Filtrage
  const indexable: EmbeddingCandidate[] = [];
  let skipped = 0;

  for (const candidate of allCandidates) {
    if (isChunkIndexable(candidate)) {
      indexable.push(candidate);
    } else {
      skipped++;
    }
  }

  console.log(
    `[knowledge:embeddings] ${indexable.length} indexables, ${skipped} ignorés (kind non indexable)`
  );

  if (indexable.length === 0) {
    return {
      totalCandidates: allCandidates.length,
      embedded: 0,
      skipped,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  }

  // Étape 3 — Traitement par sous-batches
  const errors: EmbeddingError[] = [];
  let embedded = 0;

  for (let i = 0; i < indexable.length; i += batchSize) {
    const subBatch = indexable.slice(i, i + batchSize);
    const batchLabel = `[${i + 1}-${Math.min(i + batchSize, indexable.length)}/${indexable.length}]`;

    console.log(`[knowledge:embeddings] Sous-batch ${batchLabel} — génération...`);

    // Étape 3a — Construction des textes
    const texts = subBatch.map(buildEmbeddingText);

    // Étape 3b — Appel OpenAI batch
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddingBatch(texts);
    } catch (err) {
      // Échec du batch entier → tous les chunks de ce sous-batch sont en erreur
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[knowledge:embeddings] ✗ Sous-batch ${batchLabel} — erreur API: ${message}`
      );
      for (const candidate of subBatch) {
        errors.push({
          chunkId: candidate.id,
          drugKey: candidate.drugKey,
          kind: candidate.kind,
          error: `OpenAI batch error: ${message}`,
        });
      }
      continue;
    }

    // Étape 3c — Stockage chunk par chunk
    for (let j = 0; j < subBatch.length; j++) {
      const candidate = subBatch[j]!;
      const embedding = embeddings[j];

      if (!embedding || embedding.length === 0) {
        errors.push({
          chunkId: candidate.id,
          drugKey: candidate.drugKey,
          kind: candidate.kind,
          error: "Embedding vide retourné par l'API",
        });
        continue;
      }

      try {
        await storeEmbedding(candidate.id, embedding);
        embedded++;
      } catch (storeErr) {
        const message = storeErr instanceof Error ? storeErr.message : String(storeErr);
        errors.push({
          chunkId: candidate.id,
          drugKey: candidate.drugKey,
          kind: candidate.kind,
          error: `Store error: ${message}`,
        });
      }
    }

    console.log(
      `[knowledge:embeddings] ✓ Sous-batch ${batchLabel} — ${subBatch.length - errors.filter(e => subBatch.some(c => c.id === e.chunkId)).length} ok`
    );
  }

  const durationMs = Date.now() - startedAt;

  console.log(
    `[knowledge:embeddings] ✓ Terminé — embedded=${embedded} skipped=${skipped} erreurs=${errors.length} durée=${durationMs}ms`
  );

  return {
    totalCandidates: allCandidates.length,
    embedded,
    skipped,
    errors,
    durationMs,
  };
}
