/**
 * Service de persistance des KnowledgeDocument.
 *
 * Idempotent : si un document avec le même (drugKey, sourceType, contentHash)
 * existe déjà en base, il n'est pas re-créé.
 * Cela permet de rejouer les imports sans pollution de la base.
 */

import { db } from "@/lib/db";
import type { KnowledgeDocument } from "@prisma/client";
import type { ParsedDocument } from "../types";

export interface CreateDocumentResult {
  document: KnowledgeDocument;
  /** false si le document existait déjà avec le même hash (skip). */
  created: boolean;
}

/**
 * Crée un KnowledgeDocument si la combinaison (drugKey, sourceType, contentHash)
 * est nouvelle. Retourne le document existant sinon.
 */
export async function createDocument(
  parsed: ParsedDocument
): Promise<CreateDocumentResult> {
  const existing = await db.knowledgeDocument.findFirst({
    where: {
      drugKey: parsed.drugKey,
      sourceType: parsed.sourceType,
      contentHash: parsed.contentHash,
    },
  });

  if (existing) {
    return { document: existing, created: false };
  }

  const document = await db.knowledgeDocument.create({
    data: {
      drugKey: parsed.drugKey,
      sourceType: parsed.sourceType,
      docType: parsed.docType,
      title: parsed.title,
      url: parsed.url,
      contentHash: parsed.contentHash,
      fetchedAt: new Date(),
    },
  });

  return { document, created: true };
}
