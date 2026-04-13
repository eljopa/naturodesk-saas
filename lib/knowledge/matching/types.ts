/**
 * Contrats TypeScript pour le moteur de matching sécurisé.
 *
 * Logique de matching :
 *   Lexical d'abord (exact_key → alias_dictionary → alias_db)
 *   Vectoriel ensuite seulement si includeSemanticComplement=true
 *   Seuil strict sur le vectoriel (≥ 0.72) — si doute, rejet
 *
 * Pivot : KnowledgeTerm (normalizedKey @unique)
 * Ordre : Terms → Facts → Chunks
 */

import type { FactType, FactPredicate, TermType, ExtractionMethod } from "@prisma/client";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ConsultationMatchInput {
  drugs?: string[];
  supplements?: string[];
  nutrients?: string[];
  symptoms?: string[];
  /**
   * Activer le matching sémantique vectoriel en complément du lexical.
   * Requiert OPENAI_API_KEY. Par défaut : false.
   * Le vectoriel n'est utilisé que si un terme a au moins un chunk sans fact lié.
   */
  includeSemanticComplement?: boolean;
}

// ---------------------------------------------------------------------------
// Term matching
// ---------------------------------------------------------------------------

/** Méthode par laquelle le terme a été résolu. */
export type TermMatchMethod =
  | "exact_key"        // normalizedKey direct en base
  | "alias_dictionary" // via ALIAS_DICTIONARY (resolveAlias)
  | "alias_db";        // via le tableau aliases[] stocké en base

export interface TermMatchResult {
  rawInput: string;
  termId: string;
  canonicalName: string;
  normalizedKey: string;
  termType: TermType;
  matchMethod: TermMatchMethod;
}

export interface TermNoMatch {
  rawInput: string;
  normalizedKey: string;
  reason: "not_found";
}

// ---------------------------------------------------------------------------
// Fact matching
// ---------------------------------------------------------------------------

export interface FactMatchResult {
  factId: string;
  factType: FactType;
  subject: string;
  subjectType: TermType;
  predicate: FactPredicate;
  object: string;
  objectType: TermType;
  qualifier: string | null;
  confidence: number;
  extractionMethod: ExtractionMethod;
  chunkId: string;
  /** ID du terme matché qui a déclenché la remontée de ce fait. */
  triggeredByTermId: string;
}

// ---------------------------------------------------------------------------
// Chunk matching
// ---------------------------------------------------------------------------

export type ChunkMatchSource = "fact_relation" | "semantic";

export interface ChunkMatchResult {
  chunkId: string;
  documentId: string;
  drugKey: string;
  kind: string;
  label: string;
  excerpt: string;
  /** fact_relation = remonté par un KnowledgeFact | semantic = similarité vectorielle */
  matchSource: ChunkMatchSource;
  /** Score cosinus 0–1 — uniquement si matchSource === "semantic". */
  score?: number;
}

// ---------------------------------------------------------------------------
// Consolidated result
// ---------------------------------------------------------------------------

export interface MatchingError {
  context: string;
  error: string;
}

export interface SecureMatchResult {
  termsMatched: TermMatchResult[];
  termsUnmatched: TermNoMatch[];
  facts: FactMatchResult[];
  chunks: ChunkMatchResult[];
  /** true si le matching vectoriel a été utilisé (et que des résultats ≥ seuil ont été trouvés). */
  semanticUsed: boolean;
  durationMs: number;
  errors: MatchingError[];
}

export interface MatchingBatchResult {
  totalConsultations: number;
  successCount: number;
  errorCount: number;
  results: SecureMatchResult[];
  errors: MatchingError[];
  durationMs: number;
}
