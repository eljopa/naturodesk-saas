/**
 * Orchestrateur du pipeline de matching sécurisé.
 *
 * runSecureMatching() enchaîne les 4 étapes dans l'ordre strict :
 *   1. normalizeConsultationInput  — nettoie et prépare les entrées
 *   2. matchConsultationTerms      — résolution lexicale (3 niveaux)
 *   3. matchFactsFromTerms         — faits liés aux termes résolus
 *   4. matchChunksFromTerms        — chunks (fact_relation → semantic)
 *
 * Garanties :
 *   - Purement en lecture (aucune écriture en base)
 *   - Vectoriel uniquement si includeSemanticComplement=true ET OPENAI_API_KEY présent
 *   - Erreurs isolées : une exception dans une étape ne propage pas
 */

import { normalizeConsultationInput } from "./normalize-input";
import { matchConsultationTerms } from "./match-terms";
import { matchFactsFromTerms } from "./match-facts";
import { matchChunksFromTerms } from "./match-chunks";
import type {
  ConsultationMatchInput,
  FactMatchResult,
  SecureMatchResult,
  MatchingError,
} from "../types";

/**
 * Lance le pipeline complet de matching pour une consultation.
 * Retourne un SecureMatchResult entièrement traçable.
 */
export async function runSecureMatching(
  input: ConsultationMatchInput
): Promise<SecureMatchResult> {
  const startedAt = Date.now();
  const errors: MatchingError[] = [];

  // --- Étape 1 : Normalisation ---
  const normalizedEntries = normalizeConsultationInput(input);

  console.log(
    `[matching] ▶ ${normalizedEntries.length} entrée(s) normalisée(s) à matcher`
  );

  // --- Étape 2 : Matching lexical des termes ---
  const { matched, unmatched } = await matchConsultationTerms(normalizedEntries);

  const termIds = [...new Set(matched.map((m) => m.termId))];
  const matchedTermNames = matched.map((m) => m.canonicalName);

  console.log(
    `[matching] ${matched.length} terme(s) résolu(s), ${unmatched.length} rejeté(s)`
  );

  // --- Étape 3 : Faits liés aux termes ---
  let facts: FactMatchResult[] = [];
  try {
    facts = await matchFactsFromTerms(termIds);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ context: "matchFactsFromTerms", error: msg });
    console.error(`[matching] ✗ matchFactsFromTerms : ${msg}`);
  }

  // --- Étape 4 : Chunks (fact_relation puis semantic) ---
  const factChunkIds = [...new Set(facts.map((f) => f.chunkId))];
  const semanticRequested = input.includeSemanticComplement ?? false;

  let chunks: SecureMatchResult["chunks"] = [];
  let semanticUsed = false;

  try {
    const chunkResult = await matchChunksFromTerms(factChunkIds, {
      semanticComplement: semanticRequested,
      matchedTermNames,
    });
    chunks = chunkResult.chunks;
    semanticUsed = chunkResult.semanticActuallyUsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ context: "matchChunksFromTerms", error: msg });
    console.error(`[matching] ✗ matchChunksFromTerms : ${msg}`);
  }

  const durationMs = Date.now() - startedAt;

  console.log(
    `[matching] ✓ Terminé — termes=${matched.length} facts=${facts.length} ` +
      `chunks=${chunks.length} semantic=${semanticUsed} durée=${durationMs}ms`
  );

  return {
    termsMatched: matched,
    termsUnmatched: unmatched,
    facts,
    chunks,
    semanticUsed,
    durationMs,
    errors,
  };
}
