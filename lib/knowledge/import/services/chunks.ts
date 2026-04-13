/**
 * Service de persistance des KnowledgeChunk.
 *
 * Utilise createMany pour insérer tous les chunks d'un document en une seule requête.
 * Le metaJson est propagé tel quel depuis ParsedChunk.
 *
 * Note : l'embedding (vector) n'est pas géré ici — c'est la Phase 3 (embeddings).
 * Les chunks sont insérés sans embedding, qui sera ajouté séparément.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ParsedChunk } from "../types";

/**
 * Insère tous les chunks d'un document en base.
 * Retourne le nombre de chunks créés.
 */
export async function createChunks(
  documentId: string,
  chunks: ParsedChunk[]
): Promise<number> {
  if (chunks.length === 0) return 0;

  const data: Prisma.KnowledgeChunkCreateManyInput[] = chunks.map((chunk) => ({
    documentId,
    kind: chunk.kind,
    label: chunk.label,
    excerpt: chunk.excerpt,
    sectionPath: chunk.sectionPath,
    metaJson: (chunk.metaJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
  }));

  const result = await db.knowledgeChunk.createMany({ data });
  return result.count;
}
