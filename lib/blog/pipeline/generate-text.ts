/**
 * Génération du texte FR d'un article — appel OpenAI, parsing, nettoyage,
 * score qualité, validation dure. Porté depuis generateContent() de
 * scripts/blog-auto-publish.mjs (SelfHook), adapté : appel REST direct (fetch)
 * comme lib/analysis/openai.ts plutôt que le SDK Anthropic, pas de dépendance
 * supplémentaire à ajouter au projet.
 */

import type { EditorialDna } from "../dna/compose";
import { ARTICLE_CONTENT_KEYS, type BlogArticleContent, type BlogContentBlock } from "./content-types";
import { applyReplacements, type ReplacementLogEntry } from "./language-guardrails";
import { computeQualityScore, hardValidate, type InternalLinkCandidates, type QualityScoreResult } from "./quality-score";
import { buildSystemPrompt, buildUserPrompt, type LinkCandidate, type PromptTopicInput } from "./prompt";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

const KNOWN_BLOCK_TYPES = new Set<BlogContentBlock["type"]>([
  "comparisonTable",
  "faq",
  "checklist",
  "planAction",
  "caseStudy",
  "keyTakeaways",
  "sources",
  "timeline",
  "quote",
  "expertFocus",
  "commonMistakes",
]);

/**
 * Supprime les clés privées/internes injectées par le modèle : clés commençant
 * par "_", clés inconnues au niveau racine, blocs dont le "type" n'est pas au
 * catalogue.
 */
function stripPrivateFields(raw: Record<string, unknown>): BlogArticleContent {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue;
    if (!ARTICLE_CONTENT_KEYS.has(key)) continue;
    cleaned[key] = value;
  }
  if (Array.isArray(cleaned.blocks)) {
    cleaned.blocks = (cleaned.blocks as Array<Record<string, unknown>>).filter(
      (b) => b && typeof b.type === "string" && KNOWN_BLOCK_TYPES.has(b.type as BlogContentBlock["type"])
    );
  } else {
    cleaned.blocks = [];
  }
  return cleaned as unknown as BlogArticleContent;
}

function fixAndParseJson(raw: string): Record<string, unknown> {
  const stripTrailingCommas = (s: string) => s.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(stripTrailingCommas(raw)) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(stripTrailingCommas(match[0])) as Record<string, unknown>;
    }
    throw new Error("Réponse OpenAI JSON invalide (aucun objet trouvé)");
  }
}

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string }; finish_reason?: string }>;
  usage?: { total_tokens: number };
}

async function callOpenAiChat(systemPrompt: string, userPrompt: string): Promise<{ raw: string; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n'est pas définie");
  const model = process.env.OPENAI_BLOG_TEXT_MODEL || DEFAULT_MODEL;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API OpenAI ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    console.warn("[blog] Réponse OpenAI tronquée (max_tokens atteint) — le JSON peut être invalide");
  }
  return { raw: choice?.message?.content ?? "", tokensUsed: data.usage?.total_tokens ?? 0 };
}

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
