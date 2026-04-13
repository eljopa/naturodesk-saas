/**
 * Construction de la réponse API finale.
 *
 * buildAnalysisResponse() assemble le JSON de sortie à partir des résultats
 * internes du pipeline. Effectue une projection légère sur les termes
 * (TermMatchResult → TermMatchSummary) pour ne pas exposer les IDs internes.
 *
 * Les ScoredFact et ChunkRef sont passés tels quels — ils sont déjà
 * des objets JSON-sérialisables propres.
 */

import type { KnowledgeAnalysisInput, KnowledgeAnalysisResponse } from "./types";
import type { SecureMatchResult } from "@/lib/knowledge/matching/types";
import type { AnalysisResult } from "@/lib/knowledge/analysis/types";

/**
 * Assemble la réponse API stable depuis les résultats du pipeline.
 */
export function buildAnalysisResponse(
  input: KnowledgeAnalysisInput,
  matchResult: SecureMatchResult,
  analysisResult: AnalysisResult
): KnowledgeAnalysisResponse {
  return {
    normalizedInput: {
      medications: input.medications,
      supplements:  input.supplements,
      nutrients:    input.nutrients,
      symptoms:     input.symptoms,
    },
    termMatches: {
      recognized: matchResult.termsMatched.map((t) => ({
        rawInput:      t.rawInput,
        canonicalName: t.canonicalName,
        termType:      t.termType,
        matchMethod:   t.matchMethod,
      })),
      unrecognized: matchResult.termsUnmatched.map((u) => ({
        rawInput: u.rawInput,
        reason:   u.reason,
      })),
    },
    analysis: {
      alerts:          analysisResult.alerts,
      interactions:    analysisResult.interactions,
      warnings:        analysisResult.warnings,
      depletions:      analysisResult.depletions,
      contextual_notes: analysisResult.contextual_notes,
      low_signal:      analysisResult.low_signal,
    },
    supportingChunks: analysisResult.supporting_chunks,
    meta: {
      highestRisk:        analysisResult.summary.highestRisk,
      totalFacts:         analysisResult.summary.totalFacts,
      semanticUsed:       analysisResult.summary.semanticUsed,
      durationMs:         analysisResult.durationMs,
      termsRecognized:    analysisResult.summary.termsRecognized,
      termsUnrecognized:  analysisResult.summary.termsUnrecognized,
      errors:             analysisResult.errors,
    },
  };
}
