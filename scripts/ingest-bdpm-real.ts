/**
 * scripts/ingest-bdpm-real.ts
 *
 * Ingestion BDPM réelle — télécharge les fichiers depuis ANSM et les injecte en base.
 *
 * Ce script contourne la limite de taille du body HTTP Vercel (4.5 MB)
 * en appelant directement ingestBdpm() sans passer par le webhook.
 *
 * Sources ANSM (publiques, pas d'authentification requise) :
 *   https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt
 *   https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_COMPO_bdpm.txt
 *   https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_CIP_bdpm.txt
 *   https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_GENER_bdpm.txt
 *
 * Encodage : ISO-8859-1 côté ANSM → décodé en latin1 par Buffer → string UTF-16 Node.js
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/ingest-bdpm-real.ts [batchRef]
 *
 * batchRef : optionnel, défaut = YYYY-MM (mois courant)
 *   Exemple : scripts/ingest-bdpm-real.ts 2026-04
 *
 * Durée estimée : 3-8 minutes selon la connexion et le serveur DB.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // charge .env.local

// Pour les scripts locaux longue durée, utiliser DIRECT_URL (connexion directe à PostgreSQL)
// plutôt que DATABASE_URL (pooler pgBouncer) pour éviter les erreurs "prepared statement already exists".
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

// ---------------------------------------------------------------------------
// Import path registration note :
// Ce script utilise -r tsconfig-paths/register pour résoudre les @/ imports.
// ---------------------------------------------------------------------------

import { ingestBdpm } from "@/lib/bdpm/ingest";
import type { BdpmFiles } from "@/lib/bdpm/ingest";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ANSM_BASE = "https://base-donnees-publique.medicaments.gouv.fr/download/file/";

const FILES_TO_DOWNLOAD: Array<{ key: keyof BdpmFiles; filename: string; required: boolean }> = [
  { key: "cis",   filename: "CIS_bdpm.txt",       required: true  },
  { key: "compo", filename: "CIS_COMPO_bdpm.txt",  required: true  },
  { key: "cip",   filename: "CIS_CIP_bdpm.txt",    required: true  },
  { key: "gener", filename: "CIS_GENER_bdpm.txt",  required: false },
];

// ---------------------------------------------------------------------------
// Téléchargement avec décodage ISO-8859-1
// ---------------------------------------------------------------------------

async function downloadFile(filename: string): Promise<string> {
  const url = `${ANSM_BASE}${filename}`;
  console.log(`  Téléchargement : ${filename}…`);

  const start = Date.now();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NaturoDesk-BDPM-Ingest/1.0 (contact@naturodesk.fr)",
      "Accept": "*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${filename} — ${response.statusText}`);
  }

  // Télécharger en binaire
  const buffer = Buffer.from(await response.arrayBuffer());

  // Les fichiers BDPM sont en ISO-8859-1 (Latin-1)
  // Buffer.toString('latin1') décode correctement les caractères accentués
  const content = buffer.toString("latin1");

  const dur     = ((Date.now() - start) / 1000).toFixed(1);
  const sizeKB  = Math.round(buffer.length / 1024);
  const lines   = content.split("\n").filter((l) => l.trim()).length;

  console.log(`  ✓ ${filename} — ${sizeKB} KB — ${lines.toLocaleString("fr-FR")} lignes — ${dur}s`);

  return content;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const batchRef = process.argv[2] ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  console.log("\n========================================");
  console.log("  Ingestion BDPM réelle — NaturoDesk");
  console.log("========================================");
  console.log(`\n  Batch : ${batchRef}`);
  console.log("  Source : ANSM (base-donnees-publique.medicaments.gouv.fr)");
  console.log("  Encodage : ISO-8859-1 → latin1 decode → string Node.js\n");

  // ── 1. Téléchargement des 4 fichiers ─────────────────────────────────────
  console.log("[1/2] Téléchargement des fichiers BDPM depuis ANSM…\n");

  const files: Partial<BdpmFiles> = {};
  const downloadStart = Date.now();

  for (const { key, filename, required } of FILES_TO_DOWNLOAD) {
    try {
      files[key] = await downloadFile(filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (required) {
        console.error(`\n  ✗ Fichier requis manquant : ${filename}`);
        console.error(`    Erreur : ${msg}`);
        console.error("  Ingestion annulée.\n");
        process.exit(1);
      } else {
        console.warn(`  ⚠ Fichier optionnel manquant : ${filename} — ${msg}`);
        files[key] = ""; // Vide mais présent pour satisfaire le type
      }
    }
  }

  const downloadDur = ((Date.now() - downloadStart) / 1000).toFixed(1);
  console.log(`\n  Téléchargement terminé en ${downloadDur}s\n`);

  // ── 2. Ingestion en base ──────────────────────────────────────────────────
  console.log("[2/2] Ingestion en base de données…\n");
  console.log("  (Cette étape peut prendre 3-8 minutes pour le jeu complet BDPM)");
  console.log("  Progression visible dans les logs console…\n");

  const ingestStart = Date.now();

  const result = await ingestBdpm(files as BdpmFiles, batchRef);

  const ingestDur = Math.round((Date.now() - ingestStart) / 1000);

  // ── 3. Résultat ───────────────────────────────────────────────────────────
  console.log("\n========================================");
  console.log("  Résultat ingestion");
  console.log("========================================\n");
  console.log(`  Batch ID    : ${result.batchId}`);
  console.log(`  Batch Ref   : ${result.batchRef}`);
  console.log(`  Durée totale: ${ingestDur}s (download ${downloadDur}s + ingest ${result.durationMs}ms)`);
  console.log("");
  console.log(`  Substances  : ${result.substancesUpserted.toLocaleString("fr-FR")} upsertées`);
  console.log(`  Produits    : ${result.productsCreated.toLocaleString("fr-FR")} créés`);
  console.log(`              + ${result.productsUpdated.toLocaleString("fr-FR")} mis à jour`);
  console.log(`              + ${result.productsUnchanged.toLocaleString("fr-FR")} inchangés`);
  console.log(`              + ${result.productsInactive.toLocaleString("fr-FR")} désactivés`);
  console.log(`  Présentations : ${result.presentationsUpserted.toLocaleString("fr-FR")} upsertées`);
  console.log(`  Alias       : ${result.aliasesCreated.toLocaleString("fr-FR")} créés/mis à jour`);

  if (result.errors.length > 0) {
    console.log(`\n  ⚠ ${result.errors.length} erreur(s) non bloquante(s) :`);
    for (const e of result.errors.slice(0, 5)) {
      console.log(`    · ${e}`);
    }
    if (result.errors.length > 5) {
      console.log(`    … et ${result.errors.length - 5} autres`);
    }
  }

  console.log("\n  Prochaine étape :");
  console.log("  → Diagnostic : npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/check-bdpm-ingestion.ts");
  console.log("  → Test matching : npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/test-drug-matching.ts");
  console.log("\n========================================\n");
}

main()
  .catch((err) => {
    console.error("\n  ✗ Erreur fatale :", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
