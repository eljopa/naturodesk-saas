/**
 * Génération du texte FR d'un article — appel OpenAI, parsing, nettoyage,
 * score qualité, validation dure. Porté depuis generateContent() de
 * scripts/blog-auto-publish.mjs (SelfHook).
 */

import type { EditorialDna } from "../dna/compose";
import { stripPrivateFields, type BlogArticleContent } from "./content-types";
import { applyReplacements, type ReplacementLogEntry } from "./language-guardrails";
import { computeQualityScore, hardValidate, type InternalLinkCandidates, type QualityScoreResult } from "./quality-score";
import { buildSystemPrompt, buildUserPrompt, type LinkCandidate, type PromptTopicInput } from "./prompt";
import { callOpenAiChat, fixAndParseJson } from "./openai-client";

export interface GenerateArticleTextResult {
  content: BlogArticleContent;
  scoreResult: QualityScoreResult;
  hardErrors: string[];
  replacementLog: ReplacementLogEntry[];
  tokensUsed: number;
}

export async function generateArticleText(
  topic: PromptTopicInput,
  dna: EditorialDna,
  linkCandidates: LinkCandidate[],
  linkCounts: InternalLinkCandidates
): Promise<GenerateArticleTextResult> {
  const systemPrompt = buildSystemPrompt(dna);
  const userPrompt = buildUserPrompt(topic, dna, linkCandidates);

  const { raw, tokensUsed } = await callOpenAiChat(systemPrompt, userPrompt);
  const parsed = fixAndParseJson(raw);
  const stripped = stripPrivateFields(parsed);
  const { content, log: replacementLog } = applyReplacements(stripped);

  const scoreResult = computeQualityScore(content, dna, linkCounts);
  const hardErrors = hardValidate(content, scoreResult.score, dna);

  return { content, scoreResult, hardErrors, replacementLog, tokensUsed };
}
