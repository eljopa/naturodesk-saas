/**
 * GET /api/cron/generate-blog-article
 *
 * Déclenché par Vercel Cron (voir vercel.json, Lun/Mer/Ven), rejouable
 * manuellement depuis l'admin ("Générer maintenant"). Vercel envoie une
 * requête GET avec l'en-tête `Authorization: Bearer $CRON_SECRET` dès que
 * cette variable d'environnement est définie — c'est ce header qu'on vérifie
 * ici, pas de logique custom à écrire (spec §9).
 *
 * Exécute un seul run du pipeline (lib/blog/pipeline/run-generation.ts) :
 * sélection du sujet, génération FR, adaptation EN, sauvegarde. Le kill
 * switch BLOG_AUTOPUBLISH_ENABLED et les erreurs de génération sont gérés à
 * l'intérieur de runBlogGenerationOnce(), qui ne lève jamais.
 */

import { NextRequest, NextResponse } from "next/server";
import { runBlogGenerationOnce } from "@/lib/blog/pipeline/run-generation";

// Génération FR + adaptation EN = deux appels OpenAI séquentiels, potentiellement longs.
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/generate-blog-article] CRON_SECRET non définie");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runBlogGenerationOnce();
  const httpStatus = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status: httpStatus });
}
