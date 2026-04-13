/**
 * Contrats TypeScript pour l'extraction déterministe de KnowledgeFact.
 *
 * Un fait structuré représente un triplet (sujet, prédicat, objet) extrait
 * d'un chunk documentaire avec traçabilité complète vers la source.
 */

import type { FactType, FactPredicate, TermType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/**
 * Chunk éligible à l'extraction de faits.
 * Récupéré via SQL (JOIN knowledge_documents pour obtenir drugKey).
 */
export interface FactExtractionCandidate {
  id: string;
  documentId: string;
  /** Clé BDPM du médicament (ex: "metformine"). */
  drugKey: string;
  kind: string;
  label: string;
  excerpt: string;
  sectionPath: string | null;
  /** Métadonnées structurées stockées lors de l'import — source principale pour l'extraction déterministe. */
  metaJson: Record<string, string | number | boolean | null> | null;
}

// ---------------------------------------------------------------------------
// Extracted fact
// ---------------------------------------------------------------------------

/**
 * Fait structuré extrait d'un chunk, prêt à persister en base.
 * Tous les champs nécessaires à KnowledgeFact, sauf les IDs de terme
 * (résolus en Phase 5 — normalisation).
 */
export interface ExtractedFactInput {
  chunkId: string;
  documentId: string;
  factType: FactType;
  /** Nom canonique de l'entité sujet (ex: "Metformine"). */
  subject: string;
  subjectType: TermType;
  predicate: FactPredicate;
  /** Nom canonique de l'entité objet (ex: "Vitamine B12"). */
  object: string;
  objectType: TermType;
  /** Contexte libre : fréquence, sévérité, mécanisme. */
  qualifier?: string;
  /** Toujours 1.0 pour DETERMINISTIC. */
  confidence: number;
  /** Extrait source — obligatoire pour traçabilité. */
  rawExcerpt: string;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Résultat de l'extraction sur un chunk unique. */
export interface FactExtractionResult {
  chunkId: string;
  drugKey: string;
  kind: string;
  factsCreated: number;
  /** Faits détectés mais déjà en base (idempotence). */
  factsSkipped: number;
}

/** Erreur survenue lors du traitement d'un chunk. */
export interface FactExtractionError {
  chunkId: string;
  drugKey: string;
  kind: string;
  error: string;
}

/** Résultat global d'un batch d'extraction. */
export interface FactExtractionBatchResult {
  /** Nombre de chunks trouvés en base (kinds éligibles). */
  totalCandidates: number;
  /** Chunks effectivement analysés (après filtrage kind). */
  chunksProcessed: number;
  /** Chunks sans extracteur applicable pour leur kind. */
  chunksSkipped: number;
  factsCreated: number;
  /** Faits déjà existants évités (idempotence). */
  factsSkipped: number;
  errors: FactExtractionError[];
  durationMs: number;
}
