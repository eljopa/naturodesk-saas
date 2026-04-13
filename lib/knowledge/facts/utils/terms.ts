/**
 * Utilitaires de normalisation des termes pour l'extraction de faits.
 *
 * drugKeyToName()      → clé BDPM → nom canonique du médicament
 * normalizeTermName()  → normalise la casse et les accents d'un terme libre
 * classifyObjectType() → déduit le TermType d'un nom d'objet
 *
 * Ces fonctions seront remplacées par la Phase 5 (KnowledgeTerm)
 * qui gérera un dictionnaire complet avec alias et clés normalisées.
 * Pour l'instant, elles fournissent un socle déterministe minimal.
 */

import type { TermType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Drug key → canonical name
// ---------------------------------------------------------------------------

/**
 * Noms avec accents ou casse particulière qui ne se devinent pas
 * depuis la clé normalisée. La liste s'étendra avec les données BDPM réelles.
 */
const DRUG_NAME_OVERRIDES: Record<string, string> = {
  omeprazole: "Oméprazole",
  levothyroxine: "Lévothyroxine",
};

/**
 * Retourne le nom canonique d'un médicament depuis sa drugKey.
 * Fallback : première lettre en majuscule.
 */
export function drugKeyToName(drugKey: string): string {
  const override = DRUG_NAME_OVERRIDES[drugKey.toLowerCase()];
  if (override) return override;
  return drugKey.charAt(0).toUpperCase() + drugKey.slice(1);
}

// ---------------------------------------------------------------------------
// Term name normalization
// ---------------------------------------------------------------------------

/**
 * Formes canoniques connues pour les nutriments, suppléments et termes fréquents.
 * Permet de normaliser "vitamine b12" → "Vitamine B12", "ipp" → "IPP", etc.
 */
const CANONICAL_NAMES: Record<string, string> = {
  // Nutriments
  "vitamine b12": "Vitamine B12",
  "magnésium": "Magnésium",
  "magnesium": "Magnésium",
  "calcium": "Calcium",
  "fer": "Fer",
  "zinc": "Zinc",
  "vitamine d": "Vitamine D",
  "vitamine d3": "Vitamine D3",
  "folate": "Folate",
  "acide folique": "Acide folique",
  "sélénium": "Sélénium",
  // Suppléments / aliments
  "soja": "Soja",
  "oméga 3": "Oméga 3",
  "omega 3": "Oméga 3",
  // Médicaments courants (acronymes, génériques)
  "ipp": "IPP",
  "cholestyramine": "Cholestyramine",
  "rifampicine": "Rifampicine",
  "colestipol": "Colestipol",
  "nelfinavir": "Nelfinavir",
  "rilpivirine": "Rilpivirine",
  "clopidogrel": "Clopidogrel",
  "methotrexate": "Méthotrexate",
  "méthotrexate": "Méthotrexate",
};

/**
 * Retourne la forme canonique d'un nom de terme.
 * Recherche d'abord dans le dictionnaire des formes connues (insensible à la casse),
 * puis capitalise la première lettre comme fallback.
 */
export function normalizeTermName(raw: string): string {
  const key = raw.toLowerCase().trim();
  return CANONICAL_NAMES[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
}

// ---------------------------------------------------------------------------
// Object type classification
// ---------------------------------------------------------------------------

/** Termes classifiés comme nutriments. */
const NUTRIENT_TERMS = new Set([
  "Vitamine B12",
  "Magnésium",
  "Calcium",
  "Fer",
  "Zinc",
  "Vitamine D",
  "Vitamine D3",
  "Folate",
  "Acide folique",
  "Sélénium",
]);

/** Termes classifiés comme suppléments / aliments. */
const SUPPLEMENT_TERMS = new Set([
  "Soja",
  "Oméga 3",
  "Probiotiques",
]);

/**
 * Déduit le TermType d'un objet depuis son nom canonique.
 * Priorité : NUTRIENT > SUPPLEMENT > DRUG (défaut).
 *
 * Cette logique sera remplacée par la Phase 5 (KnowledgeTerm).
 */
export function classifyObjectType(canonicalName: string): TermType {
  if (NUTRIENT_TERMS.has(canonicalName)) return "NUTRIENT";
  if (SUPPLEMENT_TERMS.has(canonicalName)) return "SUPPLEMENT";
  return "DRUG";
}
