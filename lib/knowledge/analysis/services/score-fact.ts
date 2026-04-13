/**
 * Scoring métier d'un KnowledgeFact.
 *
 * scoreMatchedFact() calcule :
 *   baseScore    — poids du prédicat, table figée (déterministe)
 *   finalScore   — baseScore × confidence × extractionMultiplier
 *   riskLevel    — dérivé du finalScore + règle spéciale CONTRAINDICATED_WITH
 *
 * Table de poids des prédicats (décision métier v1) :
 *   CONTRAINDICATED_WITH  → 1.00  (toujours CRITICAL)
 *   INTERACTS_WITH        → 0.85
 *   REDUCES_EFFICACY_OF   → 0.80
 *   POTENTIATES           → 0.80
 *   INHIBITS              → 0.75
 *   INCREASES_RISK_OF     → 0.72
 *   REQUIRES_MONITORING_WITH → 0.65
 *   DEPLETES              → 0.60
 *   CAUSES                → 0.45
 *   TREATS                → 0.20
 *
 * Seuils de criticité :
 *   CRITICAL      finalScore ≥ 0.95  OU  predicate === CONTRAINDICATED_WITH
 *   HIGH          finalScore ≥ 0.70
 *   MEDIUM        finalScore ≥ 0.50
 *   LOW           finalScore ≥ 0.25
 *   INFORMATIONAL finalScore < 0.25
 *
 * Multiplicateur extraction :
 *   DETERMINISTIC  → 1.00
 *   LLM_ASSISTED   → 0.85
 */

import type { FactPredicate, ExtractionMethod } from "@prisma/client";
import type { FactMatchResult } from "../../matching/types";
import type { RiskLevel } from "../types";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const PREDICATE_BASE_SCORES: Record<FactPredicate, number> = {
  CONTRAINDICATED_WITH:       1.00,
  INTERACTS_WITH:             0.85,
  REDUCES_EFFICACY_OF:        0.80,
  POTENTIATES:                0.80,
  INHIBITS:                   0.75,
  INCREASES_RISK_OF:          0.72,
  REQUIRES_MONITORING_WITH:   0.65,
  DEPLETES:                   0.60,
  CAUSES:                     0.45,
  TREATS:                     0.20,
};

const EXTRACTION_MULTIPLIERS: Record<ExtractionMethod, number> = {
  DETERMINISTIC: 1.00,
  LLM_ASSISTED:  0.85,
};

// ---------------------------------------------------------------------------
// Risk level derivation
// ---------------------------------------------------------------------------

function deriveRiskLevel(finalScore: number, predicate: FactPredicate): RiskLevel {
  if (predicate === "CONTRAINDICATED_WITH" || finalScore >= 0.95) return "CRITICAL";
  if (finalScore >= 0.70) return "HIGH";
  if (finalScore >= 0.50) return "MEDIUM";
  if (finalScore >= 0.25) return "LOW";
  return "INFORMATIONAL";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ScoreResult {
  baseScore: number;
  finalScore: number;
  riskLevel: RiskLevel;
}

/**
 * Calcule le score métier d'un KnowledgeFact matché.
 * Retourne baseScore, finalScore arrondi à 4 décimales, et riskLevel.
 */
export function scoreMatchedFact(fact: FactMatchResult): ScoreResult {
  const baseScore = PREDICATE_BASE_SCORES[fact.predicate] ?? 0.10;
  const extractionMultiplier = EXTRACTION_MULTIPLIERS[fact.extractionMethod] ?? 0.80;
  const rawFinalScore = baseScore * fact.confidence * extractionMultiplier;
  const finalScore = Math.round(rawFinalScore * 10000) / 10000;

  return {
    baseScore,
    finalScore,
    riskLevel: deriveRiskLevel(finalScore, fact.predicate),
  };
}
