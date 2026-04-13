/**
 * Orchestrateur d'import ODS.
 *
 * Deux points d'entrée publics :
 *   importOdsTerm(normalizedKey)  — import d'un seul terme par normalizedKey
 *   importAllOdsTerms()           — import batch de tous les termes avec odsId
 *
 * Pipeline pour chaque terme :
 *   1. Lecture KnowledgeTerm en DB (odsId requis)
 *   2. fetchOdsFactSheet()       — téléchargement HTML
 *   3. parseOdsFactSheet()       — HTML → SourceDocumentInput
 *   4. importDocument()          — persistance idempotente (hash SHA-256)
 *   5. sleepBetweenRequests()    — 600ms de délai (batch uniquement)
 *
 * Idempotence : importDocument() ne recrée pas un document si le contentHash
 * correspond à un document existant (même contenu = skip silencieux).
 */

import { db } from "@/lib/db";
import { fetchOdsFactSheet, sleepBetweenRequests } from "./ods-fetcher";
import { parseOdsFactSheet } from "./ods-parser";
import { importDocument } from "../../import/services/import";
import type { ImportResult, BatchImportResult, ImportError } from "../../import/types";

// ---------------------------------------------------------------------------
// Import d'un terme unique
// ---------------------------------------------------------------------------

/**
 * Importe la fiche ODS d'un terme identifié par son normalizedKey.
 *
 * @throws Error si le terme est introuvable ou n'a pas de odsId.
 */
export async function importOdsTerm(normalizedKey: string): Promise<ImportResult> {
  const term = await db.knowledgeTerm.findUnique({
    where:  { normalizedKey },
    select: { normalizedKey: true, canonicalName: true, odsId: true },
  });

  if (!term) {
    throw new Error(`[ods-import] Terme introuvable : ${normalizedKey}`);
  }
  if (!term.odsId) {
    throw new Error(
      `[ods-import] Le terme "${normalizedKey}" n'a pas de odsId — pas de fiche ODS à importer.`
    );
  }

  console.log(
    `[ods-import] ▶ ${term.canonicalName} (${term.odsId})`
  );

  const html  = await fetchOdsFactSheet(term.odsId);
  const input = parseOdsFactSheet(html, term.odsId, term.normalizedKey, term.canonicalName);

  if (input.sections.length === 0) {
    console.warn(
      `[ods-import] ⚠ ${term.canonicalName} — aucune section reconnue dans la fiche ODS. ` +
      `Vérifier les fragments dans ods-sections.ts ou l'odsId "${term.odsId}".`
    );
  }

  return importDocument(input);
}

// ---------------------------------------------------------------------------
// Import batch — tous les termes avec odsId
// ---------------------------------------------------------------------------

/**
 * Importe les fiches ODS de tous les KnowledgeTerm ayant un odsId.
 *
 * - Respecte un délai de 600ms entre chaque requête HTTP.
 * - Les erreurs par terme sont collectées sans interrompre le batch.
 * - Les documents déjà importés (même hash) sont comptés comme skipped.
 *
 * @param filter  Si fourni, limite l'import aux termes dont normalizedKey
 *                est dans la liste (utile pour les tests partiels).
 */
export async function importAllOdsTerms(
  filter?: string[]
): Promise<BatchImportResult> {
  const whereFilter = filter && filter.length > 0
    ? { odsId: { not: null as null }, normalizedKey: { in: filter } }
    : { odsId: { not: null as null } };

  const terms = await db.knowledgeTerm.findMany({
    where:   whereFilter,
    select:  { normalizedKey: true, canonicalName: true, odsId: true },
    orderBy: { canonicalName: "asc" },
  });

  console.log(
    `\n[ods-import] Batch démarré — ${terms.length} terme(s) à importer\n`
  );

  const startedAt = Date.now();
  let imported    = 0;
  let skipped     = 0;
  const errors: ImportError[] = [];

  for (let idx = 0; idx < terms.length; idx++) {
    // for...of inférerait T, mais on a besoin de l'index pour le délai conditionnel.
    // L'assertion est sûre : idx est borné par terms.length.
    const term = terms[idx]!;

    try {
      const html  = await fetchOdsFactSheet(term.odsId!);
      const input = parseOdsFactSheet(
        html, term.odsId!, term.normalizedKey, term.canonicalName
      );

      if (input.sections.length === 0) {
        console.warn(
          `[ods-import] ⚠ ${term.canonicalName} — 0 section reconnue, import skipped`
        );
        skipped++;
      } else {
        const result = await importDocument(input);
        if (result.skipped) {
          skipped++;
          console.log(`[ods-import] ↩ ${term.canonicalName} — contenu inchangé (skip)`);
        } else {
          imported++;
          console.log(
            `[ods-import] ✓ ${term.canonicalName} — ` +
            `${result.chunksCreated} chunk(s) en ${result.durationMs}ms`
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ods-import] ✗ ${term.canonicalName} — ${message}`);

      errors.push({
        drugKey:    term.normalizedKey,
        sourceType: "NIH_ODS",
        stage:      "parse",
        error:      message,
      });
    }

    // Délai inter-requêtes (sauf après le dernier)
    if (idx < terms.length - 1) {
      await sleepBetweenRequests();
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `\n[ods-import] Batch terminé — ` +
    `${imported} importé(s), ${skipped} skip(s), ${errors.length} erreur(s) ` +
    `en ${durationMs}ms\n`
  );

  return {
    total:      terms.length,
    imported,
    skipped,
    errors,
    durationMs,
  };
}
