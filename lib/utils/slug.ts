/**
 * Génère un slug URL-safe depuis une chaîne source.
 * Normalise les accents, supprime les caractères spéciaux, remplace les espaces par des tirets.
 */
export function generateSlug(source: string): string {
  return source
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // supprime les diacritiques (accents)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")     // supprime tout sauf alphanum, espace, tiret
    .trim()
    .replace(/\s+/g, "-")             // espaces → tirets
    .replace(/-+/g, "-")              // tirets multiples → tiret simple
    .slice(0, 60);
}
