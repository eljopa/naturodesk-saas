/**
 * Extracteur déterministe — Interactions médicamenteuses / substances.
 *
 * Source : chunks de kind "interaction" dont le metaJson contient
 * un champ `interactionTargets` structuré à l'import.
 *
 * Pattern : metaJson.interactionTargets = "calcium, fer, IPP, soja, cholestyramine, rifampicine"
 * → On split par virgule → un ExtractedFactInput par cible.
 *
 * factType   = INTERACTION
 * predicate  = INTERACTS_WITH
 * subjectType = DRUG
 * objectType  = déterminé par classifyObjectType()
 *              (NUTRIENT pour calcium/fer, SUPPLEMENT pour soja, DRUG pour IPP/etc.)
 *
 * Le metaJson.interactionMechanism est propagé en qualifier si présent.
 */

import type { FactExtractionCandidate, ExtractedFactInput } from "../types";
import { drugKeyToName, classifyObjectType, normalizeTermName } from "../utils/terms";

/**
 * Extrait les faits d'interaction depuis un chunk "interaction".
 * Retourne un tableau vide si metaJson ne contient pas interactionTargets.
 */
export function extractInteractionFacts(
  candidate: FactExtractionCandidate
): ExtractedFactInput[] {
  const meta = candidate.metaJson;
  if (!meta || typeof meta.interactionTargets !== "string") return [];

  const rawTargets = meta.interactionTargets;
  const qualifier =
    typeof meta.interactionMechanism === "string" ? meta.interactionMechanism : undefined;

  // Split "calcium, fer, IPP, soja" → ["calcium", "fer", "IPP", "soja"]
  const targets = rawTargets
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const subjectName = drugKeyToName(candidate.drugKey);

  return targets.map((rawTarget): ExtractedFactInput => {
    const targetName = normalizeTermName(rawTarget);
    return {
      chunkId: candidate.id,
      documentId: candidate.documentId,
      factType: "INTERACTION",
      subject: subjectName,
      subjectType: "DRUG",
      predicate: "INTERACTS_WITH",
      object: targetName,
      objectType: classifyObjectType(targetName),
      qualifier,
      confidence: 1.0,
      rawExcerpt: candidate.excerpt,
    };
  });
}
