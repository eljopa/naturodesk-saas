/**
 * Résolution de variante clinique (KnowledgeTermVariant).
 *
 * Stratégie :
 *   1. Lookup statique en mémoire (dict construit depuis SUPPLEMENT_VARIANT_SEEDS)
 *      → O(1), sans requête DB, couvre 100 % des cas seedés.
 *   2. Confirmation DB pour récupérer l'id de la variante.
 *
 * La résolution est faite sur le normalizedKey du parsedLabel de l'intake.
 * Ex: parsedLabel="magnésium bisglycinate" → key="magnesium-bisglycinate"
 *     → VARIANT_DICT → "magnesium-bisglycinate" → KnowledgeTermVariant.id
 *
 * Pas de fallback ILIKE en V1 : les cas sont couverts par les aliases du seed.
 */

import { db } from "@/lib/db";
import { buildNormalizedKey, normalizeInput } from "@/lib/knowledge/terms/utils/normalize";
import { SUPPLEMENT_VARIANT_SEEDS } from "@/lib/knowledge/seeds/supplement-variants";

// ---------------------------------------------------------------------------
// Dict statique — construit à l'initialisation du module
// ---------------------------------------------------------------------------

/** normalizedAliasKey → variantNormalizedKey */
const VARIANT_DICT = new Map<string, string>();

for (const variant of SUPPLEMENT_VARIANT_SEEDS) {
  // La clé canonique de la variante pointe vers elle-même
  VARIANT_DICT.set(variant.normalizedKey, variant.normalizedKey);
  // Chaque alias (normalisé) pointe aussi vers la variante
  for (const alias of variant.aliases) {
    const aliasKey = buildNormalizedKey(normalizeInput(alias));
    if (!VARIANT_DICT.has(aliasKey)) {
      VARIANT_DICT.set(aliasKey, variant.normalizedKey);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface VariantResolution {
  variantId:            string;
  variantNormalizedKey: string;
  variantLabel:         string;
  variantType:          string;    // SupplementVariantType value
  variantNotes:         string | null;
}

/**
 * Tente de résoudre une variante pour un intake parsé.
 *
 * @param intakeNormalizedKey  Clé normalisée du parsedLabel de l'intake.
 * @param knowledgeTermId      ID du terme parent résolu (pour validation FK).
 * @returns La résolution ou null si non trouvée.
 */
export async function resolveVariant(
  intakeNormalizedKey: string,
  knowledgeTermId:     string
): Promise<VariantResolution | null> {
  // ── 1. Dict statique ─────────────────────────────────────────────────────
  const variantKey = VARIANT_DICT.get(intakeNormalizedKey);
  if (!variantKey) return null;

  // ── 2. Confirmation DB (récupère l'id) ───────────────────────────────────
  const variant = await db.knowledgeTermVariant.findFirst({
    where:  { normalizedKey: variantKey, termId: knowledgeTermId },
    select: { id: true, normalizedKey: true, label: true, variantType: true, notes: true },
  });

  if (!variant) return null;

  return {
    variantId:            variant.id,
    variantNormalizedKey: variant.normalizedKey,
    variantLabel:         variant.label,
    variantType:          variant.variantType,
    variantNotes:         variant.notes ?? null,
  };
}

/**
 * Indique si une clé normalisée correspond à une variante connue (sans DB).
 * Utile pour les tests unitaires et la validation rapide.
 */
export function isKnownVariantKey(normalizedKey: string): boolean {
  return VARIANT_DICT.has(normalizedKey);
}
