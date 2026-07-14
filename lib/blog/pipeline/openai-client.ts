/**
 * Client OpenAI partagé — génération FR (generate-text.ts) et adaptation EN
 * (translate-text.ts). Appel REST direct (fetch), même convention que
 * lib/analysis/openai.ts : pas de dépendance SDK supplémentaire au projet.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

export function fixAndParseJson(raw: string): Record<string, unknown> {
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

export async function callOpenAiChat(
  systemPrompt: string,
  userPrompt: string,
  opts: { modelEnvVar?: string; temperature?: number } = {}
): Promise<{ raw: string; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n'est pas définie");
  const model = (opts.modelEnvVar && process.env[opts.modelEnvVar]) || process.env.OPENAI_BLOG_TEXT_MODEL || DEFAULT_MODEL;

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
      temperature: opts.temperature ?? 0.7,
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
