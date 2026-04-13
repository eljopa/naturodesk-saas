/**
 * Contrats TypeScript pour la couche de persistance knowledge (Phase 9).
 *
 * Séparation claire :
 *   - FindingInput    : données prêtes à persister (après mapping depuis ScoredFact)
 *   - CitationInput   : preuves documentaires associées à un finding
 *   - PersistenceResult : résumé de l'opération de persistance
 */

import type { FindingCategory, FindingSourceType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Inputs de persistance
// ---------------------------------------------------------------------------

export interface FindingInput {
  consultationId: string;
  analysisRunId:  string;
  category:       FindingCategory;
  title:          string;
  description:    string;
  confidence:     number;
  riskLevel:      string;
  /** DOCUMENTED | PARSED | CLINICAL | ABSENT — source de la preuve. */
  evidenceLevel?: string;
  sourceType:     FindingSourceType;
  /** Références documentaires à associer à ce finding. */
  citations:      CitationInput[];
}

export interface CitationInput {
  reference:        string;
  excerpt?:         string;
  url?:             string;
  knowledgeFactId?: string;
  knowledgeChunkId?: string;
}

// ---------------------------------------------------------------------------
// Résultats
// ---------------------------------------------------------------------------

export interface PersistenceError {
  context: string;
  error:   string;
}

export interface PersistenceResult {
  analysisRunId:   string;
  findingsCreated: number;
  findingsSkipped: number;
  citationsCreated: number;
  durationMs:      number;
  errors:          PersistenceError[];
}
