/**
 * lib/bdpm/webhook-runner.ts
 *
 * Runner d'ingestion BDPM depuis Supabase Storage.
 * Déclenché par POST /api/bdpm/webhook après notification n8n.
 *
 * Séquence :
 *   1. Lecture du manifest depuis Supabase Storage
 *   2. Téléchargement sélectif des fichiers BDPM
 *   3. Pipeline A — tables drug_* (matching rapide)
 *   4. Re-link DrugSubstance → KnowledgeTerm (non bloquant)
 *   5. Pipeline B — tables knowledge_* (vectorisation + facts) — non bloquant
 *
 * Pipeline A est critique : son échec marque le batch ERROR.
 * Pipeline B est non bloquant : son échec est loggué, pas propagé.
 */

import { db }                         from "@/lib/db";
import { fetchManifest, downloadBdpmFile } from "@/lib/knowledge/bdpm/storage";
import { ingestBdpm, type BdpmFiles } from "@/lib/bdpm/ingest";
import { parseBdpmFile }              from "@/lib/knowledge/bdpm/parsers";
import { generatePendingEmbeddings }  from "@/lib/knowledge/bdpm/embeddings";
import { linkSubstanceTerms }         from "@/lib/bdpm/link-substance-terms";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunnerResult {
  pipelineA: {
    ok:       boolean;
    batchRef: string;
    details?: {
      productsCreated:  number;
      productsUpdated:  number;
      substancesUpserted: number;
      aliasesCreated:   number;
      durationMs:       number;
    };
    error?: string;
  };
  pipelineB: {
    ok:             boolean;
    filesProcessed: number;
    docsCreated:    number;
    chunksCreated:  number;
    factsCreated:   number;
    error?: string;
  };
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// Fichiers requis pour Pipeline A (matching tables)
const PIPELINE_A_REQUIRED = ["CIS_bdpm.txt", "CIS_COMPO_bdpm.txt", "CIS_CIP_bdpm.txt"] as const;
const PIPELINE_A_OPTIONAL = ["CIS_GENER_bdpm.txt"] as const;

// Fichiers traités par Pipeline B (knowledge tables), avec priorité
const PIPELINE_B_FILES: Array<{ filename: string; priority: number }> = [
  { filename: "CIS_bdpm.txt",       priority: 1 },
  { filename: "CIS_COMPO_bdpm.txt", priority: 1 },
  { filename: "CIS_CPD_bdpm.txt",   priority: 2 },
  { filename: "CIS_MITM.txt",       priority: 2 },
];

// ---------------------------------------------------------------------------
// Runner principal
// ---------------------------------------------------------------------------

export async function runBdpmFromStorage(
  batchId:          string,
  storageBucket:    string,
  storagePath:      string,
  knowledgeSyncId:  string,  // BdpmSyncRecord.id — mis à jour par Pipeline B
): Promise<RunnerResult> {
  console.log(`[webhook-runner] Démarrage — batchId=${batchId} bucket=${storageBucket}`);

  // ── 1. Lecture manifest ───────────────────────────────────────────────────
  const manifest = await fetchManifest(storageBucket, storagePath);

  const okFiles = new Map<string, string>(); // filename → storagePath
  for (const f of manifest.files) {
    if (f.status === "ok") okFiles.set(f.filename, f.storagePath);
  }

  console.log(
    `[webhook-runner] Manifest lu — ` +
    `${manifest.files.length} fichier(s) déclarés, ${okFiles.size} ok`
  );

  // ── 2. Pipeline A ─────────────────────────────────────────────────────────
  const resultA = await runPipelineA(batchId, storageBucket, okFiles);

  // ── 3. Re-link DrugSubstance → KnowledgeTerm (non bloquant) ──────────────
  if (resultA.ok) {
    try {
      const linkResult = await linkSubstanceTerms();
      console.log(
        `[webhook-runner] Re-link ✓ — ` +
        `linked=${linkResult.linked} alreadySet=${linkResult.alreadySet} ` +
        `${linkResult.durationMs}ms`
      );
      if (linkResult.termsMissing.length > 0) {
        console.warn(
          `[webhook-runner] Re-link ⚠ termes manquants : ${linkResult.termsMissing.join(", ")}`
        );
      }
    } catch (err) {
      console.warn(
        `[webhook-runner] Re-link ⚠ — ` +
        (err instanceof Error ? err.message : String(err))
      );
    }
  }

  // ── 4. Pipeline B (non bloquant) ──────────────────────────────────────────
  const resultB = await runPipelineB(batchId, storageBucket, okFiles, knowledgeSyncId);

  console.log(
    `[webhook-runner] Terminé — batchId=${batchId} ` +
    `pipelineA=${resultA.ok ? "ok" : "error"} pipelineB=${resultB.ok ? "ok" : "error"}`
  );

  return { pipelineA: resultA, pipelineB: resultB };
}

// ---------------------------------------------------------------------------
// Pipeline A — tables drug_* (matching)
// ---------------------------------------------------------------------------

async function runPipelineA(
  batchId:       string,
  storageBucket: string,
  okFiles:       Map<string, string>,
): Promise<RunnerResult["pipelineA"]> {
  // Vérifier présence des fichiers requis
  const missing = PIPELINE_A_REQUIRED.filter((f) => !okFiles.has(f));
  if (missing.length > 0) {
    const msg = `Fichiers Pipeline A manquants : ${missing.join(", ")}`;
    console.error(`[webhook-runner] Pipeline A — ${msg}`);
    return { ok: false, batchRef: batchId, error: msg };
  }

  try {
    // Téléchargement en parallèle
    console.log(`[webhook-runner] Pipeline A — téléchargement fichiers...`);

    const [cis, compo, cip, gener] = await Promise.all([
      downloadAndLog(storageBucket, okFiles.get("CIS_bdpm.txt")!,       "CIS_bdpm.txt"),
      downloadAndLog(storageBucket, okFiles.get("CIS_COMPO_bdpm.txt")!, "CIS_COMPO_bdpm.txt"),
      downloadAndLog(storageBucket, okFiles.get("CIS_CIP_bdpm.txt")!,   "CIS_CIP_bdpm.txt"),
      okFiles.has("CIS_GENER_bdpm.txt")
        ? downloadAndLog(storageBucket, okFiles.get("CIS_GENER_bdpm.txt")!, "CIS_GENER_bdpm.txt")
        : Promise.resolve(""),
    ]);

    const files: BdpmFiles = { cis, compo, cip, gener };

    // Ingestion (idempotente — upsert par batchRef)
    console.log(`[webhook-runner] Pipeline A — ingestion démarrée (batchRef=${batchId})`);
    const result = await ingestBdpm(files, batchId);

    if (result.errors.length > 0) {
      // ingestBdpm catch ses erreurs en interne → status ERROR dans DrugSyncBatch
      console.error(`[webhook-runner] Pipeline A — erreur(s) : ${result.errors[0]}`);
      return {
        ok:       false,
        batchRef: batchId,
        error:    result.errors[0],
      };
    }

    console.log(
      `[webhook-runner] Pipeline A ✓ — ` +
      `produits=${result.productsCreated + result.productsUpdated} ` +
      `substances=${result.substancesUpserted} ` +
      `alias=${result.aliasesCreated} ` +
      `${result.durationMs}ms`
    );

    return {
      ok:       true,
      batchRef: batchId,
      details: {
        productsCreated:    result.productsCreated,
        productsUpdated:    result.productsUpdated,
        substancesUpserted: result.substancesUpserted,
        aliasesCreated:     result.aliasesCreated,
        durationMs:         result.durationMs,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook-runner] Pipeline A ✗ — ${msg}`);
    return { ok: false, batchRef: batchId, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Pipeline B — tables knowledge_* (vectorisation)
// ---------------------------------------------------------------------------

async function runPipelineB(
  batchId:         string,
  storageBucket:   string,
  okFiles:         Map<string, string>,
  knowledgeSyncId: string,
): Promise<RunnerResult["pipelineB"]> {
  let filesProcessed = 0;
  let docsCreated    = 0;
  let chunksCreated  = 0;
  let factsCreated   = 0;

  // Fichiers disponibles dans le manifest, triés par priorité
  const toProcess = PIPELINE_B_FILES
    .filter(({ filename }) => okFiles.has(filename))
    .sort((a, b) => a.priority - b.priority);

  if (toProcess.length === 0) {
    console.log(`[webhook-runner] Pipeline B — aucun fichier compatible dans le manifest`);
    await markKnowledgeSync(knowledgeSyncId, "completed", 0, 0, 0, 0);
    return { ok: true, filesProcessed: 0, docsCreated: 0, chunksCreated: 0, factsCreated: 0 };
  }

  console.log(`[webhook-runner] Pipeline B — ${toProcess.length} fichier(s) à traiter`);

  for (const { filename } of toProcess) {
    const storagePath = okFiles.get(filename)!;
    try {
      const content = await downloadAndLog(storageBucket, storagePath, filename);
      const res     = await parseBdpmFile(filename, content, batchId);
      filesProcessed++;
      docsCreated   += res.docsCreated;
      chunksCreated += res.chunksCreated;
      factsCreated  += res.factsCreated;
      console.log(
        `[webhook-runner] Pipeline B ✓ ${filename} — ` +
        `docs=${res.docsCreated} chunks=${res.chunksCreated} facts=${res.factsCreated}`
      );
    } catch (err) {
      // Fichier non bloquant — on continue
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[webhook-runner] Pipeline B ⚠ ${filename} — ${msg}`);
    }
  }

  // Embeddings OpenAI — non bloquant si absent ou timeout
  let embedError: string | undefined;
  try {
    await generatePendingEmbeddings(batchId);
    console.log(`[webhook-runner] Pipeline B — embeddings générés`);
  } catch (err) {
    embedError = err instanceof Error ? err.message : String(err);
    console.warn(`[webhook-runner] Pipeline B ⚠ embeddings — ${embedError}`);
  }

  await markKnowledgeSync(
    knowledgeSyncId,
    embedError && filesProcessed === 0 ? "failed" : "completed",
    filesProcessed, docsCreated, chunksCreated, factsCreated,
    embedError,
  );

  console.log(
    `[webhook-runner] Pipeline B ✓ — ` +
    `files=${filesProcessed} docs=${docsCreated} chunks=${chunksCreated} facts=${factsCreated}`
  );

  return {
    ok:             true,
    filesProcessed,
    docsCreated,
    chunksCreated,
    factsCreated,
    error:          embedError,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function downloadAndLog(
  bucket:      string,
  storagePath: string,
  filename:    string,
): Promise<string> {
  const content = await downloadBdpmFile(bucket, storagePath);
  console.log(`[webhook-runner] ↓ ${filename} (${Math.round(content.length / 1024)} KB)`);
  return content;
}

async function markKnowledgeSync(
  id:             string,
  status:         "completed" | "failed",
  filesProcessed: number,
  docsCreated:    number,
  chunksCreated:  number,
  factsCreated:   number,
  errorMessage?:  string,
): Promise<void> {
  await db.bdpmSyncRecord.update({
    where: { id },
    data: {
      status,
      completedAt:      new Date(),
      filesProcessed,
      documentsCreated: docsCreated,
      chunksCreated,
      factsCreated,
      errorMessage:     errorMessage?.slice(0, 500) ?? null,
    },
  }).catch((err: unknown) => {
    console.warn(
      `[webhook-runner] Impossible de mettre à jour BdpmSyncRecord ${id} : ` +
      (err instanceof Error ? err.message : String(err))
    );
  });
}
