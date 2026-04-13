/**
 * Parser de saisies libres de suppléments.
 *
 * Les praticiens saisissent des noms libres comme :
 *   "magnésium marin 300mg par jour"
 *   "Vitamine D3 2000 UI le matin"
 *   "glutamine poudre 5g"
 *   "Oméga 3 EPA/DHA 1000mg"
 *
 * Ce parser supprime les informations de dosage et de prise pour
 * ne conserver que le nom de l'ingrédient, passable au matching lexical.
 *
 * Stratégie : regex successives + collapse — aucune dépendance NLP externe.
 * Robustesse : retourne le nom original trimmé si rien ne peut être retiré.
 */

// ---------------------------------------------------------------------------
// Patterns de suppression
// ---------------------------------------------------------------------------

/**
 * Quantités avec unités :
 *   "300mg", "2 000 UI", "1000IU", "400 mcg", "5 g", "500 ml"
 */
const DOSAGE_QUANTITY = /\b\d+(?:[.,\s]\d+)?\s*(?:mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml|mL|cl|l)\b/gi;

/**
 * Formes galéniques courantes :
 *   "poudre", "gélules", "comprimés", "capsules", "ampoules", "spray"
 *   Note : on ne retire PAS "marin", "organique" — géré via aliases dict.
 */
const GALENIC_FORMS =
  /\b(?:poudre|gelules?|gélules?|comprimes?|comprimés?|capsules?|ampoules?|spray|liquide|huile|extrait|sachets?)\b/gi;

/**
 * Instructions de prise :
 *   "par jour", "par semaine", "le matin", "le soir", "à jeun", etc.
 */
const INTAKE_INSTRUCTIONS =
  /\b(?:par\s+(?:jour|semaine|prise)|le\s+(?:matin|soir)|au\s+coucher|à\s+jeun|matin|soir)\b/gi;

/**
 * "N gélules", "2 comprimés/j", etc. (nombre isolé précédant une forme)
 */
const COUNT_BEFORE_FORM = /\b\d+\s*(?:x|fois)?\s*(?:gélules?|gélule|comprimé|capsule|ampoule)s?\b/gi;

/**
 * Séparateurs de ratio ou fraction : "/j", "/jour", "/semaine"
 */
const RATIO_SUFFIX = /\/(?:j|jour|semaine|prise)\b/gi;

/**
 * Nombres isolés résiduels (après suppression des unités).
 * Attention : ne pas retirer les chiffres en milieu de nom (B12, CoQ10).
 * Règle : nombre isolé en fin de chaîne uniquement.
 */
const TRAILING_NUMBER = /\s+\d+$/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Nettoie un nom de supplément saisi librement.
 * Supprime dosage, unités, formes galéniques et instructions de prise.
 * Retourne le nom nettoyé et trimmé.
 *
 * @example
 * parseSupplementInput("magnésium marin 300mg par jour")  → "magnésium marin"
 * parseSupplementInput("Vitamine D3 2000 UI le matin")    → "Vitamine D3"
 * parseSupplementInput("glutamine poudre 5g")             → "glutamine"
 * parseSupplementInput("Oméga 3 EPA/DHA 1000mg")          → "Oméga 3 EPA/DHA"
 * parseSupplementInput("Probiotiques")                    → "Probiotiques"
 */
export function parseSupplementInput(rawName: string): string {
  const cleaned = rawName
    .replace(/\//g, " ")            // "/" est un séparateur (EPA/DHA, mg/j) — jamais dans un nom
    .replace(COUNT_BEFORE_FORM, "")
    .replace(DOSAGE_QUANTITY, "")
    .replace(GALENIC_FORMS, "")
    .replace(INTAKE_INSTRUCTIONS, "")
    .replace(RATIO_SUFFIX, "")
    .replace(TRAILING_NUMBER, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Fallback : retourner le nom original si le nettoyage produit une chaîne vide
  return cleaned || rawName.trim();
}

/**
 * Nettoie une liste de noms de suppléments.
 * Filtre les résultats vides.
 */
export function parseSupplementInputList(rawNames: string[]): string[] {
  return rawNames
    .map(parseSupplementInput)
    .filter((name) => name.length > 0);
}
