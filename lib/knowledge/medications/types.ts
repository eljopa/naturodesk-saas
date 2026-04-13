/**
 * Contrats TypeScript pour le moteur d'analyse médicaments.
 *
 * Modélisé sur la couche supplements V2, simplifié (pas de variantes galéniques).
 */

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Résultat du parser riche pour une saisie de médicament.
 * Toutes les valeurs extraites sont optionnelles.
 * rawText est toujours conservé intégralement.
 */
export interface ParsedMedicationIntake {
  rawText: string;

  // ── Nom nettoyé ────────────────────────────────────────────────────────
  parsedLabel:     string | null;  // DCI nettoyée après suppression forme/dose/timing
  parsedBrandName: string | null;  // nom de marque entre parenthèses
  normalizedKey:   string | null;  // clé pivot pour le matching

  // ── Dose ──────────────────────────────────────────────────────────────
  doseValue: number | null;  // ex: 500 (pour "500 mg")
  doseUnit:  string | null;  // ex: "mg", "mcg", "g", "UI"

  // ── Contexte ──────────────────────────────────────────────────────────
  frequencyText: string | null;  // ex: "1 comprimé matin et soir"
  durationText:  string | null;  // ex: "pendant 3 mois"
  galenicForm:   string | null;  // ex: "comprimé", "gélule", "sirop"

  // ── Qualité ───────────────────────────────────────────────────────────
  parseStatus:     "PARSED" | "PARTIAL" | "UNRESOLVED";
  parseConfidence: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Intake parsé + résolution complète (KnowledgeTerm + BDPM).
 * Utilisé en mémoire dans le runner, avant persistance.
 */
export interface MedicationIntakeWithResolution extends ParsedMedicationIntake {
  // ── Résolution KnowledgeTerm ──────────────────────────────────────────────
  knowledgeTermId:      string | null;
  canonicalName:        string | null;  // KnowledgeTerm.canonicalName résolu
  resolutionConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";

  // ── Résolution BDPM (Phase B) ─────────────────────────────────────────────
  drugProductId:   string | null;  // DrugProduct résolu (spécialité)
  drugSubstanceId: string | null;  // DrugSubstance résolue (DCI)
}

// ---------------------------------------------------------------------------
// Runner summary
// ---------------------------------------------------------------------------

export interface MedicationRunSummary {
  consultationId:  string;
  inputCount:      number;  // médicaments saisis
  matchedCount:    number;  // termes DRUG reconnus
  unmatchedCount:  number;  // termes non reconnus
  intakesCreated:  number;  // ConsultationMedicationIntake créés
  durationMs:      number;
  errors:          Array<{ context: string; error: string }>;
}
