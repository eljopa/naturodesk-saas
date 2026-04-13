/**
 * Validation Zod de l'input d'analyse knowledge.
 *
 * Règles :
 *   - Tous les champs de listes sont optionnels (absent = [])
 *   - Les chaînes vides ou ne contenant que des espaces sont rejetées
 *   - Maximum 20 entrées par liste (protection contre les abus)
 *   - context : libre, max 500 caractères
 *   - includeSemanticComplement : false par défaut (pas de vectoriel sans demande explicite)
 *
 * Au moins un terme dans une liste doit être présent (medications | supplements | nutrients | symptoms).
 * Cette contrainte est vérifiée après parsing via validateAnalysisInput().
 */

import { z } from "zod";
import type { KnowledgeAnalysisInput } from "./types";

const nonEmptyString = z.string().min(1, "Le terme ne peut pas être vide");

const termList = z
  .array(nonEmptyString)
  .max(20, "Maximum 20 entrées par liste")
  .optional()
  .default([]);

export const KnowledgeAnalysisInputSchema = z.object({
  medications:               termList,
  supplements:               termList,
  nutrients:                 termList,
  symptoms:                  termList,
  context:                   z.string().max(500).optional(),
  includeSemanticComplement: z.boolean().optional().default(false),
});

export type RawAnalysisInput = z.input<typeof KnowledgeAnalysisInputSchema>;
export type ParsedAnalysisInput = z.output<typeof KnowledgeAnalysisInputSchema>;

/**
 * Valide et parse l'input brut.
 * Retourne l'input normalisé ou lance une ZodError.
 *
 * Contrainte supplémentaire : au moins un terme dans l'une des listes.
 */
export function validateAnalysisInput(raw: unknown): KnowledgeAnalysisInput {
  const parsed = KnowledgeAnalysisInputSchema.parse(raw);

  const totalTerms =
    parsed.medications.length +
    parsed.supplements.length +
    parsed.nutrients.length +
    parsed.symptoms.length;

  if (totalTerms === 0) {
    throw new Error(
      "Au moins un terme est requis (medications, supplements, nutrients ou symptoms)"
    );
  }

  return parsed as KnowledgeAnalysisInput;
}
