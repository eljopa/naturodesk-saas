-- Migration : couche d'analyse clinique V1
-- Créée manuellement (drift CIP7/CIP13 exclu — index déjà présents en DB)
--
-- Ajoute :
--   Enums  : SymptomCategory, DrugEffectType, SideEffectFrequency, SideEffectSeverity,
--            EffectTemporality, ClinicalEvidenceLevel, ClinicalSourceType,
--            AnalysisTier, ClinicalAnalysisStatus
--   Tables : clinical_sources, symptom_terms, drug_side_effects,
--            drug_nutrient_depletions, nutrient_depletion_symptoms,
--            clinical_analyses, analysis_items
--   Index  : drug_substances_isActive_idx (sur table existante)

-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "SymptomCategory" AS ENUM (
  'GASTROINTESTINAL',
  'NEUROLOGICAL',
  'PSYCHIATRIC',
  'CARDIOVASCULAR',
  'MUSCULOSKELETAL',
  'DERMATOLOGICAL',
  'RESPIRATORY',
  'METABOLIC',
  'GENERAL'
);

CREATE TYPE "DrugEffectType" AS ENUM (
  'DIRECT_SIDE_EFFECT',
  'SECONDARY_MECHANISM'
);

CREATE TYPE "SideEffectFrequency" AS ENUM (
  'VERY_COMMON',
  'COMMON',
  'UNCOMMON',
  'RARE',
  'VERY_RARE',
  'UNKNOWN'
);

CREATE TYPE "SideEffectSeverity" AS ENUM (
  'MILD',
  'MODERATE',
  'SEVERE'
);

CREATE TYPE "EffectTemporality" AS ENUM (
  'IMMEDIATE',
  'EARLY',
  'DELAYED',
  'CHRONIC',
  'WITHDRAWAL',
  'UNKNOWN'
);

CREATE TYPE "ClinicalEvidenceLevel" AS ENUM (
  'RCP_ANSM',
  'HAS_GUIDELINE',
  'SYSTEMATIC_REVIEW',
  'CLINICAL_STUDY',
  'EXPERT_CONSENSUS',
  'CASE_REPORTS'
);

CREATE TYPE "ClinicalSourceType" AS ENUM (
  'RCP_ANSM',
  'HAS_GUIDELINE',
  'SYSTEMATIC_REVIEW',
  'CLINICAL_STUDY',
  'EXPERT_CONSENSUS',
  'CASE_REPORTS'
);

CREATE TYPE "AnalysisTier" AS ENUM (
  'TIER_1_DIRECT',
  'TIER_2_INDIRECT',
  'TIER_3_FACT_ONLY',
  'TIER_4_UNMATCHED'
);

CREATE TYPE "ClinicalAnalysisStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'DONE',
  'FAILED'
);

-- ── ClinicalSource ─────────────────────────────────────────────────────────

CREATE TABLE "clinical_sources" (
  "id"          TEXT                 NOT NULL,
  "type"        "ClinicalSourceType" NOT NULL,
  "shortLabel"  TEXT                 NOT NULL,
  "authority"   TEXT,
  "productName" TEXT,
  "section"     TEXT,
  "year"        INTEGER,
  "authors"     TEXT,
  "journal"     TEXT,
  "doi"         TEXT,
  "pmid"        TEXT,
  "url"         TEXT,
  "createdAt"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)         NOT NULL,
  CONSTRAINT "clinical_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_sources_type_idx" ON "clinical_sources"("type");

-- ── SymptomTerm ────────────────────────────────────────────────────────────

CREATE TABLE "symptom_terms" (
  "id"            TEXT               NOT NULL,
  "normalizedKey" TEXT               NOT NULL,
  "label"         TEXT               NOT NULL,
  "labelEn"       TEXT,
  "category"      "SymptomCategory"  NOT NULL,
  "synonyms"      TEXT[]             NOT NULL DEFAULT ARRAY[]::TEXT[],
  "meddraCode"    TEXT,
  "isActive"      BOOLEAN            NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)       NOT NULL,
  CONSTRAINT "symptom_terms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "symptom_terms_normalizedKey_key" ON "symptom_terms"("normalizedKey");
CREATE INDEX "symptom_terms_category_idx"  ON "symptom_terms"("category");
CREATE INDEX "symptom_terms_isActive_idx"  ON "symptom_terms"("isActive");

-- ── DrugSideEffect ─────────────────────────────────────────────────────────

CREATE TABLE "drug_side_effects" (
  "id"              TEXT                   NOT NULL,
  "drugSubstanceId" TEXT                   NOT NULL,
  "symptomTermId"   TEXT                   NOT NULL,
  "effectType"      "DrugEffectType"       NOT NULL DEFAULT 'DIRECT_SIDE_EFFECT',
  "frequency"       "SideEffectFrequency"  NOT NULL,
  "severity"        "SideEffectSeverity"   NOT NULL DEFAULT 'MILD',
  "temporality"     "EffectTemporality"    NOT NULL DEFAULT 'UNKNOWN',
  "evidenceLevel"   "ClinicalEvidenceLevel" NOT NULL,
  "sourceId"        TEXT                   NOT NULL,
  "mechanism"       TEXT,
  "isActive"        BOOLEAN                NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)           NOT NULL,
  CONSTRAINT "drug_side_effects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drug_side_effects_drugSubstanceId_symptomTermId_effectType_key"
  ON "drug_side_effects"("drugSubstanceId", "symptomTermId", "effectType");
CREATE INDEX "drug_side_effects_drugSubstanceId_idx" ON "drug_side_effects"("drugSubstanceId");
CREATE INDEX "drug_side_effects_symptomTermId_idx"   ON "drug_side_effects"("symptomTermId");
CREATE INDEX "drug_side_effects_sourceId_idx"        ON "drug_side_effects"("sourceId");
CREATE INDEX "drug_side_effects_isActive_idx"        ON "drug_side_effects"("isActive");
CREATE INDEX "drug_side_effects_evidenceLevel_idx"   ON "drug_side_effects"("evidenceLevel");

-- ── DrugNutrientDepletion ──────────────────────────────────────────────────

CREATE TABLE "drug_nutrient_depletions" (
  "id"              TEXT                    NOT NULL,
  "drugSubstanceId" TEXT                    NOT NULL,
  "nutrient"        TEXT                    NOT NULL,
  "nutrientKey"     TEXT                    NOT NULL,
  "mechanism"       TEXT                    NOT NULL,
  "evidenceLevel"   "ClinicalEvidenceLevel" NOT NULL,
  "sourceId"        TEXT                    NOT NULL,
  "isActive"        BOOLEAN                 NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)            NOT NULL,
  CONSTRAINT "drug_nutrient_depletions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drug_nutrient_depletions_drugSubstanceId_nutrientKey_key"
  ON "drug_nutrient_depletions"("drugSubstanceId", "nutrientKey");
CREATE INDEX "drug_nutrient_depletions_drugSubstanceId_idx" ON "drug_nutrient_depletions"("drugSubstanceId");
CREATE INDEX "drug_nutrient_depletions_sourceId_idx"        ON "drug_nutrient_depletions"("sourceId");
CREATE INDEX "drug_nutrient_depletions_isActive_idx"        ON "drug_nutrient_depletions"("isActive");

-- ── NutrientDepletionSymptom ───────────────────────────────────────────────

CREATE TABLE "nutrient_depletion_symptoms" (
  "id"          TEXT NOT NULL,
  "depletionId" TEXT NOT NULL,
  "symptomId"   TEXT NOT NULL,
  CONSTRAINT "nutrient_depletion_symptoms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nutrient_depletion_symptoms_depletionId_symptomId_key"
  ON "nutrient_depletion_symptoms"("depletionId", "symptomId");
CREATE INDEX "nutrient_depletion_symptoms_depletionId_idx" ON "nutrient_depletion_symptoms"("depletionId");
CREATE INDEX "nutrient_depletion_symptoms_symptomId_idx"   ON "nutrient_depletion_symptoms"("symptomId");

-- ── ClinicalAnalysis ───────────────────────────────────────────────────────

CREATE TABLE "clinical_analyses" (
  "id"             TEXT                     NOT NULL,
  "userId"         TEXT                     NOT NULL,
  "consultationId" TEXT,
  "rawSymptoms"    TEXT                     NOT NULL,
  "drugInputs"     JSONB                    NOT NULL,
  "assessedAt"     TIMESTAMP(3)             NOT NULL,
  "status"         "ClinicalAnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "summary"        TEXT,
  "durationMs"     INTEGER,
  "createdAt"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)             NOT NULL,
  CONSTRAINT "clinical_analyses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_analyses_userId_idx"         ON "clinical_analyses"("userId");
CREATE INDEX "clinical_analyses_consultationId_idx" ON "clinical_analyses"("consultationId");
CREATE INDEX "clinical_analyses_status_idx"         ON "clinical_analyses"("status");
CREATE INDEX "clinical_analyses_createdAt_idx"      ON "clinical_analyses"("createdAt");

-- ── AnalysisItem ───────────────────────────────────────────────────────────

CREATE TABLE "analysis_items" (
  "id"                  TEXT             NOT NULL,
  "analysisId"          TEXT             NOT NULL,
  "symptomTermId"       TEXT,
  "rawSymptomFragment"  TEXT,
  "drugSubstanceId"     TEXT,
  "sideEffectId"        TEXT,
  "nutrientDepletionId" TEXT,
  "knowledgeFactId"     TEXT,
  "tier"                "AnalysisTier"   NOT NULL,
  "confidenceScore"     DOUBLE PRECISION NOT NULL,
  "frequencyFactor"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "evidenceCeiling"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "temporalModifier"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "corroborationBoost"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "explanation"         TEXT,
  "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analysis_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analysis_items_analysisId_idx"          ON "analysis_items"("analysisId");
CREATE INDEX "analysis_items_symptomTermId_idx"        ON "analysis_items"("symptomTermId");
CREATE INDEX "analysis_items_drugSubstanceId_idx"      ON "analysis_items"("drugSubstanceId");
CREATE INDEX "analysis_items_tier_idx"                 ON "analysis_items"("tier");
CREATE INDEX "analysis_items_sideEffectId_idx"         ON "analysis_items"("sideEffectId");
CREATE INDEX "analysis_items_nutrientDepletionId_idx"  ON "analysis_items"("nutrientDepletionId");
CREATE INDEX "analysis_items_knowledgeFactId_idx"      ON "analysis_items"("knowledgeFactId");

-- ── Clés étrangères ────────────────────────────────────────────────────────

ALTER TABLE "drug_side_effects"
  ADD CONSTRAINT "drug_side_effects_drugSubstanceId_fkey"
    FOREIGN KEY ("drugSubstanceId") REFERENCES "drug_substances"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "drug_side_effects_symptomTermId_fkey"
    FOREIGN KEY ("symptomTermId") REFERENCES "symptom_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "drug_side_effects_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "clinical_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drug_nutrient_depletions"
  ADD CONSTRAINT "drug_nutrient_depletions_drugSubstanceId_fkey"
    FOREIGN KEY ("drugSubstanceId") REFERENCES "drug_substances"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "drug_nutrient_depletions_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "clinical_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nutrient_depletion_symptoms"
  ADD CONSTRAINT "nutrient_depletion_symptoms_depletionId_fkey"
    FOREIGN KEY ("depletionId") REFERENCES "drug_nutrient_depletions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nutrient_depletion_symptoms_symptomId_fkey"
    FOREIGN KEY ("symptomId") REFERENCES "symptom_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clinical_analyses"
  ADD CONSTRAINT "clinical_analyses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_analyses_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analysis_items"
  ADD CONSTRAINT "analysis_items_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "clinical_analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "analysis_items_symptomTermId_fkey"
    FOREIGN KEY ("symptomTermId") REFERENCES "symptom_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "analysis_items_drugSubstanceId_fkey"
    FOREIGN KEY ("drugSubstanceId") REFERENCES "drug_substances"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "analysis_items_sideEffectId_fkey"
    FOREIGN KEY ("sideEffectId") REFERENCES "drug_side_effects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "analysis_items_nutrientDepletionId_fkey"
    FOREIGN KEY ("nutrientDepletionId") REFERENCES "drug_nutrient_depletions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "analysis_items_knowledgeFactId_fkey"
    FOREIGN KEY ("knowledgeFactId") REFERENCES "knowledge_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Index sur table existante ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "drug_substances_isActive_idx" ON "drug_substances"("isActive");
