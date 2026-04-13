/**
 * Contrats TypeScript pour le pipeline d'ingestion documentaire.
 *
 * Ces types définissent les frontières entre :
 * - la source externe (SourceDocumentInput)
 * - le parsing interne (ParsedDocument, ParsedChunk)
 * - les résultats de persistance (ImportResult, BatchImportResult)
 */

import type { KnowledgeSourceType, KnowledgeDocType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Input — document source brut avant parsing
// ---------------------------------------------------------------------------

/** Une section d'un document source (ex. : section 4.8 de la notice BDPM). */
export interface SourceSection {
  /** Identifiant de section canonique (ex. : "4.8", "4.5", "1"). */
  sectionPath: string;
  /** Titre lisible de la section (ex. : "Effets indésirables"). */
  title: string;
  /** Contenu textuel brut de la section. */
  text: string;
  /** Métadonnées optionnelles spécifiques à la source (ex. : fréquence, sévérité). */
  meta?: Record<string, string | number | boolean | null>;
}

/** Document source prêt à être importé (mock ou réel après collecte BDPM). */
export interface SourceDocumentInput {
  /**
   * Clé pivot du médicament / substance.
   * Correspond au code CIS pour la BDPM, ou au slug normalisé pour les autres sources.
   */
  drugKey: string;
  sourceType: KnowledgeSourceType;
  docType: KnowledgeDocType;
  title: string;
  url?: string;
  sections: SourceSection[];
}

// ---------------------------------------------------------------------------
// Parsed — document transformé, prêt pour la persistance
// ---------------------------------------------------------------------------

/** Chunk parsé, prêt à être inséré dans knowledge_chunks. */
export interface ParsedChunk {
  /** Classification métier (ex. : "side_effect", "interaction", "contraindication"). */
  kind: string;
  /** Label lisible (ex. : "Effets indésirables — Metformine"). */
  label: string;
  /** Extrait textuel nettoyé. */
  excerpt: string;
  /** Référence de section (ex. : "4.8"). */
  sectionPath: string;
  /**
   * Métadonnées métier à stocker avec le chunk.
   * Exemples : fréquence, sévérité, substance, cible d'interaction.
   * Ne pas y mettre de données dérivées — uniquement ce qui vient de la source.
   */
  metaJson?: Record<string, string | number | boolean | null>;
}

/** Document parsé avec ses chunks, prêt pour createDocument + createChunks. */
export interface ParsedDocument {
  drugKey: string;
  sourceType: KnowledgeSourceType;
  docType: KnowledgeDocType;
  title: string;
  url: string | null;
  /** SHA-256 du contenu textuel concaténé — sert de clé d'idempotence. */
  contentHash: string;
  chunks: ParsedChunk[];
}

// ---------------------------------------------------------------------------
// Results — résultats des opérations d'import
// ---------------------------------------------------------------------------

/** Résultat de l'import d'un document unique. */
export interface ImportResult {
  documentId: string;
  drugKey: string;
  chunksCreated: number;
  /** true si le document existait déjà avec le même contentHash (pas re-inséré). */
  skipped: boolean;
  durationMs: number;
}

/** Erreur survenue pendant l'import d'un document. */
export interface ImportError {
  drugKey: string;
  sourceType: string;
  /** Étape où l'erreur s'est produite. */
  stage: "parse" | "create_document" | "create_chunks" | "sync";
  error: string;
}

/** Résultat d'un import batch (mock ou lot BDPM). */
export interface BatchImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
  durationMs: number;
}
