/**
 * POST /api/bdpm/ingest
 *
 * Webhook d'import BDPM — appelé par n8n (workflow bdpm_sync_workflow).
 *
 * Authentification : header x-api-key = env KNOWLEDGE_IMPORT_SECRET
 *
 * Body JSON :
 * {
 *   "batchRef": "2026-04-10",          // requis — date de l'import (YYYY-MM-DD)
 *   "files": {
 *     "cis":   "<contenu CIS_bdpm.txt>",
 *     "compo": "<contenu CIS_COMPO_bdpm.txt>",
 *     "cip":   "<contenu CIS_CIP_bdpm.txt>",
 *     "gener": "<contenu CIS_GENER_bdpm.txt>"
 *   }
 * }
 *
 * Toutes les clés de "files" sont requises.
 * Les fichiers BDPM sont envoyés en texte brut (pas de base64).
 *
 * Réponses :
 *   202  Import démarré en arrière-plan { batchRef, message }
 *   400  Body invalide
 *   401  Clé API absente ou incorrecte
 *   500  Erreur inattendue
 *
 * L'ingestion s'exécute via after() pour ne pas bloquer la réponse.
 * Vérifier le statut dans la table drug_sync_batches (batchRef unique).
 *
 * Configuration Next.js :
 *   maxDuration doit être >= 300s sur Vercel pour les imports complets.
 */

import { after }       from "next/server";
import { NextResponse } from "next/server";
import { z }           from "zod";
import { ingestBdpm }  from "@/lib/bdpm/ingest";

// Vercel Pro : 300s max pour un import BDPM complet (~15k produits, ~80k compositions)
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

function isAuthorized(req: Request): boolean {
  const secret = process.env.KNOWLEDGE_IMPORT_SECRET;
  if (!secret) {
    console.error("[bdpm/ingest] KNOWLEDGE_IMPORT_SECRET non défini.");
    return false;
  }
  return req.headers.get("x-api-key") === secret;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FilesSchema = z.object({
  cis:   z.string().min(100, "Fichier CIS vide ou trop court"),
  compo: z.string().min(100, "Fichier COMPO vide ou trop court"),
  cip:   z.string().min(100, "Fichier CIP vide ou trop court"),
  gener: z.string().min(10,  "Fichier GENER vide ou trop court"),
});

const BodySchema = z.object({
  batchRef: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "batchRef doit être au format YYYY-MM-DD"),
  files:    FilesSchema,
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parsing du body
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Body invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { batchRef, files } = body;

  console.log(
    `[bdpm/ingest] Import déclenché — batchRef=${batchRef} ` +
    `CIS:${files.cis.length}c COMPO:${files.compo.length}c ` +
    `CIP:${files.cip.length}c GENER:${files.gener.length}c`
  );

  // Ingestion en arrière-plan — la réponse est immédiate
  after(async () => {
    try {
      const result = await ingestBdpm(files, batchRef);
      console.log(
        `[bdpm/ingest] ✓ Terminé — batchRef=${batchRef} ` +
        `produits=${result.productsCreated + result.productsUpdated} ` +
        `substances=${result.substancesUpserted} ` +
        `alias=${result.aliasesCreated} ` +
        `durée=${result.durationMs}ms`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[bdpm/ingest] ✗ Erreur — batchRef=${batchRef} : ${msg}`);
    }
  });

  return NextResponse.json(
    {
      message:  "Import BDPM démarré en arrière-plan",
      batchRef,
      status:   "RUNNING",
    },
    { status: 202 },
  );
}

// ---------------------------------------------------------------------------
// GET — statut du dernier batch
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const batchRef = searchParams.get("batchRef");

  const { db } = await import("@/lib/db");

  const batch = batchRef
    ? await db.drugSyncBatch.findUnique({ where: { batchRef } })
    : await db.drugSyncBatch.findFirst({ orderBy: { createdAt: "desc" } });

  if (!batch) {
    return NextResponse.json({ error: "Aucun batch trouvé" }, { status: 404 });
  }

  return NextResponse.json(batch);
}
