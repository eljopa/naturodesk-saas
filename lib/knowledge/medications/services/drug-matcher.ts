/**
 * lib/knowledge/medications/services/drug-matcher.ts
 *
 * Matching médicament saisi → DrugProduct / DrugSubstance (tables BDPM Phase A).
 *
 * Pipeline de résolution (ordre décroissant de confiance) :
 *   1. DrugAlias.key exact (normalizedKey)  → productId ou substanceId     conf: 1.0
 *   2. DrugProduct.normalizedName exact     → productId                     conf: 0.95
 *   3. DrugProduct.normalizedBrand exact    → productId                     conf: 0.90
 *   4. DrugSubstance.normalizedKey exact    → substanceId                   conf: 0.90
 *   5. DrugProduct ILIKE normalizedName     → productId (fuzzy)             conf: 0.70
 *
 * Entrée : string brute (parsedLabel OU parsedBrandName extrait du parser).
 * La fonction normalise elle-même via buildNormalizedKey().
 *
 * La fonction est appelée deux fois par intake :
 *   1. sur parsedBrandName (nom commercial)
 *   2. sur parsedLabel (DCI) si la première tentative ne donne rien
 * Le runner fusionne les deux résultats (le meilleur gagne).
 */

import { db } from "@/lib/db";
import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type DrugMatchedBy = "alias" | "product_name" | "product_brand" | "substance" | "fuzzy" | "none";

export interface DrugMatchResult {
  drugProductId:   string | null;
  drugSubstanceId: string | null;
  confidence:      number;
  matchedBy:       DrugMatchedBy;
}

const NO_MATCH: DrugMatchResult = {
  drugProductId:   null,
  drugSubstanceId: null,
  confidence:      0,
  matchedBy:       "none",
};

// ---------------------------------------------------------------------------
// matchDrug
// ---------------------------------------------------------------------------

/**
 * Résout un nom de médicament vers DrugProduct / DrugSubstance.
 *
 * @param input  Texte brut : parsedLabel (DCI) ou parsedBrandName (marque)
 * @returns      DrugMatchResult — toujours défini, confidence=0 si non trouvé
 */
export async function matchDrug(input: string): Promise<DrugMatchResult> {
  const trimmed = input.trim();
  if (!trimmed) return NO_MATCH;

  const key = buildNormalizedKey(trimmed);
  if (!key) return NO_MATCH;

  // ── 1. DrugAlias — lookup O(1) sur key unique ──────────────────────────────
  const alias = await db.drugAlias.findUnique({
    where:  { key },
    select: { productId: true, substanceId: true },
  });

  if (alias) {
    if (alias.productId) {
      return { drugProductId: alias.productId, drugSubstanceId: null, confidence: 1.0, matchedBy: "alias" };
    }
    if (alias.substanceId) {
      return { drugProductId: null, drugSubstanceId: alias.substanceId, confidence: 1.0, matchedBy: "alias" };
    }
  }

  // ── 2. DrugProduct.normalizedName exact ────────────────────────────────────
  const productByName = await db.drugProduct.findFirst({
    where:  { normalizedName: key, isActive: true },
    select: { id: true },
  });

  if (productByName) {
    return { drugProductId: productByName.id, drugSubstanceId: null, confidence: 0.95, matchedBy: "product_name" };
  }

  // ── 3. DrugProduct.normalizedBrand exact ───────────────────────────────────
  const productByBrand = await db.drugProduct.findFirst({
    where:  { normalizedBrand: key, isActive: true },
    select: { id: true },
  });

  if (productByBrand) {
    return { drugProductId: productByBrand.id, drugSubstanceId: null, confidence: 0.90, matchedBy: "product_brand" };
  }

  // ── 4. DrugSubstance.normalizedKey exact ───────────────────────────────────
  const substance = await db.drugSubstance.findFirst({
    where:  { normalizedKey: key, isActive: true },
    select: { id: true },
  });

  if (substance) {
    return { drugProductId: null, drugSubstanceId: substance.id, confidence: 0.90, matchedBy: "substance" };
  }

  // ── 5. DrugProduct ILIKE normalizedName (fuzzy) ────────────────────────────
  // Utile pour les noms avec suffixes (ex: "levothyrox" → "levothyrox-75-microgrammes-comprime")
  const fuzzyRows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "drug_products"
    WHERE "isActive" = true
      AND "normalizedName" ILIKE ${"%" + key + "%"}
    LIMIT 1
  `;

  if (fuzzyRows.length > 0 && fuzzyRows[0]) {
    return { drugProductId: fuzzyRows[0].id, drugSubstanceId: null, confidence: 0.70, matchedBy: "fuzzy" };
  }

  return NO_MATCH;
}

// ---------------------------------------------------------------------------
// matchDrugFromIntake
// ---------------------------------------------------------------------------

/**
 * Tente le matching sur les deux candidats extraits du parser :
 *   - parsedBrandName (prioritaire — plus spécifique)
 *   - parsedLabel (fallback — DCI)
 *
 * Retourne le meilleur résultat (confidence la plus haute).
 */
export async function matchDrugFromIntake(
  parsedLabel:     string | null,
  parsedBrandName: string | null,
): Promise<DrugMatchResult> {
  // Essai 1 : nom de marque (prioritaire)
  if (parsedBrandName) {
    const brandMatch = await matchDrug(parsedBrandName);
    if (brandMatch.matchedBy !== "none") return brandMatch;
  }

  // Essai 2 : DCI / label nettoyé
  if (parsedLabel) {
    const labelMatch = await matchDrug(parsedLabel);
    if (labelMatch.matchedBy !== "none") return labelMatch;
  }

  return NO_MATCH;
}
