/**
 * scripts/ingest-bdpm-storage.ts
 *
 * Déclenche l'ingestion BDPM depuis Supabase Storage sans passer par HTTP/n8n.
 * Simule exactement ce que fait le webhook /api/bdpm/webhook en production.
 *
 * Pipeline exécuté :
 *   1. Lit manifest.json depuis le bucket Supabase
 *   2. Pipeline A — DrugProduct, DrugSubstance, DrugAlias (ingest.ts)
 *   3. Pipeline B — KnowledgeDocument, KnowledgeChunk, embeddings (ingestion.ts)
 *
 * Prérequis :
 *   .env.local doit contenir :
 *     DATABASE_URL / DIRECT_URL
 *     SUPABASE_URL
 *     SUPABASE_SERVICE_ROLE_KEY
 *     OPENAI_API_KEY  (pour les embeddings Pipeline B)
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/ingest-bdpm-storage.ts [batchId] [bucket]
 *
 *   Exemples :
 *     scripts/ingest-bdpm-storage.ts 2026-04
 *     scripts/ingest-bdpm-storage.ts 2026-04 bdpm-raw
 *
 * Défauts :
 *   batchId : mois courant (YYYY-MM)
 *   bucket  : "bdpm-raw"
 *
 * Durée estimée : 5-15 minutes (téléchargement Storage + upserts DB + embeddings)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Scripts longue durée → connexion directe (évite les timeouts pgBouncer)
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import { PrismaClient } from "@prisma/client";
import { runBdpmFromStorage } from "@/lib/bdpm/webhook-runner";
import type { RunnerResult } from "@/lib/bdpm/webhook-runner";

const db = new PrismaClient();

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

async function main() {
  const batchId = process.argv[2] ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  const bucket  = process.argv[3] ?? "bdpm-raw";
  // storagePath = préfixe racine du lot dans le bucket (ex: "2026-04")
  const storagePath = batchId;

  console.log("\n========================================");
  console.log("  Ingestion BDPM depuis Supabase Storage");
  console.log("========================================");
  console.log(`\n  batchId      : ${batchId}`);
  console.log(`  bucket       : ${bucket}`);
  console.log(`  storagePath  : ${storagePath}`);
  console.log(`  manifest     : ${storagePath}/manifest.json`);
  console.log("");

  // ── Créer/récupérer BdpmSyncRecord pour Pipeline B ─────────────────────────
  const syncRecord = await db.bdpmSyncRecord.upsert({
    where: { source_batchId: { source: "BDPM", batchId } },
    create: {
      source:        "BDPM",
      batchId,
      storageBucket: bucket,
      storagePath,
      status:        "processing",
      startedAt:     new Date(),
    },
    update: {
      status:       "processing",
      startedAt:    new Date(),
      completedAt:  null,
      errorMessage: null,
    },
  });

  console.log(`  BdpmSyncRecord créé : ${syncRecord.id}`);
  console.log("\n  Démarrage du pipeline…\n");

  const start = Date.now();

  let result: RunnerResult;
  try {
    result = await runBdpmFromStorage(batchId, bucket, storagePath, syncRecord.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ Erreur fatale : ${msg}`);
    await db.bdpmSyncRecord
      .update({
        where: { id: syncRecord.id },
        data:  { status: "failed", completedAt: new Date(), errorMessage: msg.slice(0, 500) },
      })
      .catch(() => {});
    process.exit(1);
  }

  const totalSec = Math.round((Date.now() - start) / 1000);

  // ── Résultat Pipeline A ────────────────────────────────────────────────────
  console.log("\n========================================");
  console.log("  Résultat Pipeline A (drug_* tables)");
  console.log("========================================\n");

  if (result.pipelineA.ok) {
    const d = result.pipelineA.details;
    console.log(`  ✓ Statut       : OK`);
    console.log(`  Batch ref      : ${result.pipelineA.batchRef}`);
    if (d) {
      console.log(`  Produits créés : ${fmt(d.productsCreated)}`);
      console.log(`  Produits màj   : ${fmt(d.productsUpdated)}`);
      console.log(`  Substances     : ${fmt(d.substancesUpserted)}`);
      console.log(`  Alias          : ${fmt(d.aliasesCreated)}`);
      console.log(`  Durée          : ${d.durationMs}ms`);
    }
  } else {
    console.log(`  ✗ Statut       : ERREUR`);
    console.log(`  Erreur         : ${result.pipelineA.error}`);
  }

  // ── Résultat Pipeline B ────────────────────────────────────────────────────
  console.log("\n========================================");
  console.log("  Résultat Pipeline B (knowledge_* tables)");
  console.log("========================================\n");

  if (result.pipelineB.ok) {
    console.log(`  ✓ Statut         : OK${result.pipelineB.error ? " (embeddings partiels)" : ""}`);
    console.log(`  Fichiers traités : ${fmt(result.pipelineB.filesProcessed)}`);
    console.log(`  Documents créés  : ${fmt(result.pipelineB.docsCreated)}`);
    console.log(`  Chunks créés     : ${fmt(result.pipelineB.chunksCreated)}`);
    console.log(`  Facts créés      : ${fmt(result.pipelineB.factsCreated)}`);
    if (result.pipelineB.error) {
      console.log(`  ⚠ Embeddings     : ${result.pipelineB.error.slice(0, 100)}`);
    }
  } else {
    console.log(`  ✗ Statut       : ERREUR`);
    console.log(`  Erreur         : ${result.pipelineB.error}`);
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  const pipelineAOk = result.pipelineA.ok;
  const pipelineBOk = result.pipelineB.ok;

  console.log("\n========================================");
  console.log("  Résumé");
  console.log("========================================\n");
  console.log(`  Pipeline A : ${pipelineAOk ? "✓ OK" : "✗ ERREUR"}`);
  console.log(`  Pipeline B : ${pipelineBOk ? "✓ OK" : "✗ ERREUR (non bloquant)"}`);
  console.log(`  Durée totale : ${totalSec}s`);

  if (pipelineAOk) {
    console.log("\n  Prochaines étapes :");
    console.log("  → Vérifier les données :");
    console.log("    npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/check-bdpm-ingestion.ts");
    console.log("  → Tester le matching :");
    console.log("    npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/test-drug-matching.ts");
  } else {
    console.log("\n  ⚠ Pipeline A en erreur — les tables de matching ne sont pas alimentées.");
    console.log("  Vérifier les logs ci-dessus pour diagnostiquer.");
    process.exit(1);
  }

  console.log("\n========================================\n");
}

main()
  .catch((err) => {
    console.error("  ✗ Erreur non catchée :", err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => db.$disconnect());
