/**
 * Batch de normalisation et liaison des termes.
 *
 * importTermsBatch() :
 *   1. Seed — crée les termes initiaux connus (SEED_TERMS)
 *   2. Link — relie les KnowledgeFact existants à leurs termes
 *
 * Ordre obligatoire : seed d'abord, link ensuite.
 * Cela garantit que les termes existent avant le linking,
 * même si findOrCreateTerm() dans linkFactsToTerms() les crée à la volée.
 *
 * Idempotent : relancer ne crée pas de doublons.
 */

import { db } from "@/lib/db";
import { buildNormalizedKey } from "./utils/normalize";
import { SEED_TERMS } from "./utils/aliases";
import { linkFactsToTerms } from "./services/link-facts";
import type { TermsBatchResult, TermsBatchError } from "./types";

/**
 * Lance le pipeline complet : seed des termes + linking des faits.
 * Retourne un résumé consolidé.
 */
export async function importTermsBatch(): Promise<TermsBatchResult> {
  const startedAt = Date.now();
  const errors: TermsBatchError[] = [];
  let termsCreated = 0;
  let termsAlreadyExisted = 0;

  // ---------------------------------------------------------------------------
  // Étape 1 — Seed des termes initiaux
  // ---------------------------------------------------------------------------

  console.log(`[knowledge:terms] ▶ Seed de ${SEED_TERMS.length} termes initiaux`);

  for (const seedTerm of SEED_TERMS) {
    const normalizedKey = buildNormalizedKey(seedTerm.canonicalName);

    try {
      const existing = await db.knowledgeTerm.findUnique({ where: { normalizedKey } });

      if (existing) {
        termsAlreadyExisted++;
        continue;
      }

      await db.knowledgeTerm.create({
        data: {
          termType: seedTerm.termType,
          canonicalName: seedTerm.canonicalName,
          normalizedKey,
          aliases: seedTerm.aliases,
          drugKey: seedTerm.drugKey ?? null,
        },
      });

      termsCreated++;
      console.log(`[knowledge:terms] ✓ Terme créé : ${seedTerm.canonicalName} [${seedTerm.termType}]`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ context: `seed:${seedTerm.canonicalName}`, error: message });
      console.error(`[knowledge:terms] ✗ Seed échoué pour ${seedTerm.canonicalName}: ${message}`);
    }
  }

  console.log(
    `[knowledge:terms] Seed terminé — créés=${termsCreated} existants=${termsAlreadyExisted}`
  );

  // ---------------------------------------------------------------------------
  // Étape 2 — Linking des KnowledgeFact
  // ---------------------------------------------------------------------------

  console.log("[knowledge:terms] ▶ Linking des KnowledgeFact existants");

  const linkResult = await linkFactsToTerms();

  // Consolide les termes créés pendant le linking dans le total
  termsCreated += linkResult.termsCreatedDuringLink;
  errors.push(...linkResult.errors);

  const durationMs = Date.now() - startedAt;

  console.log(
    `[knowledge:terms] ✓ Terminé — termes créés=${termsCreated} existants=${termsAlreadyExisted} ` +
    `facts liés=${linkResult.factsLinked} déjà liés=${linkResult.factsAlreadyLinked} ` +
    `erreurs=${errors.length} durée=${durationMs}ms`
  );

  return {
    termsCreated,
    termsAlreadyExisted,
    factsLinked: linkResult.factsLinked,
    factsAlreadyLinked: linkResult.factsAlreadyLinked,
    errors,
    durationMs,
  };
}
