/**
 * POST /api/knowledge/ods/import
 *
 * Webhook d'import ODS — appelé par n8n (workflow ods_collect_workflow)
 * ou manuellement pour déclencher une ingestion sans passer par le script CLI.
 *
 * Authentification : header x-api-key = env KNOWLEDGE_IMPORT_SECRET
 *
 * Body JSON :
 *   {}                           → importe tous les termes avec odsId
 *   { "key": "magnesium" }       → importe un seul terme (normalizedKey)
 *   { "keys": ["mg","zinc"] }    → importe une sélection de termes
 *
 * Réponse :
 *   200 { imported, skipped, errors, durationMs }
 *   400 body invalide
 *   401 clé absente ou incorrecte
 *   500 erreur inattendue
 *
 * Timeout applicatif : Next.js route handlers à durée longue.
 * Penser à configurer maxDuration dans next.config.ts si déployé sur Vercel.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { importOdsTerm, importAllOdsTerms } from "@/lib/knowledge/ingestion/ods/ods-import";

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

function isAuthorized(req: Request): boolean {
  const secret = process.env.KNOWLEDGE_IMPORT_SECRET;
  if (!secret) {
    console.error("[ods/import] KNOWLEDGE_IMPORT_SECRET non défini.");
    return false;
  }
  return req.headers.get("x-api-key") === secret;
}

// ---------------------------------------------------------------------------
// Validation body
// ---------------------------------------------------------------------------

const BodySchema = z
  .object({
    key:  z.string().min(1).optional(),
    keys: z.array(z.string().min(1)).optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema> = undefined;

  try {
    const text = await req.text();
    if (text.trim()) {
      body = BodySchema.parse(JSON.parse(text));
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // ── Import d'un terme unique ───────────────────────────────────────────
    if (body?.key) {
      const result = await importOdsTerm(body.key);
      return NextResponse.json({
        mode:         "single",
        normalizedKey: body.key,
        imported:     result.skipped ? 0 : 1,
        skipped:      result.skipped ? 1 : 0,
        chunksCreated: result.chunksCreated,
        durationMs:   result.durationMs,
      });
    }

    // ── Import d'une sélection ────────────────────────────────────────────
    if (body?.keys && body.keys.length > 0) {
      const result = await importAllOdsTerms(body.keys);
      return NextResponse.json({ mode: "selection", ...result });
    }

    // ── Import complet ────────────────────────────────────────────────────
    const result = await importAllOdsTerms();
    return NextResponse.json({ mode: "all", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ods/import] Erreur :", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
