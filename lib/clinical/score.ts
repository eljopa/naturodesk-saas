/**
 * lib/clinical/score.ts
 *
 * Étape 4 du pipeline : calcule les facteurs de score pour chaque RawMatch
 * et produit le ScoredItem final.
 *
 * Formule V2.1 (auditée et persistée intégralement) :
 *   confidenceScore = clamp(frequencyFactor + temporalModifier + corroborationBoost, 0, evidenceCeiling)
 *
 * Facteurs :
 *   frequencyFactor   — base SideEffectFrequency (Tier 1/2) ou DEPLETION_BASE (Tier 2 dépletion)
 *   evidenceCeiling   — plafond dur ClinicalEvidenceLevel — ne peut jamais être dépassé
 *   temporalModifier  — +0.05 si cohérent / 0.00 si inconnu / -0.15 si incohérent
 *   corroborationBoost — 0.00 ici, rempli par corroborate.ts
 *
 * Note sur la temporalité :
 *   - Médicament en cours + temporalité connue (non WITHDRAWAL) → +0.05
 *   - Médicament arrêté + temporalité WITHDRAWAL → +0.05
 *   - Médicament arrêté + temporalité non WITHDRAWAL → -0.15 (signal incohérent fort)
 *   - UNKNOWN dans tous les cas → 0.00
 */

import type {
  ClinicalEvidenceLevel,
  EffectTemporality,
  SideEffectFrequency,
} from "@prisma/client";
import type { DrugInput, RawMatch, ScoredItem } from "./types";

// ---------------------------------------------------------------------------
// Tables de conversion (publicisées pour les tests)
// ---------------------------------------------------------------------------

export const FREQUENCY_FACTOR: Record<SideEffectFrequency, number> = {
  VERY_COMMON: 0.85,
  COMMON:      0.70,
  UNCOMMON:    0.45,
  RARE:        0.25,
  VERY_RARE:   0.15,
  UNKNOWN:     0.35,
};

export const EVIDENCE_CEILING: Record<ClinicalEvidenceLevel, number> = {
  RCP_ANSM:          0.90,
  HAS_GUIDELINE:     0.85,
  SYSTEMATIC_REVIEW: 0.80,
  CLINICAL_STUDY:    0.75,
  EXPERT_CONSENSUS:  0.60,
  CASE_REPORTS:      0.50,
};

/**
 * Facteur de base pour les déplétions nutritionnelles.
 * Il n'existe pas de "fréquence" au sens RCP pour une déplétion —
 * on utilise le niveau de preuve pour calibrer la base, plus conservative
 * que pour les effets directs.
 */
export const DEPLETION_BASE_FACTOR: Record<ClinicalEvidenceLevel, number> = {
  RCP_ANSM:          0.70,
  HAS_GUIDELINE:     0.65,
  SYSTEMATIC_REVIEW: 0.60,
  CLINICAL_STUDY:    0.55,
  EXPERT_CONSENSUS:  0.45,
  CASE_REPORTS:      0.30,
};

// ---------------------------------------------------------------------------
// Calcul du temporalModifier
// ---------------------------------------------------------------------------

/**
 * Retourne le modificateur de temporalité.
 *
 * Si pas d'information de date disponible (pas de stoppedAt, UNKNOWN) → 0.00.
 * La présence ou absence de stoppedAt est la seule information dont on dispose.
 */
export function computeTemporalModifier(
  temporality: EffectTemporality,
  drugInput: DrugInput,
): number {
  if (temporality === "UNKNOWN") return 0.00;

  const isCurrentlyTaking = !drugInput.stoppedAt;

  if (isCurrentlyTaking) {
    // Médicament actif : WITHDRAWAL serait incohérent
    return temporality === "WITHDRAWAL" ? -0.15 : +0.05;
  } else {
    // Médicament arrêté : seul WITHDRAWAL reste cohérent
    return temporality === "WITHDRAWAL" ? +0.05 : -0.15;
  }
}

// ---------------------------------------------------------------------------
// Utilitaire
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Scoring principal
// ---------------------------------------------------------------------------

export function scoreMatches(rawMatches: RawMatch[]): ScoredItem[] {
  const items: ScoredItem[] = [];

  for (const match of rawMatches) {
    // ── Tier 4 : non matché ────────────────────────────────────────────────
    if (match.type === "UNMATCHED") {
      items.push({
        tier: "TIER_4_UNMATCHED",
        symptomTermId:      match.symptomMatch.symptomTermId,
        // rawFragment conservé si hors catalogue, null si symptôme connu sans drug
        rawSymptomFragment: match.symptomMatch.symptomTermId
          ? null
          : match.symptomMatch.rawFragment,
        drugSubstanceId:    null,
        sideEffectId:       null,
        nutrientDepletionId: null,
        knowledgeFactId:    null,
        confidenceScore:    0.0,
        frequencyFactor:    0.0,
        evidenceCeiling:    0.0,
        temporalModifier:   0.0,
        corroborationBoost: 0.0,
        _meta: {
          symptomLabel: match.symptomMatch.label ?? match.symptomMatch.rawFragment,
        },
      });
      continue;
    }

    // ── Tier 1 / Tier 2 via DrugSideEffect ────────────────────────────────
    if (match.type === "SIDE_EFFECT") {
      const se                = match.sideEffect;
      const frequencyFactor   = FREQUENCY_FACTOR[se.frequency];
      const evidenceCeiling   = EVIDENCE_CEILING[se.evidenceLevel];
      const temporalModifier  = computeTemporalModifier(se.temporality, match.drug.input);
      const corroborationBoost = 0.0;

      const confidenceScore = clamp(
        frequencyFactor + temporalModifier + corroborationBoost,
        0.0,
        evidenceCeiling,
      );

      items.push({
        tier:               match.tier,
        symptomTermId:      match.symptomMatch.symptomTermId,
        rawSymptomFragment: null,
        drugSubstanceId:    match.drug.substanceId,
        sideEffectId:       se.id,
        nutrientDepletionId: null,
        knowledgeFactId:    null,
        confidenceScore,
        frequencyFactor,
        evidenceCeiling,
        temporalModifier,
        corroborationBoost,
        _meta: {
          substanceKey:     match.drug.normalizedKey,
          substanceName:    match.drug.canonicalName,
          symptomLabel:     match.symptomMatch.label,
          sourceShortLabel: se.sourceShortLabel,
          effectType:       se.effectType,
          mechanism:        se.mechanism,
        },
      });
      continue;
    }

    // ── Tier 2 via DrugNutrientDepletion ──────────────────────────────────
    if (match.type === "DEPLETION") {
      const dep               = match.depletion;
      const frequencyFactor   = DEPLETION_BASE_FACTOR[dep.evidenceLevel];
      const evidenceCeiling   = EVIDENCE_CEILING[dep.evidenceLevel];
      // Déplétions sont par nature CHRONIC — si le médicament est en cours → cohérent
      const temporalModifier  = computeTemporalModifier("CHRONIC", match.drug.input);
      const corroborationBoost = 0.0;

      const confidenceScore = clamp(
        frequencyFactor + temporalModifier + corroborationBoost,
        0.0,
        evidenceCeiling,
      );

      items.push({
        tier:               "TIER_2_INDIRECT",
        symptomTermId:      match.symptomMatch.symptomTermId,
        rawSymptomFragment: null,
        drugSubstanceId:    match.drug.substanceId,
        sideEffectId:       null,
        nutrientDepletionId: dep.id,
        knowledgeFactId:    null,
        confidenceScore,
        frequencyFactor,
        evidenceCeiling,
        temporalModifier,
        corroborationBoost,
        _meta: {
          substanceKey:     match.drug.normalizedKey,
          substanceName:    match.drug.canonicalName,
          symptomLabel:     match.symptomMatch.label,
          nutrientLabel:    dep.nutrient,
          sourceShortLabel: dep.sourceShortLabel,
          mechanism:        dep.mechanism,
        },
      });
    }
  }

  return items;
}
