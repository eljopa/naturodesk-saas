/**
 * Normalisation des entrées consultation avant matching.
 *
 * Chaque champ (drugs, supplements, nutrients, symptoms) est converti en une
 * liste d'entrées normalisées portant la catégorie TermType correspondante.
 *
 * Réutilise normalizeInput() + buildNormalizedKey() de Phase 5
 * pour garantir la cohérence avec la clé pivot stockée en base.
 */

import { normalizeInput, buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import type { TermType } from "@prisma/client";
import type { ConsultationMatchInput } from "../types";

export interface NormalizedConsultationEntry {
  /** Nom brut tel qu'il arrive dans la consultation. */
  rawName: string;
  termType: TermType;
  /** Nom nettoyé (trim + espaces normalisés). */
  cleaned: string;
  /** Clé pivot normalisée (slug NFD/lowercase/hyphens). */
  normalizedKey: string;
}

/**
 * Convertit une ConsultationMatchInput en liste plate d'entrées normalisées.
 *
 * - Ignore les noms vides ou ne contenant que des espaces.
 * - Déduplique par normalizedKey pour éviter les requêtes redondantes.
 */
export function normalizeConsultationInput(
  input: ConsultationMatchInput
): NormalizedConsultationEntry[] {
  const entries: NormalizedConsultationEntry[] = [];
  const seenKeys = new Set<string>();

  const add = (names: string[] | undefined, termType: TermType) => {
    for (const rawName of names ?? []) {
      const cleaned = normalizeInput(rawName);
      if (!cleaned) continue;

      const normalizedKey = buildNormalizedKey(cleaned);
      if (seenKeys.has(normalizedKey)) continue;
      seenKeys.add(normalizedKey);

      entries.push({ rawName, termType, cleaned, normalizedKey });
    }
  };

  add(input.drugs, "DRUG");
  add(input.supplements, "SUPPLEMENT");
  add(input.nutrients, "NUTRIENT");
  add(input.symptoms, "SYMPTOM");

  return entries;
}
