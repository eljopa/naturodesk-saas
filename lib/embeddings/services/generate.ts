/**
 * Génération des embeddings via OpenAI.
 *
 * Wraps les fonctions existantes de lib/knowledge/embed.ts.
 * Pas de duplication — la logique OpenAI reste dans embed.ts.
 *
 * generateEmbedding()    → 1 texte → 1 vecteur (usage individuel ou fallback)
 * generateEmbeddingBatch() → N textes → N vecteurs (usage batch normal)
 *
 * Serveur uniquement — OPENAI_API_KEY jamais exposé côté client.
 */

import { embedText, embedBatch } from "@/lib/knowledge/embed";

/**
 * Génère l'embedding d'un texte unique.
 * Retourne un vecteur de 1536 dimensions (text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return embedText(text);
}

/**
 * Génère les embeddings d'un lot de textes en un seul appel OpenAI.
 * Les résultats sont retournés dans le même ordre que les textes en entrée.
 *
 * @param texts - Textes à vectoriser (max ~100 recommandé par appel)
 */
export async function generateEmbeddingBatch(
  texts: string[]
): Promise<number[][]> {
  return embedBatch(texts);
}
