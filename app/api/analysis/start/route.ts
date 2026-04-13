/**
 * POST /api/analysis/start
 *
 * Endpoint d'analyse knowledge sécurisé.
 * Lance le pipeline matching + analyse déterministe sur un input consultation.
 *
 * Authentification : session Supabase requise (getCurrentUser).
 * Logique : 100% serveur, aucun LLM, aucune écriture en base.
 *
 * Codes de retour :
 *   200  Analyse exécutée (même si 0 termes reconnus — vérifier meta.termsRecognized)
 *   400  Input invalide (Zod) ou aucun terme fourni
 *   401  Non authentifié
 *   500  Erreur interne
 *
 * Body JSON attendu :
 * {
 *   "medications":               ["metformine", "oméprazole"],   // optionnel
 *   "supplements":               ["omega-3"],                    // optionnel
 *   "nutrients":                 ["calcium"],                    // optionnel
 *   "symptoms":                  ["fatigue"],                    // optionnel
 *   "context":                   "Patient 65 ans, diabète T2",   // optionnel
 *   "includeSemanticComplement": false                           // optionnel, défaut false
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { validateAnalysisInput } from "@/lib/knowledge/api/validator";
import { executeAnalysisPipeline } from "@/lib/knowledge/api/pipeline";
import { buildAnalysisResponse } from "@/lib/knowledge/api/response";

export async function POST(req: NextRequest) {
  try {
    // --- Authentification ---
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentification requise" } },
        { status: 401 }
      );
    }

    // --- Parsing du body ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Body JSON invalide ou absent" } },
        { status: 400 }
      );
    }

    // --- Validation Zod ---
    let input;
    try {
      input = validateAnalysisInput(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Données d'entrée invalides",
              issues: err.issues,
            },
          },
          { status: 400 }
        );
      }
      // Erreur "au moins un terme requis"
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_INPUT",
            message: err instanceof Error ? err.message : "Input vide",
          },
        },
        { status: 400 }
      );
    }

    // --- Pipeline ---
    const { matchResult, analysisResult } = await executeAnalysisPipeline(input);

    // --- Réponse ---
    const response = buildAnalysisResponse(input, matchResult, analysisResult);

    console.log(
      `[POST /api/analysis/start] user=${user.id} ` +
        `terms=${response.meta.termsRecognized}/${response.meta.termsRecognized + response.meta.termsUnrecognized} ` +
        `facts=${response.meta.totalFacts} highestRisk=${response.meta.highestRisk ?? "none"} ` +
        `${response.meta.durationMs}ms`
    );

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[POST /api/analysis/start] Erreur interne :", err);
    return handleApiError(err);
  }
}
