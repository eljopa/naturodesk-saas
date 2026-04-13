/**
 * Contrats TypeScript pour la normalisation des termes et le linking des faits.
 *
 * Un KnowledgeTerm est l'entité canonique dans le dictionnaire de normalisation.
 * Il représente une substance, un nutriment, un médicament ou un symptôme
 * sous sa forme de référence, avec ses alias connus.
 */

import type { TermType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Input / candidates
// ---------------------------------------------------------------------------

/**
 * Terme brut à normaliser avant création ou lookup en base.
 * Utilisé comme entrée de findOrCreateTerm().
 */
export interface TermCandidate {
  /** Nom brut tel qu'il arrive (ex: "vitamine b12", "Glucophage"). */
  rawName: string;
  termType: TermType;
  /** Clé BDPM si ce terme est un médicament avec code CIS connu. */
  drugKey?: string;
  /** Alias à stocker en base avec ce terme. */
  aliases?: string[];
}

/**
 * Terme après normalisation technique, prêt pour la persistance.
 */
export interface NormalizedTermInput {
  canonicalName: string;
  normalizedKey: string;
  termType: TermType;
  aliases: string[];
  drugKey: string | null;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Résultat de la résolution d'un nom brut vers un KnowledgeTerm.
 */
export interface TermResolutionResult {
  termId: string;
  canonicalName: string;
  normalizedKey: string;
  /** true si le nom a été résolu via un alias (ex: "glucophage" → "Metformine"). */
  resolvedFromAlias: boolean;
  /** true si le terme a été créé (false = déjà existant en base). */
  created: boolean;
}

// ---------------------------------------------------------------------------
// Batch results
// --------------------------------------------------------------------------->

/** Erreur survenue lors d'une opération sur les termes. */
export interface TermsBatchError {
  /** Contexte lisible (ex: "fact:uuid", "seed:Metformine"). */
  context: string;
  error: string;
}

/** Résultat global d'un batch de normalisation / linking. */
export interface TermsBatchResult {
  /** Termes créés lors de ce batch (seed + linking). */
  termsCreated: number;
  /** Termes déjà en base (idempotence). */
  termsAlreadyExisted: number;
  /** Facts mis à jour avec leur subjectTermId + objectTermId. */
  factsLinked: number;
  /** Facts déjà liés (subjectTermId et objectTermId déjà renseignés). */
  factsAlreadyLinked: number;
  errors: TermsBatchError[];
  durationMs: number;
}
