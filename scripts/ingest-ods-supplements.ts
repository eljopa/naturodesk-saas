/**
 * Script CLI — Ingestion ODS des 30 suppléments V1
 *
 * Usage :
 *   # Tous les termes avec odsId
 *   npx ts-node --project tsconfig.json scripts/ingest-ods-supplements.ts
 *
 *   # Un seul terme (par normalizedKey)
 *   npx ts-node --project tsconfig.json scripts/ingest-ods-supplements.ts --term=magnesium
 *
 *   # Plusieurs termes
 *   npx ts-node --project tsconfig.json scripts/ingest-ods-supplements.ts \
 *     --term=magnesium --term=zinc --term=vitamine-d
 *
 *   # Mode dry-run : fetch + parse uniquement, sans écriture en DB
 *   npx ts-node --project tsconfig.json scripts/ingest-ods-supplements.ts --dry-run
 *   npx ts-node --project tsconfig.json scripts/ingest-ods-supplements.ts --dry-run --term=magnesium
 *
 * Pré-requis : DATABASE_URL dans .env
 */

import { PrismaClient } from "@prisma/client";
import { fetchOdsFactSheet, buildOdsUrl, sleepBetweenRequests } from "../lib/knowledge/ingestion/ods/ods-fetcher";
import { parseOdsFactSheet } from "../lib/knowledge/ingestion/ods/ods-parser";
import { importOdsTerm, importAllOdsTerms } from "../lib/knowledge/ingestion/ods/ods-import";

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isDryRun   = args.includes("--dry-run");
const termKeys   = args
  .filter((a) => a.startsWith("--term="))
  .map((a) => a.replace("--term=", "").trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Dry-run : fetch + parse, affichage uniquement
// ---------------------------------------------------------------------------

async function dryRunTerm(
  normalizedKey: string,
  canonicalName: string,
  odsId: string
): Promise<void> {
  const url = buildOdsUrl(odsId);
  console.log(`  Fetching : ${url}`);

  const html  = await fetchOdsFactSheet(odsId);
  const input = parseOdsFactSheet(html, odsId, normalizedKey, canonicalName);

  if (input.sections.length === 0) {
    console.log(`  ⚠ Aucune section reconnue — vérifier odsId ou ods-sections.ts\n`);
    return;
  }

  for (const s of input.sections) {
    const preview = s.text.slice(0, 120).replace(/\n/g, " ");
    console.log(`  [${s.sectionPath.padEnd(14)}] "${s.title}"`);
    console.log(`               ${preview}…`);
  }
  console.log(`  → ${input.sections.length} section(s) extraite(s)\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ODS Supplement Ingestion${isDryRun ? " [DRY-RUN]" : ""}`);
  console.log(`${"═".repeat(60)}\n`);

  if (isDryRun) {
    // ── Dry-run mode ──────────────────────────────────────────────────────
    const db = new PrismaClient();

    const where = termKeys.length > 0
      ? { odsId: { not: null as null }, normalizedKey: { in: termKeys } }
      : { odsId: { not: null as null } };

    const terms = await db.knowledgeTerm.findMany({
      where,
      select:  { normalizedKey: true, canonicalName: true, odsId: true },
      orderBy: { canonicalName: "asc" },
    });

    await db.$disconnect();

    console.log(`${terms.length} terme(s) à tester\n`);

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i]!;
      console.log(`[${i + 1}/${terms.length}] ${term.canonicalName} (odsId: ${term.odsId})`);
      try {
        await dryRunTerm(term.normalizedKey, term.canonicalName, term.odsId!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ✗ Erreur : ${msg}\n`);
      }
      if (i < terms.length - 1) await sleepBetweenRequests();
    }

    console.log("Dry-run terminé. Aucune écriture en DB.\n");
    return;
  }

  // ── Import live ───────────────────────────────────────────────────────────
  if (termKeys.length === 1) {
    // Import d'un seul terme
    const key = termKeys[0]!;
    console.log(`Import single : ${key}\n`);
    const result = await importOdsTerm(key);
    if (result.skipped) {
      console.log(`\n↩ Skip — contenu inchangé (même hash).`);
    } else {
      console.log(`\n✓ ${result.chunksCreated} chunk(s) importé(s) en ${result.durationMs}ms.`);
    }
  } else if (termKeys.length > 1) {
    // Import d'une sélection de termes
    console.log(`Import sélection : ${termKeys.join(", ")}\n`);
    const result = await importAllOdsTerms(termKeys);
    printBatchSummary(result);
  } else {
    // Import de tous les termes avec odsId
    const result = await importAllOdsTerms();
    printBatchSummary(result);
  }
}

function printBatchSummary(result: Awaited<ReturnType<typeof importAllOdsTerms>>): void {
  console.log(`${"─".repeat(60)}`);
  console.log(`Total    : ${result.total}`);
  console.log(`Importés : ${result.imported}`);
  console.log(`Skipped  : ${result.skipped}`);
  console.log(`Erreurs  : ${result.errors.length}`);
  if (result.errors.length > 0) {
    for (const e of result.errors) {
      console.log(`  ✗ ${e.drugKey} — ${e.error}`);
    }
  }
  console.log(`Durée    : ${result.durationMs}ms`);
  console.log(`${"─".repeat(60)}\n`);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
