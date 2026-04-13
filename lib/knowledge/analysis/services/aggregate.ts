/**
 * Agrégation des faits scorés en buckets et construction du résumé.
 *
 * aggregateMatchedResults() :
 *   1. Applique scoreMatchedFact() + classifyMatchedFact() sur chaque FactMatchResult
 *   2. Construit un ScoredFact avec la traçabilité complète
 *   3. Distribue dans les buckets (alert / interaction / warning / depletion / contextual / low_signal)
 *   4. Trie chaque bucket par finalScore décroissant
 *   5. Convertit les ChunkMatchResult en ChunkRef
 *
 * buildAnalysisSummary() :
 *   Agrège les compteurs depuis les buckets remplis.
 *
 * Traçabilité : triggeredByTermName est résolu depuis la map termId → canonicalName
 * passée en paramètre (issue de SecureMatchResult.termsMatched).
 */

import { scoreMatchedFact } from "./score-fact";
import { classifyMatchedFact } from "./classify-fact";
import type { FactMatchResult, ChunkMatchResult, TermMatchResult } from "../../matching/types";
import type {
  ScoredFact,
  ChunkRef,
  AnalysisBucket,
  AnalysisSummary,
  RiskLevel,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_ORDER: Record<RiskLevel, number> = {
  CRITICAL:      5,
  HIGH:          4,
  MEDIUM:        3,
  LOW:           2,
  INFORMATIONAL: 1,
};

function higherRisk(a: RiskLevel | null, b: RiskLevel): RiskLevel {
  if (a === null) return b;
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface AggregatedBuckets {
  alert: ScoredFact[];
  interaction: ScoredFact[];
  warning: ScoredFact[];
  depletion: ScoredFact[];
  contextual: ScoredFact[];
  low_signal: ScoredFact[];
}

/**
 * Score, classifie et distribue tous les faits matchés dans leurs buckets.
 * @param facts    Faits issus de matchFactsFromTerms().
 * @param termMap  Map termId → canonicalName pour la traçabilité.
 */
export function aggregateMatchedResults(
  facts: FactMatchResult[],
  termMap: Map<string, string>
): AggregatedBuckets {
  const buckets: AggregatedBuckets = {
    alert:       [],
    interaction: [],
    warning:     [],
    depletion:   [],
    contextual:  [],
    low_signal:  [],
  };

  for (const fact of facts) {
    const { baseScore, finalScore, riskLevel } = scoreMatchedFact(fact);
    const bucket: AnalysisBucket = classifyMatchedFact(fact.predicate, riskLevel);
    const triggeredByTermName = termMap.get(fact.triggeredByTermId) ?? fact.subject;

    const scored: ScoredFact = {
      factId:             fact.factId,
      factType:           fact.factType,
      subject:            fact.subject,
      subjectType:        fact.subjectType,
      predicate:          fact.predicate,
      object:             fact.object,
      objectType:         fact.objectType,
      qualifier:          fact.qualifier,
      confidence:         fact.confidence,
      extractionMethod:   fact.extractionMethod,
      baseScore,
      finalScore,
      riskLevel,
      bucket,
      triggeredByTermId:  fact.triggeredByTermId,
      triggeredByTermName,
      sourceChunkId:      fact.chunkId,
    };

    buckets[bucket].push(scored);
  }

  // Tri par finalScore décroissant dans chaque bucket
  for (const key of Object.keys(buckets) as AnalysisBucket[]) {
    buckets[key].sort((a, b) => b.finalScore - a.finalScore);
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Chunk refs
// ---------------------------------------------------------------------------

/**
 * Convertit les ChunkMatchResult de Phase 6 en ChunkRef simples.
 * Les doublons (même chunkId) sont dédupliqués — fact_relation prioritaire.
 */
export function buildChunkRefs(chunks: ChunkMatchResult[]): ChunkRef[] {
  const seen = new Set<string>();
  const refs: ChunkRef[] = [];

  // fact_relation en premier pour la priorité de déduplication
  const sorted = [...chunks].sort((a, b) =>
    a.matchSource === "fact_relation" ? -1 : b.matchSource === "fact_relation" ? 1 : 0
  );

  for (const c of sorted) {
    if (seen.has(c.chunkId)) continue;
    seen.add(c.chunkId);
    refs.push({
      chunkId:    c.chunkId,
      documentId: c.documentId,
      drugKey:    c.drugKey,
      kind:       c.kind,
      label:      c.label,
      matchSource: c.matchSource,
      score:      c.score,
    });
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * Construit le résumé de l'analyse à partir des buckets et du contexte matching.
 */
export function buildAnalysisSummary(
  buckets: AggregatedBuckets,
  termsMatched: TermMatchResult[],
  termsUnmatched: { rawInput: string }[],
  semanticUsed: boolean
): AnalysisSummary {
  const allFacts = [
    ...buckets.alert,
    ...buckets.interaction,
    ...buckets.warning,
    ...buckets.depletion,
    ...buckets.contextual,
    ...buckets.low_signal,
  ];

  let highestRisk: RiskLevel | null = null;
  for (const f of allFacts) {
    highestRisk = higherRisk(highestRisk, f.riskLevel);
  }

  return {
    termsRecognized:   termsMatched.length,
    termsUnrecognized: termsUnmatched.length,
    totalFacts:        allFacts.length,
    alertCount:        buckets.alert.length,
    interactionCount:  buckets.interaction.length,
    warningCount:      buckets.warning.length,
    depletionCount:    buckets.depletion.length,
    contextualCount:   buckets.contextual.length,
    lowSignalCount:    buckets.low_signal.length,
    highestRisk,
    semanticUsed,
  };
}
