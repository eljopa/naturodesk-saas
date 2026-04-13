/**
 * Contrats TypeScript de la couche API knowledge (Phase 8).
 *
 * Sépare les types de réponse HTTP des types internes du moteur de matching.
 * La réponse JSON est stable, directement consommable par un client ou une UI.
 *
 * Distinct de lib/analysis/types.ts qui appartient au runner LLM existant.
 */

import type { RiskLevel, ScoredFact, ChunkRef, AnalysisError } from "@/lib/knowledge/analysis/types";
import type { TermMatchMethod } from "@/lib/knowledge/matching/types";
import type { TermType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Input validé (après passage par Zod)
// ---------------------------------------------------------------------------

export interface KnowledgeAnalysisInput {
  medications: string[];
  supplements: string[];
  nutrients: string[];
  symptoms: string[];
  context?: string;
  includeSemanticComplement: boolean;
}

// ---------------------------------------------------------------------------
// Résumé des termes pour la réponse (projection légère)
// ---------------------------------------------------------------------------

export interface TermMatchSummary {
  rawInput: string;
  canonicalName: string;
  termType: TermType;
  matchMethod: TermMatchMethod;
}

export interface TermNoMatchSummary {
  rawInput: string;
  reason: "not_found";
}

// ---------------------------------------------------------------------------
// Réponse API complète
// ---------------------------------------------------------------------------

export interface KnowledgeAnalysisResponse {
  normalizedInput: {
    medications: string[];
    supplements: string[];
    nutrients: string[];
    symptoms: string[];
  };
  termMatches: {
    recognized: TermMatchSummary[];
    unrecognized: TermNoMatchSummary[];
  };
  analysis: {
    alerts: ScoredFact[];
    interactions: ScoredFact[];
    warnings: ScoredFact[];
    depletions: ScoredFact[];
    contextual_notes: ScoredFact[];
    low_signal: ScoredFact[];
  };
  supportingChunks: ChunkRef[];
  meta: {
    highestRisk: RiskLevel | null;
    totalFacts: number;
    semanticUsed: boolean;
    durationMs: number;
    termsRecognized: number;
    termsUnrecognized: number;
    errors: AnalysisError[];
  };
}
