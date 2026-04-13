/**
 * Contrats TypeScript pour le pipeline d'embedding de la knowledge base.
 *
 * Un EmbeddingCandidate est un KnowledgeChunk dont le kind est indexable
 * et l'embedding est null — il attend d'être vectorisé.
 */

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/** Chunk candidat à l'embedding (issu d'une requête SQL directe). */
export interface EmbeddingCandidate {
  id: string;
  documentId: string;
  /** Clé BDPM du document parent (récupérée par JOIN). */
  drugKey: string;
  kind: string;
  label: string;
  excerpt: string;
  sectionPath: string | null;
  /** Métadonnées métier brutes stockées lors de l'import. */
  metaJson: Record<string, string | number | boolean | null> | null;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Résultat de la vectorisation d'un chunk unique. */
export interface EmbeddingResult {
  chunkId: string;
  drugKey: string;
  kind: string;
  /** Durée en millisecondes pour générer + stocker l'embedding. */
  durationMs: number;
}

/** Erreur survenue lors de la vectorisation d'un chunk. */
export interface EmbeddingError {
  chunkId: string;
  drugKey: string;
  kind: string;
  error: string;
}

/** Résultat global d'un batch d'embedding. */
export interface EmbeddingBatchResult {
  /** Nombre total de chunks sans embedding trouvés en base. */
  totalCandidates: number;
  /** Chunks vectorisés avec succès. */
  embedded: number;
  /**
   * Chunks ignorés car leur kind n'est pas dans la liste indexable.
   * (composition, dosage, formulation, etc.)
   */
  skipped: number;
  errors: EmbeddingError[];
  durationMs: number;
}
