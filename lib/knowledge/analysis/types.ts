/**
 * Contrats TypeScript pour la couche d'analyse déterministe (Phase 7).
 *
 * Hiérarchie de criticité :
 *   CRITICAL > HIGH > MEDIUM > LOW > INFORMATIONAL
 *
 * Buckets de sortie :
 *   alert          — contre-indications formelles (CRITICAL)
 *   interaction    — interactions médicamenteuses/substances (HIGH)
 *   warning        — vigilances et risques augmentés (HIGH-MEDIUM)
 *   depletion      — déplétions nutritionnelles (MEDIUM)
 *   contextual     — contexte utile, non actionnable immédiatement
 *   low_signal     — signal faible ou en dessous du seuil
 *
 * Traçabilité obligatoire sur chaque ScoredFact :
 *   factId, triggeredByTermId/Name, sourceChunkId, riskLevel, bucket, finalScore
 */

import type { FactType, FactPredicate, TermType, ExtractionMethod } from "@prisma/client";
import type { ChunkMatchSource, TermMatchResult, TermNoMatch } from "../matching/types";

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export type AnalysisBucket =
  | "alert"
  | "interaction"
  | "warning"
  | "depletion"
  | "contextual"
  | "low_signal";

// ---------------------------------------------------------------------------
// Scored fact
// ---------------------------------------------------------------------------

/**
 * Un KnowledgeFact enrichi de son score métier, niveau de risque et bucket.
 * Représente la sortie atomique de l'analyse déterministe.
 */
export interface ScoredFact {
  // Identité
  factId: string;

  // Données du fait
  factType: FactType;
  subject: string;
  subjectType: TermType;
  predicate: FactPredicate;
  object: string;
  objectType: TermType;
  qualifier: string | null;
  confidence: number;
  extractionMethod: ExtractionMethod;

  // Scoring
  /** Poids brut du prédicat (0.0–1.0), indépendant de la confidence. */
  baseScore: number;
  /** Score final = baseScore × confidence × extractionMultiplier */
  finalScore: number;
  riskLevel: RiskLevel;
  bucket: AnalysisBucket;

  // Traçabilité
  triggeredByTermId: string;
  /** Nom canonique du terme qui a déclenché ce fait. */
  triggeredByTermName: string;
  sourceChunkId: string;
}

// ---------------------------------------------------------------------------
// Chunk reference
// ---------------------------------------------------------------------------

export interface ChunkRef {
  chunkId: string;
  documentId: string;
  drugKey: string;
  kind: string;
  label: string;
  matchSource: ChunkMatchSource;
  /** Score cosinus — uniquement si matchSource === "semantic". */
  score?: number;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface AnalysisSummary {
  termsRecognized: number;
  termsUnrecognized: number;
  totalFacts: number;
  alertCount: number;
  interactionCount: number;
  warningCount: number;
  depletionCount: number;
  contextualCount: number;
  lowSignalCount: number;
  /** Niveau de risque le plus élevé parmi tous les faits scorés. null si aucun fait. */
  highestRisk: RiskLevel | null;
  semanticUsed: boolean;
}

// ---------------------------------------------------------------------------
// Final result
// ---------------------------------------------------------------------------

export interface AnalysisError {
  context: string;
  error: string;
}

export interface AnalysisResult {
  alerts: ScoredFact[];
  interactions: ScoredFact[];
  warnings: ScoredFact[];
  depletions: ScoredFact[];
  contextual_notes: ScoredFact[];
  low_signal: ScoredFact[];
  /** Chunks sources — fact_relation d'abord, semantic en complément. */
  supporting_chunks: ChunkRef[];
  summary: AnalysisSummary;
  /** Termes de la consultation reconnus (passés en matching). */
  termsMatched: TermMatchResult[];
  /** Termes de la consultation non reconnus (rejetés). */
  termsUnmatched: TermNoMatch[];
  durationMs: number;
  errors: AnalysisError[];
}

export interface AnalysisBatchResult {
  totalConsultations: number;
  successCount: number;
  errorCount: number;
  results: AnalysisResult[];
  errors: AnalysisError[];
  durationMs: number;
}
