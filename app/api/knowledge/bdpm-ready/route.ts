/**
 * POST /api/knowledge/bdpm-ready
 *
 * Webhook appelé par n8n (Hostinger) quand un lot BDPM est prêt dans Supabase Storage.
 *
 * Sécurité — trois niveaux :
 *   1. Bearer token   : Authorization: Bearer <N8N_WEBHOOK_SECRET>
 *   2. Signature HMAC : X-NaturoDesk-Signature: sha256=<hmac_hex>
 *   3. Anti-rejeu     : emittedAt < 5 minutes
 *
 * Règle critique : req.text() AVANT JSON.parse() — la vérification HMAC porte
 * sur les octets bruts du body, pas sur un objet re-sérialisé.
 *
 * Idempotence :
 *   - batchId "completed" → 200 already_completed
 *   - batchId "processing" → 409 already_processing (état métier normal, pas de retry)
 *   - batchId "failed" ou absent → ingestion lancée
 *
 * Ingestion : waitUntil(@vercel/functions) — garantit la fin même après HTTP response
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { db } from "@/lib/db";
import { startBdpmIngestion } from "@/lib/knowledge/bdpm/ingestion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BdpmBatchReadyPayload {
  event: string;
  emittedAt: string;
  batchId: string;
  downloadedAt: string;
  source: string;
  storageProvider: string;
  storageBucket: string;
  storagePath: string;
  globalStatus: "success" | "partial_success" | "partial_failure";
  summary: {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    emptyCount: number;
    notFoundCount: number;
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
    // timingSafeEqual : comparaison en temps constant — protège contre timing attacks
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    // longueurs différentes → false
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[bdpm-ready] N8N_WEBHOOK_SECRET non défini");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // 1. Content-Type
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 400 });
  }

  // 2. Body brut — AVANT JSON.parse, nécessaire pour vérification HMAC
  const rawBody = await req.text();

  // 3. Bearer token
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 4. Signature HMAC sur rawBody
  if (!verifyHmac(rawBody, req.headers.get("x-naturodesk-signature"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 5. Parse JSON
  let payload: BdpmBatchReadyPayload;
  try {
    payload = JSON.parse(rawBody) as BdpmBatchReadyPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 6. Champs requis
  if (!payload.batchId || payload.event !== "bdpm.batch.ready" || !payload.emittedAt) {
    return NextResponse.json(
      { error: "invalid_payload", detail: "batchId, event et emittedAt sont requis" },
      { status: 400 },
    );
  }

  // 7. Anti-rejeu — emittedAt < 5 minutes
  const diffMin = Math.abs(Date.now() - new Date(payload.emittedAt).getTime()) / 60000;
  if (diffMin > 5) {
    return NextResponse.json({ error: "request_expired" }, { status: 401 });
  }

  const { batchId, storageBucket, storagePath, globalStatus } = payload;

  // 8. Rejet métier — lot incomplet avec erreurs sur fichiers requis
  if (globalStatus === "partial_failure") {
    return NextResponse.json(
      {
        received: true,
        batchId,
        action: "rejected_partial_failure",
        reason: "Lot rejeté : requiredErrors > 0. Corriger n8n et réessayer.",
      },
      { status: 422 },
    );
  }

  // 9. Idempotence
  const existing = await db.bdpmSyncRecord.findFirst({
    where: { source: "BDPM", batchId },
  });

  if (existing?.status === "completed") {
    return NextResponse.json({ received: true, batchId, action: "already_completed" });
  }

  if (existing?.status === "processing") {
    // 409 = état métier normal — n8n ne doit pas retenter
    return NextResponse.json(
      { received: true, batchId, action: "already_processing" },
      { status: 409 },
    );
  }

  // 10. Upsert BdpmSyncRecord en "processing"
  const syncRecord = await db.bdpmSyncRecord.upsert({
    where: { source_batchId: { source: "BDPM", batchId } },
    create: {
      source: "BDPM",
      batchId,
      storageBucket,
      storagePath,
      status: "processing",
      startedAt: new Date(),
    },
    update: {
      status: "processing",
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    },
  });

  // 11. Ingestion asynchrone — waitUntil garantit la fin même après la réponse HTTP
  waitUntil(
    startBdpmIngestion(syncRecord.id, batchId, storageBucket, storagePath).catch((err) => {
      console.error(`[bdpm-ready] Ingestion failed for ${batchId}:`, err);
      db.bdpmSyncRecord
        .update({
          where: { id: syncRecord.id },
          data: { status: "failed", completedAt: new Date(), errorMessage: String(err) },
        })
        .catch(() => {});
    }),
  );

  return NextResponse.json({ received: true, batchId, action: "ingestion_scheduled" });
}
