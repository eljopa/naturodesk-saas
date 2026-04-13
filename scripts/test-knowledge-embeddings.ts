/**
 * Script de test local — vectorisation des chunks knowledge.
 *
 * Prérequis :
 *   1. Avoir lancé le script d'import mock (chunks en base sans embedding)
 *      npx tsx scripts/test-knowledge-import.ts
 *
 *   2. Avoir OPENAI_API_KEY configuré dans .env
 *
 * Exécution :
 *   npx tsx scripts/test-knowledge-embeddings.ts
 *
 * Résultat attendu (premier run) :
 *   - ~18 chunks trouvés (3 docs × ~6 sections)
 *   - ~13-14 indexables (kinds : side_effect, interaction, contraindication, warning, indication, mechanism)
 *   - ~4-5 ignorés (kinds : composition, dosage, formulation, general)
 *   - 0 erreurs si OPENAI_API_KEY valide
 *
 * Résultat attendu (deuxième run) :
 *   - 0 chunks en attente → idempotence vérifiée
 */

import { embedPendingChunks } from "../lib/embeddings/batch";

async function main() {
  console.log("=".repeat(60));
  console.log("NaturoDesk — Test Embeddings Knowledge Base");
  console.log("=".repeat(60));
  console.log();

  const result = await embedPendingChunks({
    batchSize: 20,
    limit: 200,
  });

  console.log();
  console.log("=".repeat(60));
  console.log("RÉSULTAT");
  console.log("=".repeat(60));
  console.log(`Candidats trouvés (sans embedding) : ${result.totalCandidates}`);
  console.log(`✓ Vectorisés                        : ${result.embedded}`);
  console.log(`↩ Ignorés (kind non indexable)      : ${result.skipped}`);
  console.log(`✗ Erreurs                           : ${result.errors.length}`);
  console.log(`⏱ Durée totale                     : ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log("\nDétail erreurs :");
    for (const err of result.errors) {
      console.log(`  - [${err.kind}] ${err.drugKey} / ${err.chunkId}: ${err.error}`);
    }
    process.exit(1);
  }

  if (result.totalCandidates === 0) {
    console.log("\n↩ Aucun chunk à vectoriser (idempotence : déjà traité).");
  } else {
    console.log("\n✓ Embeddings générés avec succès.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
