const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small"; // 1536 dimensions — matches schema vector(1536)

interface EmbedResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Embeddings error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as EmbedResponse;
  return data.data[0]!.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Embeddings error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as EmbedResponse;
  // API returns embeddings in the same order as input
  return data.data.map((d) => d.embedding);
}
