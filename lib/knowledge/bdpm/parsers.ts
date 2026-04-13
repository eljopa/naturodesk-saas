/**
 * lib/knowledge/bdpm/parsers.ts
 *
 * Parsers pour les fichiers BDPM → KnowledgeDocument / KnowledgeChunk / KnowledgeTerm / KnowledgeFact
 *
 * Fichiers supportés :
 *   CIS_bdpm.txt      — spécialités (pivot)
 *   CIS_COMPO_bdpm.txt — compositions (substances actives)
 *   CIS_CPD_bdpm.txt  — conditions de prescription/délivrance
 *   CIS_MITM.txt      — liste de vigilance MITM
 *
 * Format : TSV sans en-tête, champs séparés par tabulation, encodage UTF-8
 * (n8n a converti ISO-8859-1 → UTF-8 lors de l'upload Supabase)
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface ParseResult {
  docsCreated: number;
  chunksCreated: number;
  factsCreated: number;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/** Normalise une clé pour KnowledgeTerm.normalizedKey */
function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extrait le nom DCI canonique depuis la dénomination de substance BDPM */
function toCanonicalDci(raw: string): string {
  // Format BDPM : "PARACETAMOL" → "Paracétamol"
  // La correction DCI est faite via la table existante dans lib/bdpm/normalize.ts
  // Ici on applique une capitalisation simple
  const lower = raw.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export async function parseBdpmFile(
  filename: string,
  content: string,
  batchId: string,
): Promise<ParseResult> {
  switch (filename) {
    case "CIS_bdpm.txt":
      return parseCisBdpm(content, batchId);
    case "CIS_COMPO_bdpm.txt":
      return parseCisCompo(content, batchId);
    case "CIS_CPD_bdpm.txt":
      return parseCisCpd(content, batchId);
    case "CIS_MITM.txt":
      return parseCisMitm(content, batchId);
    default:
      // Fichier non supporté — on ignore silencieusement
      return { docsCreated: 0, chunksCreated: 0, factsCreated: 0 };
  }
}

// ---------------------------------------------------------------------------
// CIS_bdpm.txt — Spécialités pharmaceutiques
// Colonnes : [0] CIS | [1] dénomination | [2] forme_pharma | [3] voie_admin
//            [4] statut_AMM | [5] type_proc | [6] etat_comm
// ---------------------------------------------------------------------------

async function parseCisBdpm(content: string, batchId: string): Promise<ParseResult> {
  const lines = content.split("\n").filter((l) => l.trim());
  let docsCreated = 0;
  let chunksCreated = 0;

  const BATCH_SIZE = 500;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);

    for (const line of batch) {
      const cols = line.split("\t");
      if (cols.length < 2) continue;

      const cisCode = cols[0]?.trim();
      const denomination = cols[1]?.trim();
      const forme = cols[2]?.trim() ?? null;
      const voie = cols[3]?.trim() ?? null;
      const etatComm = cols[6]?.trim() ?? null;

      if (!cisCode || !denomination) continue;

      // KnowledgeDocument — une fiche par spécialité
      const doc = await db.knowledgeDocument.upsert({
        where: {
          drugKey_sourceType_contentHash: {
            drugKey: cisCode,
            sourceType: "BDPM",
            contentHash: `cis-${batchId}-${cisCode}`,
          },
        },
        create: {
          drugKey: cisCode,
          sourceType: "BDPM",
          docType: "NOTICE",
          title: denomination,
          contentHash: `cis-${batchId}-${cisCode}`,
          fetchedAt: new Date(),
        },
        update: {
          title: denomination,
          contentHash: `cis-${batchId}-${cisCode}`,
          fetchedAt: new Date(),
        },
      });
      docsCreated++;

      // KnowledgeChunk — chunk de présentation de la spécialité
      const excerptParts = [denomination];
      if (forme) excerptParts.push(`Forme : ${forme}`);
      if (voie) excerptParts.push(`Voie : ${voie}`);
      if (etatComm) excerptParts.push(`État commercialisation : ${etatComm}`);

      await db.knowledgeChunk.upsert({
        where: { id: `cis-chunk-${cisCode}-${batchId}` },
        create: {
          id: `cis-chunk-${cisCode}-${batchId}`,
          documentId: doc.id,
          kind: "PRODUCT_HEADER",
          label: denomination,
          excerpt: excerptParts.join(" — "),
          metaJson: {
            cisCode,
            forme: forme ?? undefined,
            voie: voie ?? undefined,
            etatComm: etatComm ?? undefined,
          },
        },
        update: {
          label: denomination,
          excerpt: excerptParts.join(" — "),
        },
      });
      chunksCreated++;
    }

    // Pause courte pour éviter de saturer le pool de connexions
    if (i + BATCH_SIZE < lines.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  return { docsCreated, chunksCreated, factsCreated: 0 };
}

// ---------------------------------------------------------------------------
// CIS_COMPO_bdpm.txt — Compositions
// Colonnes : [0] CIS | [1] désignation_élément | [2] code_substance
//            [3] dénomination_substance | [4] dosage | [5] ref_dosage
//            [6] nature_composant | [7] num_liaison
//
// Filtre : nature_composant === "SA" (substance active uniquement)
// Chargé en mémoire entier (~10 MB) — traité par batches de 500 lignes DB
// ---------------------------------------------------------------------------

async function parseCisCompo(content: string, batchId: string): Promise<ParseResult> {
  const lines = content.split("\n").filter((l) => l.trim());
  let chunksCreated = 0;
  let factsCreated = 0;

  const BATCH_SIZE = 500;

  // Cache des documentIds pour éviter des requêtes DB répétées
  const docIdCache = new Map<string, string>();

  async function getDocId(cisCode: string): Promise<string | null> {
    if (docIdCache.has(cisCode)) return docIdCache.get(cisCode)!;
    const doc = await db.knowledgeDocument.findFirst({
      where: { drugKey: cisCode, sourceType: "BDPM" },
      select: { id: true },
    });
    if (doc) {
      docIdCache.set(cisCode, doc.id);
      return doc.id;
    }
    return null;
  }

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);

    for (const line of batch) {
      const cols = line.split("\t");
      if (cols.length < 7) continue;

      const cisCode = cols[0]?.trim();
      const codeSubstance = cols[2]?.trim();
      const denomSubstance = cols[3]?.trim();
      const dosage = cols[4]?.trim() ?? null;
      const refDosage = cols[5]?.trim() ?? null;
      const nature = cols[6]?.trim();

      // Ne traiter que les substances actives
      if (nature !== "SA") continue;
      if (!cisCode || !codeSubstance || !denomSubstance) continue;

      const documentId = await getDocId(cisCode);
      if (!documentId) continue; // document parent absent (ex: spécialité filtrée)

      const canonicalDci = toCanonicalDci(denomSubstance);
      const normalizedKey = normalizeKey(denomSubstance);

      // Upsert KnowledgeTerm (DCI)
      await db.knowledgeTerm.upsert({
        where: { normalizedKey },
        create: {
          termType: "DRUG",
          canonicalName: canonicalDci,
          normalizedKey,
          aliases: [denomSubstance.toUpperCase()],
          drugKey: codeSubstance,
        },
        update: {
          drugKey: codeSubstance,
        },
      });

      // KnowledgeChunk composition
      const excerptDosage = dosage ? `${canonicalDci} ${dosage}${refDosage ? " / " + refDosage : ""}` : canonicalDci;

      const chunkId = `compo-chunk-${cisCode}-${codeSubstance}-${batchId}`;
      await db.knowledgeChunk.upsert({
        where: { id: chunkId },
        create: {
          id: chunkId,
          documentId,
          kind: "COMPOSITION",
          label: `Composition — ${canonicalDci}`,
          excerpt: excerptDosage,
          metaJson: {
            cisCode,
            codeSubstance,
            denomination: denomSubstance,
            dosage: dosage ?? undefined,
            refDosage: refDosage ?? undefined,
          },
        },
        update: {
          label: `Composition — ${canonicalDci}`,
          excerpt: excerptDosage,
        },
      });
      chunksCreated++;
    }

    if (i + BATCH_SIZE < lines.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  return { docsCreated: 0, chunksCreated, factsCreated };
}

// ---------------------------------------------------------------------------
// CIS_CPD_bdpm.txt — Conditions de prescription/délivrance
// Colonnes : [0] CIS | [1] condition_prescription_délivrance
// ---------------------------------------------------------------------------

async function parseCisCpd(content: string, batchId: string): Promise<ParseResult> {
  const lines = content.split("\n").filter((l) => l.trim());
  let chunksCreated = 0;

  const BATCH_SIZE = 500;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);

    for (const line of batch) {
      const cols = line.split("\t");
      if (cols.length < 2) continue;

      const cisCode = cols[0]?.trim();
      const condition = cols[1]?.trim();
      if (!cisCode || !condition) continue;

      const doc = await db.knowledgeDocument.findFirst({
        where: { drugKey: cisCode, sourceType: "BDPM" },
        select: { id: true },
      });
      if (!doc) continue;

      const chunkId = `cpd-chunk-${cisCode}-${batchId}`;
      await db.knowledgeChunk.upsert({
        where: { id: chunkId },
        create: {
          id: chunkId,
          documentId: doc.id,
          kind: "PRESCRIPTION_CONDITION",
          label: "Condition de prescription/délivrance",
          excerpt: condition,
          metaJson: { cisCode, condition },
        },
        update: {
          excerpt: condition,
        },
      });
      chunksCreated++;
    }

    if (i + BATCH_SIZE < lines.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  return { docsCreated: 0, chunksCreated, factsCreated: 0 };
}

// ---------------------------------------------------------------------------
// CIS_MITM.txt — Liste de vigilance (médicaments importants à titre médical)
// Colonnes : [0] CIS | [1] motif_liste | [2] ATC | [3] num_liste
// ---------------------------------------------------------------------------

async function parseCisMitm(content: string, batchId: string): Promise<ParseResult> {
  const lines = content.split("\n").filter((l) => l.trim());
  let chunksCreated = 0;
  let factsCreated = 0;

  const BATCH_SIZE = 500;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);

    for (const line of batch) {
      const cols = line.split("\t");
      if (cols.length < 2) continue;

      const cisCode = cols[0]?.trim();
      const motif = cols[1]?.trim();
      const atc = cols[2]?.trim() ?? null;
      if (!cisCode || !motif) continue;

      const doc = await db.knowledgeDocument.findFirst({
        where: { drugKey: cisCode, sourceType: "BDPM" },
        select: { id: true, title: true },
      });
      if (!doc) continue;

      const chunkId = `mitm-chunk-${cisCode}-${batchId}`;
      await db.knowledgeChunk.upsert({
        where: { id: chunkId },
        create: {
          id: chunkId,
          documentId: doc.id,
          kind: "WARNING",
          label: "Médicament important à titre médical (MITM)",
          excerpt: `MITM — ${motif}${atc ? ` (ATC: ${atc})` : ""}`,
          metaJson: { cisCode, motif, atc: atc ?? undefined },
        },
        update: {
          excerpt: `MITM — ${motif}${atc ? ` (ATC: ${atc})` : ""}`,
        },
      });
      chunksCreated++;

      // KnowledgeFact WARNING déterministe
      const chunk = await db.knowledgeChunk.findUnique({ where: { id: chunkId }, select: { id: true } });
      if (chunk) {
        const factId = `fact-mitm-${cisCode}-${batchId}`;
        await db.knowledgeFact.upsert({
          where: { id: factId },
          create: {
            id: factId,
            chunkId: chunk.id,
            documentId: doc.id,
            factType: "WARNING",
            subject: doc.title,
            subjectType: "DRUG",
            predicate: "REQUIRES_MONITORING_WITH",
            object: motif,
            objectType: "CONDITION",
            qualifier: atc ?? undefined,
            confidence: 1.0,
            extractionMethod: "DETERMINISTIC",
          },
          update: {
            object: motif,
            qualifier: atc ?? undefined,
          },
        });
        factsCreated++;
      }
    }

    if (i + BATCH_SIZE < lines.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  return { docsCreated: 0, chunksCreated, factsCreated };
}
