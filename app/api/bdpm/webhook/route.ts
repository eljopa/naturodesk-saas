/**
 * POST /api/bdpm/webhook
 *
 * Webhook unifié BDPM — appelé par n8n quand un lot est prêt dans Supabase Storage.
 * Lance Pipeline A (drug_* — matching) ET Pipeline B (knowledge_* — vectorisation).
 *
 * Sécurité — trois niveaux :
 *   1. Bearer token   : Authorization: Bearer <BDPM_WEBHOOK_SECRET>
 *   2. Signature HMAC : X-NaturoDesk-Signature: sha256=<hmac_hex>
 *   3. Anti-rejeu     : emittedAt < 5 minutes
 *
 * Règle critique : req.text() AVANT JSON.parse() — HMAC porte sur les octets bruts.
 *
 * Idempotence (Pipeline A) :
 *   - DrugSyncBatch.batchRef DONE  → 200 already_completed
 *   - DrugSyncBatch.batchRef RUNNING → 409 already_processing
 *   - absent / ERROR / PENDING → ingestion lancée
 *
 * Idempotence (Pipeline B) :
 *   - BdpmSyncRecord upsert en "processing" avant waitUntil
 *
 * Codes de retour :
 *   202 — accepted + ingestion_scheduled
 *   200 — already_completed (idempotent, pas de re-traitement)
 *   401 — Bearer ou HMAC invalide, ou request_expired
 *   409 — already_processing
 *   422 — partial_failure (fichiers requis manquants) ou payload invalide
 *   500 — misconfiguration serveur
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { db } from "@/lib/db";
import { runBdpmFromStorage } from "@/lib/bdpm/webhook-runner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BdpmWebhookPayload {
  event:           string;        // "bdpm.batch.ready"
  emittedAt:       string;        // ISO 8601
  batchId:         string;        // ex: "2026-04" — devient batchRef DrugSyncBatch
  downloadedAt?:   string;
  source?:         string;
  storageProvider?: string;
  storageBucket:   string;
  storagePath:     string;        // chemin racine du lot dans le bucket
  globalStatus:    "success" | "partial_success" | "partial_failure";
  summary?: {
    totalFiles:     number;
    successCount:   number;
    errorCount:     number;
    requiredErrors: number;
  };
}

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

function verifyHmac(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Clé secrète ────────────────────────────────────────────────────────────
  const secret = process.env.BDPM_WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[bdpm/webhook] Secret non défini (BDPM_WEBHOOK_SECRET ou N8N_WEBHOOK_SECRET)");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // ── Content-Type ───────────────────────────────────────────────────────────
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 400 });
  }

  // ── Body brut (AVANT JSON.parse — HMAC porte sur les octets bruts) ─────────
  const rawBody = await req.text();

  // ── Bearer token ───────────────────────────────────────────────────────────
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Signature HMAC ─────────────────────────────────────────────────────────
  const sigHeader = req.headers.get("x-naturodesk-signature");
  if (!verifyHmac(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Parse JSON ─────────────────────────────────────────────────────────────
  let payload: BdpmWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as BdpmWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // ── Champs requis ──────────────────────────────────────────────────────────
  const { batchId, storageBucket, storagePath, emittedAt, event, globalStatus } = payload;
  if (!batchId || !storageBucket || !storagePath || !emittedAt || event !== "bdpm.batch.ready") {
    return NextResponse.json(
      { error: "invalid_payload", detail: "event, batchId, storageBucket, storagePath, emittedAt sont requis" },
      { status: 400 },
    );
  }

  // ── Anti-rejeu — emittedAt < 5 minutes ─────────────────────────────────────
  const diffMin = Math.abs(Date.now() - new Date(emittedAt).getTime()) / 60_000;
  if (diffMin > 5) {
    return NextResponse.json({ error: "request_expired" }, { status: 401 });
  }

  // ── Rejet métier — fichiers requis en erreur ────────────────────────────────
  if (globalStatus === "partial_failure") {
    return NextResponse.json(
      {
        received:  true,
        batchId,
        action:    "rejected_partial_failure",
        reason:    "Lot rejeté : requiredErrors > 0. Corriger n8n et réessayer.",
      },
      { status: 422 },
    );
  }

  // ── Idempotence Pipeline A — DrugSyncBatch ─────────────────────────────────
  const existingBatch = await db.drugSyncBatch.findUnique({
    where:  { batchRef: batchId },
    select: { id: true, status: true },
  });

  if (existingBatch?.status === "DONE") {
    console.log(`[bdpm/webhook] batchId=${batchId} déjà traité (Pipeline A DONE)`);
    return NextResponse.json({ received: true, batchId, action: "already_completed" });
  }

  if (existingBatch?.status === "RUNNING") {
    console.log(`[bdpm/webhook] batchId=${batchId} déjà en cours (Pipeline A RUNNING)`);
    return NextResponse.json(
      { received: true, batchId, action: "already_processing" },
      { status: 409 },
    );
  }

  // ── Upsert BdpmSyncRecord (Pipeline B tracker) ─────────────────────────────
  const syncRecord = await db.bdpmSyncRecord.upsert({
    where: { source_batchId: { source: "BDPM", batchId } },
    create: {
      source:        "BDPM",
      batchId,
      storageBucket,
      storagePath,
      status:        "processing",
      startedAt:     new Date(),
    },
    update: {
      status:        "processing",
      startedAt:     new Date(),
      completedAt:   null,
      errorMessage:  null,
    },
  });

  console.log(
    `[bdpm/webhook] Accepté — batchId=${batchId} ` +
    `bucket=${storageBucket} path=${storagePath} ` +
    `knowledgeSyncId=${syncRecord.id}`
  );

  // ── Ingestion asynchrone — Pipeline A + B ──────────────────────────────────
  waitUntil(
    runBdpmFromStorage(batchId, storageBucket, storagePath, syncRecord.id).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[bdpm/webhook] Erreur non capturée — batchId=${batchId} : ${msg}`);
      // Marquer Pipeline B en failed (Pipeline A gère son propre statut via ingestBdpm)
      db.bdpmSyncRecord
        .update({
          where: { id: syncRecord.id },
          data:  { status: "failed", completedAt: new Date(), errorMessage: msg.slice(0, 500) },
        })
        .catch(() => {});
    }),
  );

  return NextResponse.json(
    { received: true, batchId, action: "ingestion_scheduled", knowledgeSyncId: syncRecord.id },
    { status: 202 },
  );
}
