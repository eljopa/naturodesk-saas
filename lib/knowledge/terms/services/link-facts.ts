/**
 * Liaison des KnowledgeFact à leurs KnowledgeTerm.
 *
 * linkFactsToTerms() :
 *   1. Récupère les facts dont subjectTermId OU objectTermId est null
 *   2. Résout subject → KnowledgeTerm (findOrCreateTerm)
 *   3. Résout object  → KnowledgeTerm (findOrCreateTerm)
 *   4. Met à jour le fact avec les deux IDs
 *
 * Idempotence : seuls les facts avec au moins un ID manquant sont traités.
 * Si subject est déjà résolu mais pas object, seul l'objectTermId est mis à jour.
 *
 * Les termes sont créés à la volée si inexistants (via findOrCreateTerm).
 * Cela garantit que le linking fonctionne même si le seed n'a pas été lancé.
 */

import { db } from "@/lib/db";
import { findOrCreateTerm } from "./find-or-create";
import type { TermsBatchError } from "../types";

export interface LinkFactsResult {
  factsLinked: number;
  factsAlreadyLinked: number;
  termsCreatedDuringLink: number;
  errors: TermsBatchError[];
}

/**
 * Met à jour tous les KnowledgeFact dont subjectTermId ou objectTermId est null.
 * Retourne le résumé de l'opération.
 */
export async function linkFactsToTerms(): Promise<LinkFactsResult> {
  // Récupère uniquement les facts avec au moins un ID de terme manquant
  const facts = await db.knowledgeFact.findMany({
    where: {
      OR: [{ subjectTermId: null }, { objectTermId: null }],
    },
    select: {
      id: true,
      subject: true,
      subjectType: true,
      subjectTermId: true,
      object: true,
      objectType: true,
      objectTermId: true,
    },
  });

  if (facts.length === 0) {
    return {
      factsLinked: 0,
      factsAlreadyLinked: 0,
      termsCreatedDuringLink: 0,
      errors: [],
    };
  }

  console.log(`[knowledge:terms] ${facts.length} fact(s) avec terme(s) non liés trouvés`);

  const errors: TermsBatchError[] = [];
  let factsLinked = 0;
  let factsAlreadyLinked = 0;
  let termsCreatedDuringLink = 0;

  for (const fact of facts) {
    try {
      // Résolution du sujet (si manquant)
      let subjectTermId = fact.subjectTermId;
      if (!subjectTermId) {
        const subjectResult = await findOrCreateTerm(fact.subject, fact.subjectType);
        subjectTermId = subjectResult.termId;
        if (subjectResult.created) termsCreatedDuringLink++;
      }

      // Résolution de l'objet (si manquant)
      let objectTermId = fact.objectTermId;
      if (!objectTermId) {
        const objectResult = await findOrCreateTerm(fact.object, fact.objectType);
        objectTermId = objectResult.termId;
        if (objectResult.created) termsCreatedDuringLink++;
      }

      // Mise à jour du fact
      await db.knowledgeFact.update({
        where: { id: fact.id },
        data: { subjectTermId, objectTermId },
      });

      factsLinked++;
      console.log(
        `[knowledge:terms] ✓ Lié : ${fact.subject} ${fact.object} → termIds résolus`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        context: `fact:${fact.id} (${fact.subject} → ${fact.object})`,
        error: message,
      });
      console.error(
        `[knowledge:terms] ✗ Erreur fact ${fact.id}: ${message}`
      );
    }
  }

  // Compte les facts déjà entièrement liés (non traités dans cette exécution)
  const totalFacts = await db.knowledgeFact.count();
  factsAlreadyLinked = totalFacts - (await db.knowledgeFact.count({
    where: {
      OR: [{ subjectTermId: null }, { objectTermId: null }],
    },
  })) - factsLinked;

  return { factsLinked, factsAlreadyLinked, termsCreatedDuringLink, errors };
}
