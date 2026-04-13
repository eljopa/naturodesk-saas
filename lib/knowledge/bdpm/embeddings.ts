/**
 * lib/knowledge/bdpm/embeddings.ts
 *
 * Génération des embeddings pour les KnowledgeChunk créés lors de l'ingestion BDPM.
 * Appelé après le parsing complet — jamais inline dans une boucle de parsing.
 *
 * Modèle : text-embedding-3-small, dimensions 1536
 * Batch : 100 chunks par appel API OpenAI
 */

import { db } from "@/lib/db";

const EMBED_BATCH = 100;
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIMENSIONS = 1536;

export async function generatePendingEmbeddings(batchId: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("[BDPM Embeddings] OPENAI_API_KEY non défini");

  // Récupérer les chunks sans embedding (embedding est Unsupported → $queryRaw)
  const chunks = await db.$queryRaw<Array<{ id: string; excerpt: string }>>`
    SELECT id, excerpt FROM "knowledge_chunks"
    WHERE embedding IS NULL AND excerpt <> ''
  `;

  if (chunks.length === 0) return;

  console.log(`[BDPM Embeddings] ${chunks.length} chunks à vectoriser (batch ${batchId})`);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: batch.map((c) => c.excerpt),
        dimensions: EMBED_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[BDPM Embeddings] OpenAI error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    for (let j = 0; j < batch.length; j++) {
      const entry = data.data[j];
      const vector = entry?.embedding;
      if (!vector) continue;

      const chunkId = batch[j]?.id;
      if (!chunkId) continue;

      // Écriture via $executeRaw pour le type Postgres vector
      await db.$executeRaw`
        UPDATE "knowledge_chunks"
        SET embedding = ${JSON.stringify(vector)}::vector
        WHERE id = ${chunkId}
      `;
    }

    // Pause courte pour ne pas saturer l'API OpenAI
    if (i + EMBED_BATCH < chunks.length) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  console.log(`[BDPM Embeddings] Vectorisation terminée — ${chunks.length} chunks (batch ${batchId})`);
}
