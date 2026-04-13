/**
 * Création et lookup idempotents de KnowledgeTerm.
 *
 * findOrCreateTerm() est le point d'entrée unique pour obtenir un terme.
 * Il fusionne lookup, résolution d'alias, création et logging.
 *
 * Pivot d'idempotence : normalizedKey (@unique en base).
 * Deux noms qui produisent le même normalizedKey → même terme.
 *
 * Exemple :
 *   findOrCreateTerm("magnésium", "NUTRIENT")
 *   findOrCreateTerm("Magnesium", "NUTRIENT")
 *   → même terme (normalizedKey = "magnesium")
 */

import { db } from "@/lib/db";
import type { KnowledgeTerm, TermType } from "@prisma/client";
import { buildNormalizedKey, normalizeInput } from "../utils/normalize";
import { resolveAlias } from "../utils/aliases";
import type { TermResolutionResult } from "../types";

interface FindOrCreateOptions {
  drugKey?: string;
  aliases?: string[];
}

/**
 * Retourne le KnowledgeTerm correspondant à un nom, en le créant si nécessaire.
 *
 * Séquence :
 *   1. normalizeInput()   → nettoie le nom brut
 *   2. buildNormalizedKey() → produit la clé pivot
 *   3. resolveAlias()     → résout si alias connu (ex: "glucophage" → "Metformine")
 *   4. DB lookup          → cherche par normalizedKey
 *   5. DB create          → si introuvable
 */
export async function findOrCreateTerm(
  rawName: string,
  termType: TermType,
  opts: FindOrCreateOptions = {}
): Promise<TermResolutionResult> {
  const cleaned = normalizeInput(rawName);
  const inputKey = buildNormalizedKey(cleaned);

  // Étape 1 — Résolution d'alias
  const aliasEntry = resolveAlias(inputKey);
  const resolvedFromAlias = aliasEntry !== null;

  const canonicalName = aliasEntry?.canonicalName ?? cleaned;
  const resolvedTermType = aliasEntry?.termType ?? termType;
  const canonicalKey = buildNormalizedKey(canonicalName);

  // Étape 2 — Lookup en base par normalizedKey canonique
  const existing = await db.knowledgeTerm.findUnique({
    where: { normalizedKey: canonicalKey },
  });

  if (existing) {
    return {
      termId: existing.id,
      canonicalName: existing.canonicalName,
      normalizedKey: existing.normalizedKey,
      resolvedFromAlias,
      created: false,
    };
  }

  // Étape 3 — Création
  const created = await db.knowledgeTerm.create({
    data: {
      termType: resolvedTermType,
      canonicalName,
      normalizedKey: canonicalKey,
      aliases: opts.aliases ?? [],
      drugKey: opts.drugKey ?? null,
    },
  });

  return {
    termId: created.id,
    canonicalName: created.canonicalName,
    normalizedKey: created.normalizedKey,
    resolvedFromAlias,
    created: true,
  };
}

/**
 * Version simplifiée pour lookup seul (sans création).
 * Retourne null si le terme n'existe pas en base.
 */
export async function findTerm(
  rawName: string
): Promise<KnowledgeTerm | null> {
  const key = buildNormalizedKey(normalizeInput(rawName));
  // Resolve alias first
  const alias = resolveAlias(key);
  const lookupKey = alias ? buildNormalizedKey(alias.canonicalName) : key;
  return db.knowledgeTerm.findUnique({ where: { normalizedKey: lookupKey } });
}
