/**
 * GET /api/analysis/findings?consultationId=...
 *
 * Retourne les findings knowledge du dernier run d'une consultation.
 * Réponse orientée UI : findings groupés par bucket, citations incluses.
 *
 * Authentification : session Supabase requise.
 * Autorisation    : la consultation doit appartenir à l'utilisateur connecté.
 *
 * Codes de retour :
 *   200  Succès — run peut être null si aucune analyse n'a encore été faite
 *   400  consultationId manquant ou format invalide
 *   401  Non authentifié
 *   403  Consultation inaccessible (appartient à un autre utilisateur)
 *   404  Consultation introuvable
 *   500  Erreur interne
 *
 * Comportement si aucun run n'existe :
 *   Retourne 200 avec run=null, summary à zéro, tous les buckets vides.
 *   Ce n'est pas une erreur — c'est l'état initial d'une consultation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { verifyConsultationOwnership, getFindingsForKnowledgeRun } from "@/lib/knowledge/read/services/get-findings";
import { getLatestKnowledgeRunForConsultation } from "@/lib/knowledge/read/services/get-run";
import { buildFindingsResponse } from "@/lib/knowledge/read/serializer";

/** Regex UUID v4 simple — validation légère du consultationId. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    // --- Authentification ---
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentification requise" } },
        { status: 401 }
      );
    }

    // --- Validation du paramètre ---
    const consultationId = req.nextUrl.searchParams.get("consultationId");

    if (!consultationId) {
      return NextResponse.json(
        { error: { code: "MISSING_PARAM", message: "Le paramètre consultationId est requis" } },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(consultationId)) {
      return NextResponse.json(
        { error: { code: "INVALID_PARAM", message: "consultationId : format UUID invalide" } },
        { status: 400 }
      );
    }

    // --- Vérification ownership ---
    const ownership = await verifyConsultationOwnership(consultationId, user.id);

    if (ownership === "not_found") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Consultation introuvable" } },
        { status: 404 }
      );
    }

    if (ownership === "forbidden") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Accès non autorisé à cette consultation" } },
        { status: 403 }
      );
    }

    // --- Récupération du dernier run ---
    const run = await getLatestKnowledgeRunForConsultation(consultationId);

    // --- Récupération des findings (vide si pas de run) ---
    const findings = run
      ? await getFindingsForKnowledgeRun(run.id)
      : [];

    // --- Sérialisation ---
    const response = buildFindingsResponse(consultationId, run, findings);

    console.log(
      `[GET /api/analysis/findings] user=${user.id} consultation=${consultationId} ` +
        `run=${run?.id ?? "none"} findings=${findings.length} ` +
        `highestRisk=${response.summary.highestRisk ?? "none"}`
    );

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[GET /api/analysis/findings] Erreur interne :", err);
    return handleApiError(err);
  }
}
