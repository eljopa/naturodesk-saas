/**
 * scripts/link-substances-to-terms.ts
 *
 * Lie les DrugSubstance aux KnowledgeTerm correspondants.
 * À exécuter après chaque ingestion BDPM si le re-link automatique
 * n'a pas pu tourner (ex : relance manuelle, debug).
 *
 * Ce script est idempotent : relancer n'a aucun effet si déjà lié.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/link-substances-to-terms.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Scripts longue durée → connexion directe (évite les timeouts pgBouncer)
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import { linkSubstanceTerms } from "@/lib/bdpm/link-substance-terms";

async function main() {
  console.log("\n========================================");
  console.log("  Re-link DrugSubstance → KnowledgeTerm");
  console.log("========================================\n");

  const result = await linkSubstanceTerms();

  console.log(`  Liaisons créées   : ${result.linked}`);
  console.log(`  Déjà liées        : ${result.alreadySet}`);
  console.log(`  Durée             : ${result.durationMs}ms`);

  if (result.termsMissing.length > 0) {
    console.warn(`\n  ⚠ Termes manquants en DB (KnowledgeTerm non trouvés) :`);
    for (const key of result.termsMissing) {
      console.warn(`    - ${key}`);
    }
    console.warn(`\n  Ces termes n'existent pas encore en base.`);
    console.warn(`  Vérifier que seed-knowledge-facts-clinical.ts a bien été exécuté.`);
  }

  const total = result.linked + result.alreadySet;
  console.log(`\n  Total couvert     : ${total} substance(s)`);

  if (result.linked === 0 && result.termsMissing.length === 0) {
    console.log(`\n  ✓ Rien à faire — toutes les liaisons sont déjà en place.`);
  } else if (result.linked > 0) {
    console.log(`\n  ✓ ${result.linked} liaison(s) établie(s).`);
  }

  console.log("\n========================================\n");
}

main().catch((err) => {
  console.error("  ✗ Erreur :", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
