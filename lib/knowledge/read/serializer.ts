/**
 * Sérialisation des données brutes en réponse API findings.
 *
 * buildFindingsResponse() :
 *   - Groupe les findings par bucket UI (RED_FLAG→alerts, INTERACTION→interactions, etc.)
 *   - Calcule le summary (compteurs, highestRisk, hasUnvalidated)
 *   - Construit le RunDto depuis l'AnalysisRun Prisma
 *   - Retourne une FindingsApiResponse prête à sérialiser en JSON
 *
 * Mapping FindingCategory → bucket UI :
 *   RED_FLAG    → alerts
 *   INTERACTION → interactions
 *   SIDE_EFFECT → warnings
 *   DEPLETION   → depletions
 *   TERRAIN     → contextualNotes
 *   Autres      → contextualNotes (fallback conservateur)
 */

import type { AnalysisRun } from "@prisma/client";
import type { FindingWithCitations } from "./services/get-findings";
import type {
  FindingsApiResponse,
  FindingDto,
  CitationDto,
  RunDto,
  FindingsSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Risk ordering
// ---------------------------------------------------------------------------

const RISK_ORDER: Record<string, number> = {
  CRITICAL:      5,
  HIGH:          4,
  MEDIUM:        3,
  LOW:           2,
  INFORMATIONAL: 1,
};

function higherRisk(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return (RISK_ORDER[a] ?? 0) >= (RISK_ORDER[b] ?? 0) ? a : b;
}

// ---------------------------------------------------------------------------
// Mapping category → bucket
// ---------------------------------------------------------------------------

type BucketKey = "alerts" | "interactions" | "warnings" | "depletions" | "contextualNotes";

const CATEGORY_TO_BUCKET: Record<string, BucketKey> = {
  RED_FLAG:    "alerts",
  INTERACTION: "interactions",
  SIDE_EFFECT: "warnings",
  DEPLETION:   "depletions",
  TERRAIN:     "contextualNotes",
  PROTOCOL:    "contextualNotes",
  QUESTION:    "contextualNotes",
};

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toCitationDto(c: FindingWithCitations["citations"][number]): CitationDto {
  return {
    id:               c.id,
    reference:        c.reference,
    excerpt:          c.excerpt,
    knowledgeFactId:  c.knowledgeFactId,
    knowledgeChunkId: c.knowledgeChunkId,
  };
}

function toFindingDto(f: FindingWithCitations): FindingDto {
  return {
    id:               f.id,
    category:         f.category,
    title:            f.title,
    description:      f.description,
    confidence:       f.confidence,
    riskLevel:        f.riskLevel,
    validated:        f.validated,
    practitionerNote: f.practitionerNote,
    citations:        f.citations.map(toCitationDto),
  };
}

function toRunDto(run: AnalysisRun): RunDto {
  const durationMs =
    run.startedAt && run.finishedAt
      ? run.finishedAt.getTime() - run.startedAt.getTime()
      : null;

  return {
    id:         run.id,
    status:     run.status,
    createdAt:  run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Bucket sorting — non-revus d'abord, puis par risque décroissant
// ---------------------------------------------------------------------------

/**
 * Trie les findings d'un bucket :
 *   1. Non examinés (null) — risque décroissant
 *   2. Validés (true)      — risque décroissant
 *   3. Rejetés (false)     — risque décroissant
 */
function sortBucket(findings: FindingDto[]): FindingDto[] {
  const validationOrder = (v: boolean | null): number =>
    v === null ? 0 : v === true ? 1 : 2;

  return [...findings].sort((a, b) => {
    const vo = validationOrder(a.validated) - validationOrder(b.validated);
    if (vo !== 0) return vo;
    return (RISK_ORDER[b.riskLevel ?? ""] ?? 0) - (RISK_ORDER[a.riskLevel ?? ""] ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Construit la réponse API complète depuis les données brutes.
 *
 * @param consultationId  ID de la consultation.
 * @param run             Dernier AnalysisRun knowledge (null si aucun).
 * @param findings        Findings avec citations (vide si run=null).
 */
export function buildFindingsResponse(
  consultationId: string,
  run:            AnalysisRun | null,
  findings:       FindingWithCitations[]
): FindingsApiResponse {
  // --- Distribution dans les buckets ---
  const buckets: Record<BucketKey, FindingDto[]> = {
    alerts:          [],
    interactions:    [],
    warnings:        [],
    depletions:      [],
    contextualNotes: [],
  };

  let highestRisk: string | null = null;
  let hasUnvalidated = false;
  let pendingCount   = 0;
  let validatedCount = 0;
  let rejectedCount  = 0;

  for (const f of findings) {
    const bucket = CATEGORY_TO_BUCKET[f.category] ?? "contextualNotes";
    buckets[bucket].push(toFindingDto(f));
    highestRisk = higherRisk(highestRisk, f.riskLevel);
    if (f.validated === null)  { hasUnvalidated = true; pendingCount++; }
    else if (f.validated)      { validatedCount++; }
    else                       { rejectedCount++; }
  }

  // Tri dans chaque bucket
  for (const key of Object.keys(buckets) as BucketKey[]) {
    buckets[key] = sortBucket(buckets[key]);
  }

  // --- Summary ---
  const summary: FindingsSummary = {
    totalFindings:    findings.length,
    alertCount:       buckets.alerts.length,
    interactionCount: buckets.interactions.length,
    warningCount:     buckets.warnings.length,
    depletionCount:   buckets.depletions.length,
    contextualCount:  buckets.contextualNotes.length,
    highestRisk,
    hasUnvalidated,
    pendingCount,
    validatedCount,
    rejectedCount,
  };

  return {
    consultationId,
    run:             run ? toRunDto(run) : null,
    summary,
    alerts:          buckets.alerts,
    interactions:    buckets.interactions,
    warnings:        buckets.warnings,
    depletions:      buckets.depletions,
    contextualNotes: buckets.contextualNotes,
    meta: {
      hasRun:    run !== null,
      hasErrors: run?.status === "ERROR",
      runId:     run?.id ?? null,
    },
  };
}
