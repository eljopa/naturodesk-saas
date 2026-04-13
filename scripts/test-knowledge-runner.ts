/**
 * Test du pipeline knowledge complet via runKnowledgeAnalysisForConsultation().
 *
 * Usage :
 *   npx ts-node --project tsconfig.scripts.json scripts/test-knowledge-runner.ts <consultationId>
 *
 * Prérequis :
 *   - Consultation existante en base avec des médicaments/compléments/symptômes
 *   - Variables d'environnement DATABASE_URL et DIRECT_URL configurées
 */

import "dotenv/config";
import { runKnowledgeAnalysisForConsultation } from "../lib/knowledge/consultation-runner";

async function main() {
  const consultationId = process.argv[2];

  if (!consultationId) {
    console.error("Usage: npx ts-node ... scripts/test-knowledge-runner.ts <consultationId>");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(`Test Knowledge Runner — consultation=${consultationId}`);
  console.log("=".repeat(60));

  try {
    const summary = await runKnowledgeAnalysisForConsultation(consultationId);

    console.log("\n✓ Pipeline terminé avec succès\n");
    console.log("Résumé :");
    console.log(`  consultationId   : ${summary.consultationId}`);
    console.log(`  analysisRunId    : ${summary.analysisRunId}`);
    console.log(`  termsRecognized  : ${summary.termsRecognized}`);
    console.log(`  termsRejected    : ${summary.termsRejected}`);
    console.log(`  factsFound       : ${summary.factsFound}`);
    console.log(`  findingsCreated  : ${summary.findingsCreated}`);
    console.log(`  findingsSkipped  : ${summary.findingsSkipped}`);
    console.log(`  highestRisk      : ${summary.highestRisk ?? "none"}`);
    console.log(`  durationMs       : ${summary.durationMs}ms`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠ Erreurs partielles (${summary.errors.length}) :`);
      for (const e of summary.errors) {
        console.log(`  [${e.context}] ${e.error}`);
      }
    }
  } catch (err) {
    console.error("\n✗ Échec critique du pipeline :");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
