/**
 * lib/clinical/normalize-symptoms.ts
 *
 * Étape 1 du pipeline : normalise le texte libre des symptômes en fragments,
 * puis tente de matcher chaque fragment sur le catalogue SymptomTerm.
 *
 * Stratégie de matching (par ordre de priorité décroissante) :
 *   1. Clé normalisée exacte (slug du fragment → normalizedKey)
 *   2. Label exact (insensible à la casse)
 *   3. Synonyme exact ou slug-normalisé
 *
 * Pas de fuzzy matching — la précision prime sur le rappel.
 * Si un symptôme n'est pas dans le catalogue, retourner matchBasis="none"
 * pour le tracer proprement en Tier 4.
 */

import { db } from "@/lib/db";
import type { SymptomMatch } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toSymptomSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // suppression diacritiques
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitSymptoms(rawText: string): string[] {
  return rawText
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .map((s) => s.toLowerCase());
}

// ---------------------------------------------------------------------------
// Matching principal
// ---------------------------------------------------------------------------

export async function normalizeSymptoms(rawText: string): Promise<SymptomMatch[]> {
  const fragments = splitSymptoms(rawText);
  if (fragments.length === 0) return [];

  // Charger tout le catalogue actif en une seule requête
  // Volume maximal prévu : < 500 entrées — pas de pagination nécessaire
  const terms = await db.symptomTerm.findMany({
    where: { isActive: true },
    select: {
      id: true,
      normalizedKey: true,
      label: true,
      labelEn: true,
      category: true,
      synonyms: true,
    },
  });

  const results: SymptomMatch[] = [];

  for (const fragment of fragments) {
    const slug = toSymptomSlug(fragment);

    // 1. Exact normalizedKey
    let match = terms.find((t) => t.normalizedKey === slug);
    let basis: SymptomMatch["matchBasis"] = "exact_key";

    // 2. Label exact (FR ou EN)
    if (!match) {
      match = terms.find(
        (t) =>
          t.label.toLowerCase() === fragment ||
          (t.labelEn?.toLowerCase() ?? "") === fragment,
      );
      basis = "label";
    }

    // 3. Synonyme exact ou slug-normalisé
    if (!match) {
      match = terms.find((t) =>
        t.synonyms.some(
          (syn) =>
            toSymptomSlug(syn) === slug || syn.toLowerCase() === fragment,
        ),
      );
      basis = "synonym";
    }

    if (match) {
      results.push({
        rawFragment: fragment,
        symptomTermId: match.id,
        normalizedKey: match.normalizedKey,
        label: match.label,
        category: match.category,
        matchBasis: basis,
      });
    } else {
      results.push({
        rawFragment: fragment,
        symptomTermId: null,
        normalizedKey: null,
        label: null,
        category: null,
        matchBasis: "none",
      });
    }
  }

  return results;
}
