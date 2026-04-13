/**
 * Script de test local — extraction déterministe des KnowledgeFact.
 *
 * Prérequis :
 *   Avoir exécuté l'import mock (chunks en base) :
 *   npx tsx scripts/test-knowledge-import.ts
 *
 * Exécution :
 *   npx tsx scripts/test-knowledge-facts.ts
 *
 * Facts attendus (premier run, dataset mock) :
 *   ✓ Metformine  DEPLETES       Vitamine B12  [NUTRIENT]
 *   ✓ Oméprazole  DEPLETES       Magnésium     [NUTRIENT]
 *   ✓ Oméprazole  DEPLETES       Vitamine B12  [NUTRIENT]
 *   ✓ Lévothyroxine INTERACTS_WITH Calcium     [NUTRIENT]
 *   ✓ Lévothyroxine INTERACTS_WITH Fer         [NUTRIENT]
 *   ✓ Lévothyroxine INTERACTS_WITH IPP         [DRUG]
 *   ✓ Lévothyroxine INTERACTS_WITH Soja        [SUPPLEMENT]
 *   ✓ Lévothyroxine INTERACTS_WITH Cholestyramine [DRUG]
 *   ✓ Lévothyroxine INTERACTS_WITH Rifampicine [DRUG]
 *
 * Deuxième run : tous les facts → "déjà existants" (idempotence).
 */

import { extractFactsBatch } from "../lib/knowledge/facts/batch";

async function main() {
  console.log("=".repeat(60));
  console.log("NaturoDesk — Test Extraction KnowledgeFact (déterministe)");
  console.log("=".repeat(60));
  console.log();

  const result = await extractFactsBatch({ limit: 500 });

  console.log();
  console.log("=".repeat(60));
  console.log("RÉSULTAT");
  console.log("=".repeat(60));
  console.log(`Chunks éligibles trouvés    : ${result.totalCandidates}`);
  console.log(`Chunks analysés             : ${result.chunksProcessed}`);
  console.log(`Chunks ignorés (sans impl.) : ${result.chunksSkipped}`);
  console.log(`✓ Facts créés               : ${result.factsCreated}`);
  console.log(`↩ Doublons évités           : ${result.factsSkipped}`);
  console.log(`✗ Erreurs                   : ${result.errors.length}`);
  console.log(`⏱ Durée totale             : ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log("\nDétail erreurs :");
    for (const err of result.errors) {
      console.log(`  - [${err.kind}] ${err.drugKey} / ${err.chunkId}: ${err.error}`);
    }
    process.exit(1);
  }

  if (result.factsCreated === 0 && result.factsSkipped === 0) {
    console.log("\n⚠ Aucun fait extrait — vérifier que le mock est importé.");
  } else if (result.factsCreated === 0) {
    console.log("\n↩ Aucun nouveau fait (tous déjà existants — idempotence OK).");
  } else {
    console.log("\n✓ Extraction terminée avec succès.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
