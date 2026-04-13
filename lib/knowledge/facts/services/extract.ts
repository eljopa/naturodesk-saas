/**
 * Dispatcher d'extraction de faits.
 *
 * extractFactsFromChunk() route chaque chunk vers l'extracteur
 * correspondant à son kind. Un kind sans extracteur retourne [].
 *
 * isChunkFactExtractable() indique si un chunk peut produire des faits
 * avec les extracteurs V1 actuellement implémentés.
 *
 * Ajouter un nouvel extracteur :
 *   1. Créer lib/knowledge/facts/extractors/monExtracteur.ts
 *   2. Ajouter le case correspondant dans extractFactsFromChunk()
 *   3. Ajouter le kind dans EXTRACTORS_WITH_IMPL
 */

import { extractDepletionFacts } from "../extractors/depletion";
import { extractInteractionFacts } from "../extractors/interaction";
import type { FactExtractionCandidate, ExtractedFactInput } from "../types";

/** Kinds pour lesquels un extracteur est effectivement implémenté en V1. */
const EXTRACTORS_WITH_IMPL = new Set(["side_effect", "interaction"]);

/**
 * Indique si ce chunk peut produire des faits avec les extracteurs V1.
 * (distinct de isChunkFactExtractable() de candidates.ts qui couvre aussi
 * les kinds prévus mais pas encore implémentés)
 */
export function isChunkFactExtractable(kind: string): boolean {
  return EXTRACTORS_WITH_IMPL.has(kind);
}

/**
 * Route un chunk vers l'extracteur approprié et retourne les faits extraits.
 * Retourne [] si le kind n'a pas d'extracteur implémenté.
 */
export function extractFactsFromChunk(
  candidate: FactExtractionCandidate
): ExtractedFactInput[] {
  switch (candidate.kind) {
    case "side_effect":
      return extractDepletionFacts(candidate);

    case "interaction":
      return extractInteractionFacts(candidate);

    // Extracteurs à implémenter dans les prochaines itérations :
    // case "contraindication": return extractContraindicationFacts(candidate);
    // case "warning": return extractWarningFacts(candidate);

    default:
      return [];
  }
}
