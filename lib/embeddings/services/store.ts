/**
 * Persistance des embeddings dans pgvector.
 *
 * Prisma ne peut pas mettre à jour une colonne Unsupported("vector(1536)")
 * via l'ORM standard. On utilise $executeRawUnsafe avec un UPDATE paramétré.
 *
 * Format attendu par pgvector : '[0.123,0.456,...]'::vector
 *
 * Le vecteur est construit côté serveur à partir du tableau number[]
 * retourné par l'API OpenAI — aucune entrée utilisateur n'est interpolée
 * directement dans la requête SQL.
 */

import { db } from "@/lib/db";

/**
 * Met à jour le champ embedding d'un KnowledgeChunk.
 *
 * @param chunkId  - UUID du chunk à mettre à jour
 * @param embedding - Vecteur 1536 dimensions retourné par OpenAI
 */
export async function storeEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  // Sérialise en format pgvector : [v1,v2,...,v1536]
  // Utilise toFixed(8) pour limiter la taille de la chaîne
  const vectorStr = `[${embedding.map((v) => v.toFixed(8)).join(",")}]`;

  await db.$executeRawUnsafe(
    `UPDATE knowledge_chunks SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    chunkId
  );
}
