/**
 * Normalisation technique des noms de termes.
 *
 * buildNormalizedKey() produit la clé pivot stable utilisée comme `normalizedKey`
 * dans la table knowledge_terms (@unique).
 *
 * Règles appliquées dans l'ordre :
 *   1. trim() — supprime les espaces parasites
 *   2. NFD decompose → retire les diacritiques — "é" → "e", "à" → "a"
 *   3. lowercase
 *   4. espaces et underscores → tirets
 *   5. suppression des caractères non alphanumériques (sauf tirets)
 *   6. collapsing des tirets multiples
 *   7. suppression des tirets en début/fin
 *
 * Exemples :
 *   "Vitamine B12"    → "vitamine-b12"
 *   "Magnésium"       → "magnesium"
 *   "Oméprazole"      → "omeprazole"
 *   "Lévothyroxine"   → "levothyroxine"
 *   "IPP"             → "ipp"
 *   "Oméga 3"         → "omega-3"
 *   "Acide folique"   → "acide-folique"
 *   "Vitamine D3"     → "vitamine-d3"
 *
 * La même règle s'applique aux alias pour les comparaisons de lookup.
 */

/**
 * Construit la clé normalisée stable d'un nom de terme.
 * Utilisée comme `normalizedKey` en base et comme clé du dictionnaire d'alias.
 */
export function buildNormalizedKey(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les marques diacritiques
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalise un nom brut pour la comparaison / lookup.
 * Retourne le nom avec suppression des espaces multiples et trim,
 * sans toucher à la casse ni aux accents (pour préserver le nom affiché).
 *
 * Utilisé avant l'appel au dictionnaire d'alias et avant findOrCreateTerm().
 */
export function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ");
}
