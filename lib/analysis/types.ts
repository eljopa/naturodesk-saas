export type FindingCategoryType =
  | "SIDE_EFFECT"
  | "INTERACTION"
  | "DEPLETION"
  | "RED_FLAG"
  | "TERRAIN"
  | "PROTOCOL"
  | "QUESTION";

export type MedLoadLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ---------------------------------------------------------------------------
// Snapshot passed to rules engine and OpenAI
// ---------------------------------------------------------------------------

export interface MedicationEntry {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  drugKey: string | null;
}

export interface SymptomEntry {
  label: string;
  intensity: number | null;
  duration: string | null;
  category: string | null;
}

export interface SupplementEntry {
  name: string;
  dosage: string | null;
  duration: string | null;
}

export interface ConsultationSnapshot {
  id: string;
  context: string | null;
  symptoms: SymptomEntry[];
  medications: MedicationEntry[];
  supplements: SupplementEntry[];
}

// ---------------------------------------------------------------------------
// Rules engine output
// ---------------------------------------------------------------------------

export interface RuleResult {
  ruleCode: string;
  matched: boolean;
  finding?: {
    category: FindingCategoryType;
    title: string;
    description: string;
    confidence: number;
  };
  evidence: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OpenAI output
// ---------------------------------------------------------------------------

/**
 * Niveau de traçabilité d'un finding LLM.
 * DOCUMENTED : appuyé par un fait ou chunk BDPM/documentaire présent dans le contexte.
 * SIGNAL     : indice clinique plausible, non formellement documenté dans le contexte injecté.
 * HYPOTHESIS : vigilance ou hypothèse d'interprétation — à confirmer par le praticien.
 */
export type FindingEvidenceLevel = "DOCUMENTED" | "SIGNAL" | "HYPOTHESIS";

export interface LLMFinding {
  category:       FindingCategoryType;
  title:          string;
  description:    string;
  confidence:     number;
  evidenceLevel?: FindingEvidenceLevel;  // tracé depuis le LLM
  sourceRefs?:    string[];              // références libres (ex: "Paracétamol BDPM", "règle statines")
}

export interface LLMResult {
  findings: LLMFinding[];
  medicationLoadLevel: MedLoadLevel;
  medicationLoadScore: number;
  terrainSummary: string | null;
  tokensUsed: number;
}
