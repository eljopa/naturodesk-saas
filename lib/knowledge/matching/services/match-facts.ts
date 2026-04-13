/**
 * Récupération des KnowledgeFact liés aux termes matchés.
 *
 * Un fait est remonté si le terme apparaît en position subject OU object.
 * Cela couvre les deux sens d'une relation :
 *   ex : Metformine DEPLETES Vitamine B12
 *        → remonté si "Metformine" ou "Vitamine B12" est dans les termes matchés
 *
 * Seuls les facts avec subjectTermId ET objectTermId non null sont interrogés
 * (linking Phase 5 obligatoire).
 *
 * Déduplication : si le même fact est déclenché par plusieurs termes,
 * triggeredByTermId conserve le premier termId correspondant.
 */

import { db } from "@/lib/db";
import type { FactMatchResult } from "../types";

/**
 * Retourne tous les KnowledgeFact liés aux termIds fournis.
 * @param termIds IDs des KnowledgeTerm matchés (sans doublons).
 */
export async function matchFactsFromTerms(
  termIds: string[]
): Promise<FactMatchResult[]> {
  if (termIds.length === 0) return [];

  const facts = await db.knowledgeFact.findMany({
    where: {
      AND: [
        { subjectTermId: { not: null } },
        { objectTermId: { not: null } },
        {
          OR: [
            { subjectTermId: { in: termIds } },
            { objectTermId: { in: termIds } },
          ],
        },
      ],
    },
    select: {
      id: true,
      factType: true,
      subject: true,
      subjectType: true,
      predicate: true,
      object: true,
      objectType: true,
      qualifier: true,
      confidence: true,
      extractionMethod: true,
      chunkId: true,
      subjectTermId: true,
      objectTermId: true,
    },
    orderBy: { confidence: "desc" },
  });

  const seen = new Set<string>();
  const results: FactMatchResult[] = [];

  for (const fact of facts) {
    if (seen.has(fact.id)) continue;
    seen.add(fact.id);

    // Détermine quel termId a déclenché ce fait
    const triggeredByTermId =
      termIds.find((id) => id === fact.subjectTermId) ??
      termIds.find((id) => id === fact.objectTermId) ??
      termIds[0]!;

    results.push({
      factId: fact.id,
      factType: fact.factType,
      subject: fact.subject,
      subjectType: fact.subjectType,
      predicate: fact.predicate,
      object: fact.object,
      objectType: fact.objectType,
      qualifier: fact.qualifier,
      confidence: fact.confidence,
      extractionMethod: fact.extractionMethod,
      chunkId: fact.chunkId,
      triggeredByTermId,
    });
  }

  console.log(`[matching] ${results.length} fact(s) retrouvé(s) pour ${termIds.length} terme(s)`);
  return results;
}
