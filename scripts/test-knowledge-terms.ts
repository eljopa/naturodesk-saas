/**
 * Script de test local — normalisation des termes et linking des faits.
 *
 * Prérequis :
 *   Avoir exécuté les phases précédentes :
 *   npx tsx scripts/test-knowledge-import.ts   (chunks en base)
 *   npx tsx scripts/test-knowledge-facts.ts    (facts en base)
 *
 * Exécution :
 *   npx tsx scripts/test-knowledge-terms.ts
 *
 * Résultats attendus (premier run) :
 *   Termes créés        : 11  (3 drugs + 4 nutrients + 1 supplement + 3 drugs supplémentaires)
 *   Termes existants    : 0
 *   Facts liés          : 9   (les 9 KnowledgeFact créés en Phase 4)
 *   Facts déjà liés     : 0
 *   Erreurs             : 0
 *
 * Second run (idempotence) :
 *   Termes créés        : 0
 *   Facts liés          : 0
 *   Facts déjà liés     : 9
 */

import { importTermsBatch } from "../lib/knowledge/terms/batch";

async function main() {
  console.log("=".repeat(60));
  console.log("NaturoDesk — Test KnowledgeTerm (normalisation + linking)");
  console.log("=".repeat(60));
  console.log();

  const result = await importTermsBatch();

  console.log();
  console.log("=".repeat(60));
  console.log("RÉSULTAT");
  console.log("=".repeat(60));
  console.log(`✓ Termes créés              : ${result.termsCreated}`);
  console.log(`↩ Termes déjà existants     : ${result.termsAlreadyExisted}`);
  console.log(`✓ Facts liés                : ${result.factsLinked}`);
  console.log(`↩ Facts déjà liés           : ${result.factsAlreadyLinked}`);
  console.log(`✗ Erreurs                   : ${result.errors.length}`);
  console.log(`⏱ Durée totale             : ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log("\nDétail erreurs :");
    for (const err of result.errors) {
      console.log(`  - [${err.context}]: ${err.error}`);
    }
    process.exit(1);
  }

  console.log("\n✓ Normalisation et linking terminés.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
