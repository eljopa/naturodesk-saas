/**
 * Contrats TypeScript de la couche de lecture findings knowledge (Phase 10).
 *
 * Conçu pour la restitution UI :
 *   - Findings groupés par bucket (alerts / interactions / warnings / depletions / contextualNotes)
 *   - Données dénormalisées — pas besoin de second appel côté client
 *   - Citations incluses inline dans chaque finding
 *   - run === null si aucun run knowledge n'a encore été exécuté
 */

// ---------------------------------------------------------------------------
// DTO — représentation UI d'un finding
// ---------------------------------------------------------------------------

export interface CitationDto {
  id:               string;
  reference:        string;
  excerpt:          string | null;
  knowledgeFactId:  string | null;
  knowledgeChunkId: string | null;
}

export interface FindingDto {
  id:              string;
  category:        string;   // FindingCategory enum value
  title:           string;
  description:     string;
  confidence:      number;
  riskLevel:       string | null;  // CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
  validated:       boolean | null; // null = en attente de validation praticien
  practitionerNote: string | null;
  citations:       CitationDto[];
}

// ---------------------------------------------------------------------------
// Run metadata
// ---------------------------------------------------------------------------

export interface RunDto {
  id:         string;
  status:     string;
  createdAt:  string;  // ISO 8601
  finishedAt: string | null;
  durationMs: number | null;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface FindingsSummary {
  totalFindings:    number;
  alertCount:       number;
  interactionCount: number;
  warningCount:     number;
  depletionCount:   number;
  contextualCount:  number;
  /** Niveau de risque le plus élevé parmi les findings. null si aucun finding. */
  highestRisk:      string | null;
  /** true si au moins un finding n'a pas encore été validé/rejeté par le praticien. */
  hasUnvalidated:   boolean;
  /** Findings non encore examinés par le praticien (validated === null). */
  pendingCount:     number;
  /** Findings validés par le praticien (validated === true). */
  validatedCount:   number;
  /** Findings rejetés par le praticien (validated === false). */
  rejectedCount:    number;
}

// ---------------------------------------------------------------------------
// Réponse API complète
// ---------------------------------------------------------------------------

export interface FindingsApiResponse {
  consultationId:  string;
  /** null si aucun run knowledge n'a encore été exécuté pour cette consultation. */
  run:             RunDto | null;
  summary:         FindingsSummary;
  alerts:          FindingDto[];
  interactions:    FindingDto[];
  warnings:        FindingDto[];
  depletions:      FindingDto[];
  contextualNotes: FindingDto[];
  meta: {
    hasRun:      boolean;
    hasErrors:   boolean;
    runId:       string | null;
  };
}
