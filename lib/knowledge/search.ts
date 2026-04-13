import { db } from "@/lib/db";
import { embedText } from "./embed";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  drugKey: string;
  kind: string;
  label: string;
  excerpt: string;
  sectionPath: string | null;
  score: number; // cosine similarity 0-1
}

interface RawChunkRow {
  id: string;
  document_id: string;
  document_title: string;
  drug_key: string;
  kind: string;
  label: string;
  excerpt: string;
  section_path: string | null;
  score: number;
}

/**
 * Semantic search over the knowledge base using pgvector cosine similarity.
 * Returns chunks ordered by similarity descending.
 */
export async function semanticSearch(
  query: string,
  limit = 5,
  minScore = 0.5
): Promise<SearchResult[]> {
  const embedding = await embedText(query);
  const vectorStr = `[${embedding.map((v) => v.toFixed(8)).join(",")}]`;

  const rows = await db.$queryRawUnsafe<RawChunkRow[]>(
    `SELECT
      kc.id,
      kc.document_id,
      kd.title  AS document_title,
      kd.drug_key,
      kc.kind,
      kc.label,
      kc.excerpt,
      kc.section_path,
      (1 - (kc.embedding <=> '${vectorStr}'::vector)) AS score
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> '${vectorStr}'::vector
    LIMIT $1`,
    limit
  );

  return rows
    .filter((r) => r.score >= minScore)
    .map((r) => ({
      chunkId: r.id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      drugKey: r.drug_key,
      kind: r.kind,
      label: r.label,
      excerpt: r.excerpt,
      sectionPath: r.section_path,
      score: Number(r.score),
    }));
}

/**
 * Multi-query semantic search: runs one query per term, deduplicates by chunkId.
 * Useful for enriching analysis with knowledge about multiple medications.
 */
export async function semanticSearchMulti(
  queries: string[],
  limitPerQuery = 3,
  minScore = 0.55
): Promise<SearchResult[]> {
  if (queries.length === 0) return [];

  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const results = await semanticSearch(query, limitPerQuery, minScore);
      for (const r of results) {
        if (!seen.has(r.chunkId)) {
          seen.add(r.chunkId);
          allResults.push(r);
        }
      }
    } catch {
      // If embedding fails for one query, continue with others
    }
  }

  return allResults.sort((a, b) => b.score - a.score);
}
