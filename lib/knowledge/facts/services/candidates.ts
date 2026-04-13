/**
 * Récupération des chunks éligibles à l'extraction de faits.
 *
 * Seuls certains kinds sont traitables par les extracteurs déterministes V1 :
 * side_effect, interaction, contraindication, warning.
 *
 * Le filtre SQL sur le kind évite de charger des chunks inutiles
 * (composition, dosage, formulation, etc.) en mémoire.
 *
 * Utilise du SQL brut pour le JOIN (même pattern que candidates.ts embeddings).
 */

import { db } from "@/lib/db";
import type { FactExtractionCandidate } from "../types";

/** Kinds pour lesquels des extracteurs sont définis ou prévus. */
export const FACT_EXTRACTABLE_KINDS = [
  "side_effect",
  "interaction",
  "contraindication",
  "warning",
] as const;

/** Résultat brut de la requête SQL. */
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
 * Retourne les chunks dont le kind est éligible à l'extraction de faits.
 * Inclut tous les chunks (avec ou sans faits déjà extraits) —
 * l'idempotence est gérée au niveau de createKnowledgeFact().
 *
 * @param limit - Nombre maximum de chunks à traiter (défaut : 500)
 */
export async function getChunksEligibleForFactExtraction(
  limit = 500
): Promise<FactExtractionCandidate[]> {
  const kinds = FACT_EXTRACTABLE_KINDS.join("','");

  const rows = await db.$queryRawUnsafe<RawChunkRow[]>(
    `SELECT
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
     WHERE kc.kind IN ('${kinds}')
     ORDER BY kc.created_at ASC
     LIMIT $1`,
    limit
  );

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
