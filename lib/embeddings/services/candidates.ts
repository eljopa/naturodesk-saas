/**
 * Récupération des chunks candidats à l'embedding.
 *
 * Utilise du SQL brut car la colonne `embedding` est de type
 * Unsupported("vector(1536)") dans Prisma — inaccessible via l'ORM.
 *
 * La requête fait un JOIN avec knowledge_documents pour récupérer le drugKey,
 * utile pour les logs et le futur matching par molécule.
 */

import { db } from "@/lib/db";
import type { EmbeddingCandidate } from "../types";

/** Résultat brut de la requête SQL (snake_case PostgreSQL). */
interface RawChunkRow {
  id: string;
  document_id: string;
  drug_key: string;
  kind: string;
  label: string;
  excerpt: string;
  section_path: string | null;
  meta_json: Record<string, string | number | boolean | null> | null;
}

/**
 * Retourne les chunks sans embedding, ordonnés par date de création.
 * La limite évite de charger des milliers de chunks en mémoire lors
 * d'un import BDPM complet.
 *
 * @param limit - Nombre maximum de chunks à retourner (défaut : 500)
 */
export async function getChunksNeedingEmbeddings(
  limit = 500
): Promise<EmbeddingCandidate[]> {
  const rows = await db.$queryRaw<RawChunkRow[]>`
    SELECT
      kc.id,
      kc.document_id,
      kd.drug_key,
      kc.kind,
      kc.label,
      kc.excerpt,
      kc.section_path,
      kc.meta_json
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.embedding IS NULL
    ORDER BY kc.created_at ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    drugKey: row.drug_key,
    kind: row.kind,
    label: row.label,
    excerpt: row.excerpt,
    sectionPath: row.section_path,
    metaJson: row.meta_json,
  }));
}
