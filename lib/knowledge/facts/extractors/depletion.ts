/**
 * Extracteur déterministe — Déplétions nutritionnelles.
 *
 * Source : chunks de kind "side_effect" dont le metaJson contient
 * un champ `depletionRisk` structuré à l'import.
 *
 * Pattern : metaJson.depletionRisk = "vitamine B12" | "magnésium, vitamine B12"
 * → On split par virgule → un ExtractedFactInput par nutriment.
 *
 * factType   = DEPLETION
 * predicate  = DEPLETES
 * subjectType = DRUG
 * objectType  = NUTRIENT
 *
 * Aucune regex sur le texte libre — on lit uniquement le metaJson structuré.
 * Cela garantit la fiabilité et la traçabilité de l'extraction.
 */

import type { FactExtractionCandidate, ExtractedFactInput } from "../types";
import { drugKeyToName, classifyObjectType, normalizeTermName } from "../utils/terms";

/**
 * Extrait les faits de déplétion nutritionnelle depuis un chunk "side_effect".
 * Retourne un tableau vide si le metaJson ne contient pas de champ depletionRisk.
 */
export function extractDepletionFacts(
  candidate: FactExtractionCandidate
): ExtractedFactInput[] {
  const meta = candidate.metaJson;
  if (!meta || typeof meta.depletionRisk !== "string") return [];

  const rawRisk = meta.depletionRisk;
  const qualifier =
    typeof meta.depletionFrequency === "string" ? meta.depletionFrequency : undefined;

  // Split "magnésium, vitamine B12" → ["magnésium", "vitamine B12"]
  const nutrients = rawRisk
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const subjectName = drugKeyToName(candidate.drugKey);

  return nutrients.map((rawNutrient): ExtractedFactInput => {
    const nutrientName = normalizeTermName(rawNutrient);
    return {
      chunkId: candidate.id,
      documentId: candidate.documentId,
      factType: "DEPLETION",
      subject: subjectName,
      subjectType: "DRUG",
      predicate: "DEPLETES",
      object: nutrientName,
      objectType: classifyObjectType(nutrientName),
      qualifier,
      confidence: 1.0,
      rawExcerpt: candidate.excerpt,
    };
  });
}
