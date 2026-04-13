/**
 * Orchestration du pipeline d'analyse knowledge.
 *
 * executeAnalysisPipeline() :
 *   1. Mappe KnowledgeAnalysisInput → ConsultationMatchInput
 *   2. runSecureMatching()        — matching lexical + vectoriel optionnel
 *   3. runDeterministicAnalysis() — scoring, classification, agrégation
 *
 * Purement lecture, aucune écriture en base, aucun appel LLM.
 * Les erreurs internes sont propagées au caller (route handler).
 */

import { runSecureMatching } from "@/lib/knowledge/matching/services/run-matching";
import { runDeterministicAnalysis } from "@/lib/knowledge/analysis/services/run-analysis";
import type { ConsultationMatchInput } from "@/lib/knowledge/matching/types";
import type { SecureMatchResult } from "@/lib/knowledge/matching/types";
import type { AnalysisResult } from "@/lib/knowledge/analysis/types";
import type { KnowledgeAnalysisInput } from "./types";

export interface PipelineResult {
  matchResult: SecureMatchResult;
  analysisResult: AnalysisResult;
}

/**
 * Exécute le pipeline complet matching → analyse pour un input consultation validé.
 */
export async function executeAnalysisPipeline(
  input: KnowledgeAnalysisInput
): Promise<PipelineResult> {
  const matchInput: ConsultationMatchInput = {
    drugs:                     input.medications,
    supplements:               input.supplements,
    nutrients:                 input.nutrients,
    symptoms:                  input.symptoms,
    includeSemanticComplement: input.includeSemanticComplement,
  };

  console.log(
    `[knowledge:api] ▶ Pipeline — medications=${input.medications.length} ` +
      `supplements=${input.supplements.length} nutrients=${input.nutrients.length} ` +
      `symptoms=${input.symptoms.length} semantic=${input.includeSemanticComplement}`
  );

  const matchResult = await runSecureMatching(matchInput);
  const analysisResult = runDeterministicAnalysis(matchResult);

  return { matchResult, analysisResult };
}
