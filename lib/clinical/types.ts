/**
 * lib/clinical/types.ts
 *
 * Interfaces internes du moteur d'analyse clinique V1.
 * Ces types sont privés à lib/clinical/ — ne pas exporter depuis un index public.
 */

import type {
  AnalysisTier,
  ClinicalEvidenceLevel,
  EffectTemporality,
  SideEffectFrequency,
  SideEffectSeverity,
  DrugEffectType,
  SymptomCategory,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Médicament déclaré par le praticien — input brut de l'API. */
export interface DrugInput {
  name: string;
  dosage?: string;
  startedAt?: string | Date; // ISO ou Date — pour le calcul de temporalité
  stoppedAt?: string | Date; // null = traitement en cours
  resolvedSubstanceId?: string; // si déjà résolu côté appelant
}

/** Payload complet pour lancer une analyse clinique. */
export interface ClinicalAnalysisInput {
  userId: string;
  consultationId?: string;
  rawSymptoms: string; // texte brut tel que saisi
  drugs: DrugInput[];
  assessedAt?: Date; // défaut: now()
}

// ---------------------------------------------------------------------------
// Normalisation des symptômes
// ---------------------------------------------------------------------------

/** Résultat du matching texte libre → SymptomTerm. */
export interface SymptomMatch {
  rawFragment: string; // fragment texte original
  symptomTermId: string | null; // null si hors catalogue
  normalizedKey: string | null;
  label: string | null;
  category: SymptomCategory | null;
  matchBasis: "exact_key" | "label" | "synonym" | "none";
}

// ---------------------------------------------------------------------------
// Résolution des médicaments
// ---------------------------------------------------------------------------

/** Effet indésirable d'une substance active — chargé depuis DrugSideEffect. */
export interface LoadedSideEffect {
  id: string;
  symptomTermId: string;
  symptomLabel: string;
  effectType: DrugEffectType;
  frequency: SideEffectFrequency;
  severity: SideEffectSeverity;
  temporality: EffectTemporality;
  evidenceLevel: ClinicalEvidenceLevel;
  sourceId: string;
  sourceShortLabel: string;
  mechanism: string | null;
}

/** Déplétion nutritionnelle d'une substance — chargée depuis DrugNutrientDepletion. */
export interface LoadedDepletion {
  id: string;
  nutrient: string;
  nutrientKey: string;
  mechanism: string;
  evidenceLevel: ClinicalEvidenceLevel;
  sourceId: string;
  sourceShortLabel: string;
  symptomIds: string[]; // IDs des SymptomTerm liés via NutrientDepletionSymptom
}

/** Substance active avec effets et déplétions pré-chargés. */
export interface ResolvedDrug {
  input: DrugInput;
  substanceId: string;
  normalizedKey: string;
  canonicalName: string;
  sideEffects: LoadedSideEffect[];
  depletions: LoadedDepletion[];
  unresolved: false;
}

/** Médicament non résolu (substance non trouvée en DB). */
export interface UnresolvedDrug {
  input: DrugInput;
  unresolved: true;
  reason: string;
}

export type DrugResolution = ResolvedDrug | UnresolvedDrug;

// ---------------------------------------------------------------------------
// Matching structuré
// ---------------------------------------------------------------------------

/** Match Tier 1 ou Tier 2 via DrugSideEffect. */
export interface SideEffectMatch {
  type: "SIDE_EFFECT";
  tier: "TIER_1_DIRECT" | "TIER_2_INDIRECT";
  symptomMatch: SymptomMatch;
  drug: ResolvedDrug;
  sideEffect: LoadedSideEffect;
}

/** Match Tier 2 via DrugNutrientDepletion. */
export interface DepletionMatch {
  type: "DEPLETION";
  tier: "TIER_2_INDIRECT";
  symptomMatch: SymptomMatch;
  drug: ResolvedDrug;
  depletion: LoadedDepletion;
}

/** Symptôme sans correspondance structurée (hors catalogue ou aucun drug lié). */
export interface UnmatchedSymptom {
  type: "UNMATCHED";
  tier: "TIER_4_UNMATCHED";
  symptomMatch: SymptomMatch;
}

export type RawMatch = SideEffectMatch | DepletionMatch | UnmatchedSymptom;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Item scoré, prêt pour la corroboration puis la persistance. */
export interface ScoredItem {
  tier: AnalysisTier;

  // Symptôme
  symptomTermId: string | null;       // null si hors catalogue (TIER_4 sans match terme)
  rawSymptomFragment: string | null;  // fragment brut si hors catalogue

  // Substance et sources primaires (mutuellement exclusifs sideEffectId / nutrientDepletionId)
  drugSubstanceId: string | null;
  sideEffectId: string | null;
  nutrientDepletionId: string | null;

  // Corroboration — rempli par corroborate.ts
  knowledgeFactId: string | null;

  // Scoring multi-facteurs — tous persistés pour audit complet
  confidenceScore: number;
  frequencyFactor: number;
  evidenceCeiling: number;
  temporalModifier: number;
  corroborationBoost: number;

  // Contexte dénormalisé — utilisé pour la synthèse, non persisté
  _meta: {
    substanceKey?: string;
    substanceName?: string;
    symptomLabel?: string | null;
    nutrientLabel?: string;
    sourceShortLabel?: string;
    effectType?: DrugEffectType;
    mechanism?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Output public
// ---------------------------------------------------------------------------

export interface ClinicalAnalysisResult {
  analysisId: string;
  status: "DONE" | "FAILED";
  itemCount: number;
  tier1Count: number;
  tier2Count: number;
  tier4Count: number;
  unresolvedDrugs: string[];
  unmatchedSymptoms: string[];
  summary: string;
  durationMs: number;
}
