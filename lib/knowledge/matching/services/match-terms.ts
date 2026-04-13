/**
 * Matching lexical des termes de consultation vers les KnowledgeTerm en base.
 *
 * Ordre de résolution (lexical-first) :
 *   1. alias_dictionary — ALIAS_DICTIONARY (resolveAlias) → lookup par canonicalKey
 *   2. exact_key        — normalizedKey direct en base
 *   3. alias_db         — recherche ILIKE ANY(aliases) en SQL (insensible à la casse)
 *
 * Si aucune des 3 étapes ne trouve de terme → TermNoMatch (rejet traçable).
 * Aucune création de terme ici — le matching est purement en lecture.
 */

import { db } from "@/lib/db";
import { resolveAlias } from "@/lib/knowledge/terms/utils/aliases";
import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import type { TermType } from "@prisma/client";
import type { NormalizedConsultationEntry } from "./normalize-input";
import type { TermMatchResult, TermNoMatch } from "../types";

interface RawTermRow {
  id: string;
  termType: TermType;
  canonicalName: string;
  normalizedKey: string;
}

export interface MatchTermsResult {
  matched: TermMatchResult[];
  unmatched: TermNoMatch[];
}

/**
 * Résout chaque entrée normalisée vers un KnowledgeTerm via 3 étapes lexicales.
 * Retourne les termes trouvés et ceux qui n'ont pas de correspondance.
 */
export async function matchConsultationTerms(
  entries: NormalizedConsultationEntry[]
): Promise<MatchTermsResult> {
  const matched: TermMatchResult[] = [];
  const unmatched: TermNoMatch[] = [];

  for (const entry of entries) {
    // --- Étape 1 : alias dictionary ---
    const aliasEntry = resolveAlias(entry.normalizedKey);

    if (aliasEntry) {
      const canonicalKey = buildNormalizedKey(aliasEntry.canonicalName);
      const term = await db.knowledgeTerm.findUnique({
        where: { normalizedKey: canonicalKey },
      });

      if (term) {
        matched.push({
          rawInput: entry.rawName,
          termId: term.id,
          canonicalName: term.canonicalName,
          normalizedKey: term.normalizedKey,
          termType: term.termType,
          matchMethod: "alias_dictionary",
        });
        console.log(
          `[matching] alias_dictionary : "${entry.rawName}" → ${term.canonicalName} [${term.termType}]`
        );
        continue;
      }
    }

    // --- Étape 2 : exact_key ---
    const exactTerm = await db.knowledgeTerm.findUnique({
      where: { normalizedKey: entry.normalizedKey },
    });

    if (exactTerm) {
      matched.push({
        rawInput: entry.rawName,
        termId: exactTerm.id,
        canonicalName: exactTerm.canonicalName,
        normalizedKey: exactTerm.normalizedKey,
        termType: exactTerm.termType,
        matchMethod: "exact_key",
      });
      console.log(
        `[matching] exact_key : "${entry.rawName}" → ${exactTerm.canonicalName} [${exactTerm.termType}]`
      );
      continue;
    }

    // --- Étape 3 : alias_db (ILIKE ANY) ---
    const rows = await db.$queryRaw<RawTermRow[]>`
      SELECT id, "termType", "canonicalName", "normalizedKey"
      FROM knowledge_terms
      WHERE ${entry.cleaned} ILIKE ANY(aliases)
      LIMIT 1
    `;

    if (rows.length > 0) {
      const row = rows[0]!;
      matched.push({
        rawInput: entry.rawName,
        termId: row.id,
        canonicalName: row.canonicalName,
        normalizedKey: row.normalizedKey,
        termType: row.termType,
        matchMethod: "alias_db",
      });
      console.log(
        `[matching] alias_db : "${entry.rawName}" → ${row.canonicalName} [${row.termType}]`
      );
      continue;
    }

    // --- Rejeté ---
    unmatched.push({
      rawInput: entry.rawName,
      normalizedKey: entry.normalizedKey,
      reason: "not_found",
    });
    console.log(`[matching] not_found : "${entry.rawName}" (key=${entry.normalizedKey})`);
  }

  return { matched, unmatched };
}
