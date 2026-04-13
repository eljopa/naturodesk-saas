/**
 * Récupération des KnowledgeChunk pertinents.
 *
 * Ordre strict :
 *   1. fact_relation — chunks directement liés aux KnowledgeFact trouvés
 *   2. semantic      — similarité vectorielle (seulement si includeSemanticComplement=true)
 *                      Seuil strict : score cosinus ≥ SEMANTIC_THRESHOLD (0.72)
 *                      Si doute ou pas de clé OpenAI : ignoré sans erreur
 *
 * Déduplication par chunkId : un chunk ne remonte jamais en double.
 * Un chunk déjà trouvé via fact_relation n'est pas re-listé en semantic.
 */

import { db } from "@/lib/db";
import type { ChunkMatchResult } from "../types";

/** Seuil minimal de similarité cosinus pour le matching sémantique. */
const SEMANTIC_THRESHOLD = 0.72;

/** Nombre maximal de résultats sémantiques par terme. */
const SEMANTIC_LIMIT_PER_TERM = 3;

export interface MatchChunksOptions {
  /** Activer la couche sémantique en complément. */
  semanticComplement: boolean;
  /** Noms canoniques des termes matchés (pour les requêtes sémantiques). */
  matchedTermNames: string[];
}

/**
 * Retourne les chunks liés aux facts puis (optionnellement) par similarité vectorielle.
 * @param factChunkIds IDs de chunks extraits des KnowledgeFact trouvés (déjà dédupliqués).
 * @param opts Options pour la couche sémantique.
 */
export async function matchChunksFromTerms(
  factChunkIds: string[],
  opts: MatchChunksOptions
): Promise<{ chunks: ChunkMatchResult[]; semanticActuallyUsed: boolean }> {
  const results: ChunkMatchResult[] = [];
  const seenChunkIds = new Set<string>();

  // --- Étape 1 : fact_relation ---
  if (factChunkIds.length > 0) {
    const chunks = await db.knowledgeChunk.findMany({
      where: { id: { in: factChunkIds } },
      select: {
        id: true,
        documentId: true,
        kind: true,
        label: true,
        excerpt: true,
        document: {
          select: { drugKey: true },
        },
      },
    });

    for (const chunk of chunks) {
      seenChunkIds.add(chunk.id);
      results.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        drugKey: chunk.document.drugKey,
        kind: chunk.kind,
        label: chunk.label,
        excerpt: chunk.excerpt,
        matchSource: "fact_relation",
      });
    }

    console.log(`[matching] ${chunks.length} chunk(s) via fact_relation`);
  }

  // --- Étape 2 : semantic complement ---
  let semanticActuallyUsed = false;

  if (opts.semanticComplement && opts.matchedTermNames.length > 0) {
    if (!process.env.OPENAI_API_KEY) {
      console.log("[matching] semantic ignoré — OPENAI_API_KEY absent");
    } else {
      try {
        const { semanticSearchMulti } = await import("@/lib/knowledge/search");
        const semanticResults = await semanticSearchMulti(
          opts.matchedTermNames,
          SEMANTIC_LIMIT_PER_TERM,
          SEMANTIC_THRESHOLD
        );

        let semanticAdded = 0;
        for (const r of semanticResults) {
          if (seenChunkIds.has(r.chunkId)) continue;
          seenChunkIds.add(r.chunkId);
          results.push({
            chunkId: r.chunkId,
            documentId: r.documentId,
            drugKey: r.drugKey,
            kind: r.kind,
            label: r.label,
            excerpt: r.excerpt,
            matchSource: "semantic",
            score: r.score,
          });
          semanticAdded++;
        }

        semanticActuallyUsed = semanticAdded > 0;
        console.log(
          `[matching] ${semanticAdded} chunk(s) ajouté(s) via semantic (seuil=${SEMANTIC_THRESHOLD})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[matching] semantic échoué (ignoré) : ${msg}`);
      }
    }
  }

  return { chunks: results, semanticActuallyUsed };
}
