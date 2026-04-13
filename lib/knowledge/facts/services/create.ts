/**
 * Persistance idempotente des KnowledgeFact.
 *
 * Idempotence : avant de créer un fait, on vérifie qu'un fait identique
 * (même chunkId + predicate + object) n'existe pas déjà en base.
 *
 * Clé d'idempotence retenue : (chunkId, predicate, object)
 * - chunkId     → lie le fait à sa source documentaire précise
 * - predicate   → la relation sémantique
 * - object      → l'entité cible (comparaison insensible à la casse)
 *
 * subjectTermId et objectTermId sont null pour l'instant —
 * ils seront résolus en Phase 5 (KnowledgeTerm normalization).
 */

import { db } from "@/lib/db";
import type { KnowledgeFact } from "@prisma/client";
import type { ExtractedFactInput } from "../types";

export interface CreateFactResult {
  fact: KnowledgeFact;
  /** false si le fait existait déjà (idempotence). */
  created: boolean;
}

/**
 * Crée un KnowledgeFact si la combinaison (chunkId, predicate, object) est nouvelle.
 * Retourne le fait existant sinon.
 */
export async function createKnowledgeFact(
  input: ExtractedFactInput
): Promise<CreateFactResult> {
  // Vérification idempotence — comparaison insensible à la casse sur l'objet
  const existing = await db.knowledgeFact.findFirst({
    where: {
      chunkId: input.chunkId,
      predicate: input.predicate,
      object: { equals: input.object, mode: "insensitive" },
    },
  });

  if (existing) {
    return { fact: existing, created: false };
  }

  const fact = await db.knowledgeFact.create({
    data: {
      chunkId: input.chunkId,
      documentId: input.documentId,
      factType: input.factType,
      subject: input.subject,
      subjectType: input.subjectType,
      predicate: input.predicate,
      object: input.object,
      objectType: input.objectType,
      qualifier: input.qualifier ?? null,
      confidence: input.confidence,
      extractionMethod: "DETERMINISTIC",
      rawExcerpt: input.rawExcerpt,
      subjectTermId: null,
      objectTermId: null,
    },
  });

  return { fact, created: true };
}
