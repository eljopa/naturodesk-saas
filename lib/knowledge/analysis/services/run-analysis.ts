/**
 * Orchestrateur de l'analyse déterministe (Phase 7).
 *
 * runDeterministicAnalysis() :
 *   Prend un SecureMatchResult (Phase 6) et produit un AnalysisResult structuré.
 *
 * Pipeline interne :
 *   1. Construit la map termId → canonicalName pour la traçabilité
 *   2. aggregateMatchedResults() — score + classify + distribution en buckets
 *   3. buildChunkRefs()          — normalisation des chunks sources
 *   4. buildAnalysisSummary()    — compteurs et niveau de risque maximal
 *
 * Purement synchrone et déterministe — aucun appel réseau, aucune écriture en base.
 */

import { aggregateMatchedResults, buildChunkRefs, buildAnalysisSummary } from "./aggregate";
import type { SecureMatchResult } from "../../matching/types";
import type { AnalysisResult, AnalysisError } from "../types";

/**
 * Analyse déterministe d'un résultat de matching sécurisé.
 * Retourne les faits classifiés, les buckets, le résumé et les chunks sources.
 */
export function runDeterministicAnalysis(
  matchResult: SecureMatchResult
): AnalysisResult {
  const startedAt = Date.now();
  const errors: AnalysisError[] = [];

  // --- Étape 1 : map termId → canonicalName ---
  const termMap = new Map<string, string>(
    matchResult.termsMatched.map((t) => [t.termId, t.canonicalName])
  );

  console.log(
    `[analysis] ▶ ${matchResult.facts.length} fait(s) à analyser, ` +
      `${matchResult.termsMatched.length} terme(s) reconnu(s)`
  );

  // --- Étape 2 : score + classify + agrégation ---
  const buckets = aggregateMatchedResults(matchResult.facts, termMap);

  // --- Étape 3 : chunk refs ---
  const supporting_chunks = buildChunkRefs(matchResult.chunks);

  // --- Étape 4 : summary ---
  const summary = buildAnalysisSummary(
    buckets,
    matchResult.termsMatched,
    matchResult.termsUnmatched,
    matchResult.semanticUsed
  );

  const durationMs = Date.now() - startedAt;

  console.log(
    `[analysis] ✓ Terminé — alerts=${summary.alertCount} interactions=${summary.interactionCount} ` +
      `warnings=${summary.warningCount} depletions=${summary.depletionCount} ` +
      `contextual=${summary.contextualCount} lowSignal=${summary.lowSignalCount} ` +
      `highestRisk=${summary.highestRisk ?? "none"} durée=${durationMs}ms`
  );

  return {
    alerts:          buckets.alert,
    interactions:    buckets.interaction,
    warnings:        buckets.warning,
    depletions:      buckets.depletion,
    contextual_notes: buckets.contextual,
    low_signal:      buckets.low_signal,
    supporting_chunks,
    summary,
    termsMatched:    matchResult.termsMatched,
    termsUnmatched:  matchResult.termsUnmatched,
    durationMs,
    errors,
  };
}
