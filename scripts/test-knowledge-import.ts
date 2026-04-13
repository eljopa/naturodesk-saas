/**
 * Script de test local — import mock knowledge base.
 *
 * Exécute l'import des 3 documents mock dans la base de données.
 * À lancer depuis la racine du projet :
 *
 *   npx ts-node --project tsconfig.json -e "require('./scripts/test-knowledge-import.ts')"
 *
 * Ou avec tsx (plus rapide) :
 *
 *   npx tsx scripts/test-knowledge-import.ts
 *
 * Prérequis :
 * - .env configuré avec DATABASE_URL
 * - base de données accessible
 * - prisma generate déjà exécuté
 */

import { importMockKnowledgeBatch } from "../lib/knowledge/import/batch";

async function main() {
  console.log("=".repeat(60));
  console.log("NaturoDesk — Test import Knowledge Base (mock)");
  console.log("=".repeat(60));

  const result = await importMockKnowledgeBatch();

  console.log("\n" + "=".repeat(60));
  console.log("RÉSULTAT");
  console.log("=".repeat(60));
  console.log(`Total documents traités : ${result.total}`);
  console.log(`✓ Importés              : ${result.imported}`);
  console.log(`↩ Skippés (existants)   : ${result.skipped}`);
  console.log(`✗ Erreurs               : ${result.errors.length}`);
  console.log(`⏱ Durée totale         : ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log("\nDétail erreurs :");
    for (const err of result.errors) {
      console.log(`  - ${err.drugKey} [${err.stage}]: ${err.error}`);
    }
    process.exit(1);
  }

  console.log("\n✓ Import terminé avec succès.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
