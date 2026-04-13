/**
 * Couche de lecture pour l'analyse supplements V2.
 *
 * Utilisée par SupplementAnalysisPanel (Server Component).
 * Requêtes directes en base — pas de fetch HTTP.
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface SupplementIntakeRow {
  id:                      string;
  rawText:                 string;
  parsedLabel:             string | null;
  canonicalName:           string | null;   // KnowledgeTerm.canonicalName
  variantLabel:            string | null;   // KnowledgeTermVariant.label
  variantType:             string | null;   // KnowledgeTermVariant.variantType
  estimatedDailyDoseValue: number | null;
  estimatedDailyDoseUnit:  string | null;
  dosePerUnitValue:        number | null;
  dosePerUnitUnit:         string | null;
  unitsPerIntake:          number | null;
  intakesPerDay:           number | null;
  timingText:              string | null;
  parseStatus:             string;
  parseConfidence:         string;
  resolutionConfidence:    string | null;
}

export interface SupplementFindingRow {
  id:               string;
  category:         string;
  sourceType:       string;
  title:            string;
  description:      string;
  riskLevel:        string | null;
  evidenceLevel:    string | null;
  confidence:       number;
  validated:        boolean | null;
  practitionerNote: string | null;
  citations: Array<{
    id:        string;
    reference: string;
    excerpt:   string | null;
  }>;
}

export interface SupplementRunRow {
  id:         string;
  status:     string;
  createdAt:  Date;
  finishedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Intakes structurés pour une consultation, avec relations dénormalisées.
 */
export async function getSupplementIntakes(
  consultationId: string
): Promise<SupplementIntakeRow[]> {
  const rows = await db.consultationSupplementIntake.findMany({
    where:   { consultationId },
    include: {
      knowledgeTerm:        { select: { canonicalName: true } },
      knowledgeTermVariant: { select: { label: true, variantType: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id:                      r.id,
    rawText:                 r.rawText,
    parsedLabel:             r.parsedLabel,
    canonicalName:           r.knowledgeTerm?.canonicalName ?? null,
    variantLabel:            r.knowledgeTermVariant?.label ?? null,
    variantType:             r.knowledgeTermVariant?.variantType ?? null,
    estimatedDailyDoseValue: r.estimatedDailyDoseValue,
    estimatedDailyDoseUnit:  r.estimatedDailyDoseUnit,
    dosePerUnitValue:        r.dosePerUnitValue,
    dosePerUnitUnit:         r.dosePerUnitUnit,
    unitsPerIntake:          r.unitsPerIntake,
    intakesPerDay:           r.intakesPerDay,
    timingText:              r.timingText,
    parseStatus:             r.parseStatus,
    parseConfidence:         r.parseConfidence,
    resolutionConfidence:    r.resolutionConfidence,
  }));
}

/**
 * Dernier run SUPPLEMENT_ODS terminé avec succès.
 * Retourne null si aucun run n'existe encore (état initial normal).
 */
export async function getLatestSupplementRun(
  consultationId: string
): Promise<SupplementRunRow | null> {
  return db.analysisRun.findFirst({
    where: {
      consultationId,
      stage:  "SUPPLEMENT_ODS",
      status: "DONE",
    },
    orderBy: { createdAt: "desc" },
    select:  { id: true, status: true, createdAt: true, finishedAt: true },
  });
}

/**
 * Findings produits par un run SUPPLEMENT_ODS.
 * Triés par riskLevel desc, puis catégorie.
 */
export async function getSupplementFindings(
  runId: string
): Promise<SupplementFindingRow[]> {
  const rows = await db.finding.findMany({
    where:   { analysisRunId: runId },
    include: {
      citations: { select: { id: true, reference: true, excerpt: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return rows.map((r) => ({
    id:               r.id,
    category:         r.category,
    sourceType:       r.sourceType,
    title:            r.title,
    description:      r.description,
    riskLevel:        r.riskLevel,
    evidenceLevel:    r.evidenceLevel,
    confidence:       r.confidence,
    validated:        r.validated,
    practitionerNote: r.practitionerNote,
    citations:        r.citations,
  }));
}
