/**
 * Service orchestrateur d'import documentaire.
 *
 * Séquence pour chaque document :
 *   1. parseDocument()          — transformation source → ParsedDocument
 *   2. upsertSync(RUNNING)      — traçabilité début
 *   3. createDocument()         — persistance idempotente
 *   4. createChunks()           — insertion des chunks (si document nouveau)
 *   5. upsertSync(DONE|ERROR)   — traçabilité fin
 *
 * Les embeddings (Phase 3) seront ajoutés après cette étape,
 * via un service dédié qui lit les chunks sans embedding.
 */

import type { KnowledgeSourceType, SyncStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { parseDocument } from "./parse";
import { createDocument } from "./document";
import { createChunks } from "./chunks";
import type { SourceDocumentInput, ImportResult } from "../types";

// ---------------------------------------------------------------------------
// Import principal
// ---------------------------------------------------------------------------

/**
 * Importe un document source dans la knowledge base.
 * Gère idempotence, traçabilité sync, et logs serveur.
 */
export async function importDocument(
  input: SourceDocumentInput
): Promise<ImportResult> {
  const startedAt = Date.now();

  console.log(
    `[knowledge:import] ▶ ${input.drugKey} [${input.sourceType}] — parsing ${input.sections.length} sections`
  );

  await upsertSync(input.drugKey, input.sourceType, "RUNNING");

  try {
    // Étape 1 — Parse
    const parsed = parseDocument(input);

    // Étape 2 — Document (idempotent)
    const { document, created } = await createDocument(parsed);

    if (!created) {
      console.log(
        `[knowledge:import] ↩ ${input.drugKey} — déjà importé (même hash), skip`
      );
      await upsertSync(input.drugKey, input.sourceType, "DONE", {
        docCount: 0,
        chunkCount: 0,
      });
      return {
        documentId: document.id,
        drugKey: input.drugKey,
        chunksCreated: 0,
        skipped: true,
        durationMs: Date.now() - startedAt,
      };
    }

    // Étape 3 — Chunks
    const chunksCreated = await createChunks(document.id, parsed.chunks);

    await upsertSync(input.drugKey, input.sourceType, "DONE", {
      docCount: 1,
      chunkCount: chunksCreated,
    });

    const durationMs = Date.now() - startedAt;
    console.log(
      `[knowledge:import] ✓ ${input.drugKey} — ${chunksCreated} chunks créés en ${durationMs}ms`
    );

    return {
      documentId: document.id,
      drugKey: input.drugKey,
      chunksCreated,
      skipped: false,
      durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[knowledge:import] ✗ ${input.drugKey} — erreur: ${message}`);

    await upsertSync(input.drugKey, input.sourceType, "ERROR", {
      errorMessage: message,
    });

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Helper — KnowledgeSourceSync
// ---------------------------------------------------------------------------

interface SyncUpdateOpts {
  docCount?: number;
  chunkCount?: number;
  errorMessage?: string;
}

/** Crée ou met à jour le suivi de synchronisation pour un (sourceType, drugKey). */
async function upsertSync(
  drugKey: string,
  sourceType: KnowledgeSourceType,
  status: SyncStatus,
  opts?: SyncUpdateOpts
): Promise<void> {
  const now = new Date();
  const isTerminal = status === "DONE" || status === "ERROR";

  try {
    await db.knowledgeSourceSync.upsert({
      where: { sourceType_drugKey: { sourceType, drugKey } },
      create: {
        drugKey,
        sourceType,
        status,
        lastSyncAt: isTerminal ? now : null,
        docCount: opts?.docCount ?? 0,
        chunkCount: opts?.chunkCount ?? 0,
        errorMessage: opts?.errorMessage ?? null,
      },
      update: {
        status,
        ...(isTerminal ? { lastSyncAt: now } : {}),
        ...(opts?.docCount !== undefined ? { docCount: opts.docCount } : {}),
        ...(opts?.chunkCount !== undefined ? { chunkCount: opts.chunkCount } : {}),
        ...(opts?.errorMessage !== undefined
          ? { errorMessage: opts.errorMessage }
          : { errorMessage: null }),
      },
    });
  } catch (syncError) {
    // Ne jamais bloquer l'import principal sur un échec de sync log
    console.warn(
      `[knowledge:import] Avertissement — échec upsertSync pour ${drugKey}: ${syncError}`
    );
  }
}
