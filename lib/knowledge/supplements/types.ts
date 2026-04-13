/**
 * Contrats TypeScript pour le moteur d'analyse supplements (V1 + V2 structuré).
 *
 * V1 — analyse ODS générale :
 *   - OdsChunkData, OdsEnrichment, OdsEnrichmentMap
 *   - SupplementRunSummary
 *
 * V2 — prise clinique structurée :
 *   - ParsedSupplementIntake    — sortie du parser riche
 *   - IntakeParseStatus         — qualité du parsing
 *   - IntakeConfidence          — niveau de confiance global
 *   - IntakeSourceType          — origine de la valeur
 *   - IntakeWithResolution      — intake parsé + term/variante résolus
 */

// ---------------------------------------------------------------------------
// ODS enrichment (V1 inchangé)
// ---------------------------------------------------------------------------

/** Un chunk ODS récupéré pour un terme, tel que stocké dans knowledge_chunks. */
export interface OdsChunkData {
  chunkId: string;
  /** "warning" | "interaction" | "dosage" | "indication" | "general" */
  kind: string;
  label: string;
  /** Extrait textuel (brut, 50–4000 chars). */
  excerpt: string;
  drugKey: string;
}

/** Enrichissement ODS complet pour un KnowledgeTerm. */
export interface OdsEnrichment {
  termId:        string;
  normalizedKey: string;
  canonicalName: string;
  warnings:      OdsChunkData[];
  interactions:  OdsChunkData[];
  dosageNotes:   OdsChunkData[];
  indications:   OdsChunkData[];
  /** true si au moins un chunk ODS existe pour ce terme. */
  hasOdsData: boolean;
}

/** Map termId → OdsEnrichment. */
export type OdsEnrichmentMap = Map<string, OdsEnrichment>;

// ---------------------------------------------------------------------------
// Structured intake parsing (V2)
// ---------------------------------------------------------------------------

/**
 * Statut de parsing d'une prise clinique structurée.
 *   PARSED     — label + au moins un composant de dose extraits
 *   PARTIAL    — label extrait, dose partielle ou manquante
 *   UNRESOLVED — terme parent non reconnu dans la base de connaissance
 */
export type IntakeParseStatus = "PARSED" | "PARTIAL" | "UNRESOLVED";

/**
 * Confiance de l'extraction textuelle (parseConfidence).
 *   HIGH   — label + dose + fréquence tous présents, sans ambiguïté
 *   MEDIUM — label + dose partielle ou fréquence inférée
 *   LOW    — parsing minimal ou fortement ambigu
 */
export type IntakeConfidence = "HIGH" | "MEDIUM" | "LOW";

/**
 * Confiance de la résolution du terme (resolutionConfidence).
 *   HIGH   — match via alias_dictionary ou exact_key (clé normalisée exacte)
 *   MEDIUM — match via alias_db ILIKE (moins fiable, orthographe approximative)
 *   LOW    — match partiel ou ambigu (réservé pour extension future)
 *   NONE   — terme non reconnu dans la base de connaissance
 */
export type ResolutionConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

/**
 * Origine de la valeur.
 *   PARSED   — extraite du texte libre
 *   MANUAL   — saisie structurée directe (future UI)
 *   INFERRED — calculée à partir d'autres champs
 */
export type IntakeSourceType = "PARSED" | "MANUAL" | "INFERRED";

/**
 * Résultat du parser riche pour une saisie de supplément.
 *
 * Toutes les valeurs extraites sont optionnelles.
 * rawText est toujours conservé intégralement.
 */
export interface ParsedSupplementIntake {
  rawText:      string;

  // ── Nom nettoyé ────────────────────────────────────────────────────────
  parsedLabel:  string | null;   // après suppression dosage/forme/timing
  normalizedKey: string | null;  // clé pivot pour le matching

  // ── Dose par unité ────────────────────────────────────────────────────
  dosePerUnitValue: number | null;   // ex: 200 (pour "200 mg")
  dosePerUnitUnit:  string | null;   // ex: "mg", "UI", "g"
  unitsPerIntake:   number | null;   // ex: 1 (pour "1 gélule")
  intakesPerDay:    number | null;   // ex: 2 (pour "matin et soir")

  // ── Dose journalière ─────────────────────────────────────────────────
  declaredDailyDoseValue:  number | null; // explicite dans le texte ("300mg/jour")
  declaredDailyDoseUnit:   string | null;
  estimatedDailyDoseValue: number | null; // calculé ou = déclaré
  estimatedDailyDoseUnit:  string | null;

  // ── Contexte de prise ─────────────────────────────────────────────────
  timingText:    string | null;   // ex: "matin", "matin et soir"
  frequencyText: string | null;   // ex: "2x/jour"
  durationText:  string | null;   // ex: "pendant 3 mois"

  // ── Qualité ───────────────────────────────────────────────────────────
  parseStatus:     IntakeParseStatus;
  /** Qualité de l'extraction textuelle (label, dose, fréquence). */
  parseConfidence: IntakeConfidence;
}

/**
 * Intake parsé + identifiants résolus (après matching + résolution variante).
 * Utilisé en mémoire dans le runner, avant persistance.
 */
export interface IntakeWithResolution extends ParsedSupplementIntake {
  knowledgeTermId:        string | null;
  knowledgeTermVariantId: string | null;
  // Données dénormalisées pour le générateur de findings (évite des requêtes supplémentaires)
  canonicalName:          string | null;  // KnowledgeTerm.canonicalName
  variantLabel:           string | null;  // KnowledgeTermVariant.label
  variantType:            string | null;  // KnowledgeTermVariant.variantType
  variantNotes:           string | null;  // KnowledgeTermVariant.notes
  /** Qualité du matching terme : HIGH (exact/alias_dict) | MEDIUM (alias_db) | NONE (non résolu). */
  resolutionConfidence:   ResolutionConfidence;
}

// ---------------------------------------------------------------------------
// Supplement run summary (V1 + nouveaux champs V2)
// ---------------------------------------------------------------------------

export interface SupplementRunSummary {
  consultationId:        string;
  analysisRunId:         string;
  inputCount:            number;   // suppléments saisis
  matchedCount:          number;   // termes parents reconnus
  unmatchedCount:        number;   // termes non reconnus
  withOdsCount:          number;   // termes avec données ODS
  duplicateCount:        number;   // ingrédients parents dupliqués
  variantsResolvedCount: number;   // variantes reconnues (V2)
  intakesCreated:        number;   // ConsultationSupplementIntake créés (V2)
  findingsCreated:       number;
  findingsSkipped:       number;
  durationMs:            number;
  errors:                Array<{ context: string; error: string }>;
}
