/**
 * scripts/check-bdpm-ingestion.ts
 *
 * Diagnostic rapide de l'état des données BDPM en base.
 *
 * Affiche :
 *   - Comptages par table (DrugProduct, DrugSubstance, DrugAlias, ...)
 *   - Derniers DrugSyncBatch (Pipeline A — ingest direct)
 *   - Derniers BdpmSyncRecord (Pipeline B — webhook n8n + Knowledge)
 *   - Intégration : ConsultationMedicationIntake avec drugProductId/drugSubstanceId
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-bdpm-ingestion.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function statusIcon(status: string): string {
  if (status === "DONE" || status === "completed") return "✓";
  if (status === "RUNNING" || status === "processing") return "⟳";
  if (status === "ERROR" || status === "failed") return "✗";
  return "?";
}

async function main() {
  console.log("\n========================================");
  console.log("  Diagnostic BDPM — NaturoDesk");
  console.log("========================================\n");

  // ── Comptages tables BDPM (Pipeline A — matching) ─────────────────────────
  const [productCount, substanceCount, aliasCount, compositionCount,
         presentationCount, genericGroupCount] = await Promise.all([
    db.drugProduct.count(),
    db.drugSubstance.count(),
    db.drugAlias.count(),
    db.drugProductSubstance.count(),
    db.drugPresentation.count(),
    db.drugGenericGroup.count(),
  ]);

  console.log("── Données BDPM (tables de matching) ──────────────────────");
  console.log(`  DrugProduct           : ${fmt(productCount)}`);
  console.log(`  DrugSubstance         : ${fmt(substanceCount)}`);
  console.log(`  DrugAlias             : ${fmt(aliasCount)}`);
  console.log(`  DrugProductSubstance  : ${fmt(compositionCount)}`);
  console.log(`  DrugPresentation      : ${fmt(presentationCount)}`);
  console.log(`  DrugGenericGroup      : ${fmt(genericGroupCount)}`);

  const matchingReady = productCount > 0 && substanceCount > 0 && aliasCount > 0;
  console.log(`\n  Matching opérationnel : ${matchingReady ? "✓ OUI" : "✗ NON — tables vides"}`);

  // ── DrugSyncBatch (Pipeline A — /api/bdpm/ingest) ─────────────────────────
  const recentBatches = await db.drugSyncBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\n── Pipeline A : DrugSyncBatch (/api/bdpm/ingest) ───────────");
  if (recentBatches.length === 0) {
    console.log("  Aucun batch. Pipeline A jamais exécuté.");
    console.log("  → Pour ingérer : POST /api/bdpm/ingest avec les 4 fichiers BDPM");
    console.log("    ou : npx ts-node ... scripts/seed-bdpm-minimal.ts (jeu de test)");
  } else {
    for (const b of recentBatches) {
      const dur = b.startedAt && b.finishedAt
        ? `${Math.round((b.finishedAt.getTime() - b.startedAt.getTime()) / 1000)}s`
        : "—";
      console.log(
        `  ${statusIcon(b.status)} ${b.batchRef.padEnd(25)} ${b.status.padEnd(10)} ` +
        `produits=${fmt(b.productCount)} substances=${fmt(b.substanceCount)} ` +
        `dur=${dur}`
      );
      if (b.errorMessage) {
        console.log(`    Erreur : ${b.errorMessage.slice(0, 120)}`);
      }
    }
  }

  // ── BdpmSyncRecord (Pipeline B — /api/knowledge/bdpm-ready) ───────────────
  const recentSyncRecords = await db.bdpmSyncRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\n── Pipeline B : BdpmSyncRecord (/api/knowledge/bdpm-ready) ─");
  if (recentSyncRecords.length === 0) {
    console.log("  Aucun enregistrement. Webhook n8n jamais reçu.");
    console.log("  → Ce pipeline remplit les tables Knowledge (KnowledgeDocument, KnowledgeChunk, ...)");
    console.log("    Il nécessite un lot n8n configuré côté Hostinger.");
  } else {
    for (const r of recentSyncRecords) {
      const dur = r.startedAt && r.completedAt
        ? `${Math.round((r.completedAt.getTime() - r.startedAt.getTime()) / 1000)}s`
        : "—";
      console.log(
        `  ${statusIcon(r.status)} ${r.batchId.padEnd(15)} ${r.status.padEnd(12)} ` +
        `files=${r.filesProcessed ?? "—"} docs=${r.documentsCreated ?? "—"} ` +
        `chunks=${r.chunksCreated ?? "—"} dur=${dur}`
      );
      if (r.errorMessage) {
        console.log(`    Erreur : ${r.errorMessage.slice(0, 120)}`);
      }
    }
  }

  // ── KnowledgeDocument / KnowledgeChunk / KnowledgeTerm ────────────────────
  const [docCount, chunkCount, termCount, factCount] = await Promise.all([
    db.knowledgeDocument.count({ where: { sourceType: "BDPM" } }),
    db.knowledgeChunk.count(),
    db.knowledgeTerm.count({ where: { termType: "DRUG" } }),
    db.knowledgeFact.count(),
  ]);

  console.log("\n── Données Knowledge (Pipeline B) ──────────────────────────");
  console.log(`  KnowledgeDocument (BDPM) : ${fmt(docCount)}`);
  console.log(`  KnowledgeChunk           : ${fmt(chunkCount)}`);
  console.log(`  KnowledgeTerm (DRUG)     : ${fmt(termCount)}`);
  console.log(`  KnowledgeFact            : ${fmt(factCount)}`);

  // ── IntégrationConsultation ────────────────────────────────────────────────
  const [intakeTotal, intakeWithProduct, intakeWithSubstance, intakeWithAny] = await Promise.all([
    db.consultationMedicationIntake.count(),
    db.consultationMedicationIntake.count({ where: { drugProductId: { not: null } } }),
    db.consultationMedicationIntake.count({ where: { drugSubstanceId: { not: null } } }),
    db.consultationMedicationIntake.count({
      where: { OR: [{ drugProductId: { not: null } }, { drugSubstanceId: { not: null } }] },
    }),
  ]);

  console.log("\n── Intégration ConsultationMedicationIntake ────────────────");
  console.log(`  Total intakes             : ${fmt(intakeTotal)}`);
  console.log(`  Avec drugProductId        : ${fmt(intakeWithProduct)}`);
  console.log(`  Avec drugSubstanceId      : ${fmt(intakeWithSubstance)}`);
  console.log(`  Avec résolution BDPM      : ${fmt(intakeWithAny)}`);

  const matchRate = intakeTotal > 0
    ? `${Math.round((intakeWithAny / intakeTotal) * 100)}%`
    : "—";
  console.log(`  Taux de matching BDPM     : ${matchRate}`);

  // ── Résumé et recommandations ─────────────────────────────────────────────
  console.log("\n── Résumé ──────────────────────────────────────────────────");
  if (!matchingReady) {
    console.log("  ⚠ DONNÉES INSUFFISANTES — le matching ne peut pas fonctionner.");
    console.log("\n  Recommandation rapide :");
    console.log("  1. Seed de test    : npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/seed-bdpm-minimal.ts");
    console.log("  2. Test matching   : npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/test-drug-matching.ts");
    console.log("\n  Pour la production :");
    console.log("  → Configurer n8n (Hostinger) pour envoyer les fichiers BDPM via POST /api/bdpm/ingest");
    console.log("  → Ou configurer le webhook n8n → POST /api/knowledge/bdpm-ready (Pipeline B)");
  } else {
    console.log("  ✓ Données présentes — le matching devrait fonctionner.");
    console.log(`  → Lancez le test : npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-drug-matching.ts`);
  }

  console.log("\n========================================\n");
}

main()
  .catch((err) => { console.error("Erreur check-bdpm-ingestion :", err); process.exit(1); })
  .finally(() => db.$disconnect());
