/**
 * POST /api/analysis/clinical
 *
 * Lance le moteur d'analyse clinique V1 sur des symptômes + médicaments déclarés.
 *
 * Authentification : session Supabase requise.
 * Logique        : 100% déterministe — aucun LLM requis.
 * Persistance    : ClinicalAnalysis + AnalysisItem[] écrits en base.
 *
 * Codes de retour :
 *   201  Analyse créée avec succès (DONE)
 *   400  Payload JSON invalide ou données Zod incorrectes
 *   401  Non authentifié
 *   404  consultationId fourni mais consultation non trouvée ou non accessible
 *   500  Erreur interne du moteur d'analyse
 *
 * Body JSON attendu :
 * {
 *   "rawSymptoms":    "fatigue, insomnie, céphalée",
 *   "drugs":          [{ "name": "sertraline", "dosage": "50mg/j" }],
 *   "consultationId": "uuid-optionnel",
 *   "assessedAt":     "2026-04-14T10:00:00Z"  // optionnel, défaut: now()
 * }
 *
 * Réponse 201 :
 * {
 *   "analysisId":   "uuid",
 *   "status":       "DONE",
 *   "meta": {
 *     "itemCount":          3,
 *     "tier1Count":         3,
 *     "tier2Count":         0,
 *     "tier4Count":         0,
 *     "unresolvedDrugs":    [],
 *     "unmatchedSymptoms":  [],
 *     "durationMs":         412
 *   },
 *   "summary": "Effets indésirables documentés (RCP) : ...",
 *   "items": [...]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError }                  from "zod";
import { getCurrentUser }            from "@/lib/auth";
import { db }                        from "@/lib/db";
import { handleApiError }            from "@/lib/errors";
import { ClinicalAnalysisRequestSchema } from "@/lib/validators/clinical-analysis";
import { runClinicalAnalysis }       from "@/lib/clinical/run-analysis";

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const reqStart = Date.now();

  // ── Authentification ───────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentification requise" } },
      { status: 401 },
    );
  }

  // ── Parsing JSON ───────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Body JSON invalide ou absent" } },
      { status: 400 },
    );
  }

  // ── Validation Zod ─────────────────────────────────────────────────────────
  let payload: ReturnType<typeof ClinicalAnalysisRequestSchema.parse>;
  try {
    payload = ClinicalAnalysisRequestSchema.parse(rawBody);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code:    "VALIDATION_ERROR",
            message: "Données d'entrée invalides",
            issues:  err.issues,
          },
        },
        { status: 400 },
      );
    }
    return handleApiError(err);
  }

  // ── Vérification consultationId (appartenance) ─────────────────────────────
  if (payload.consultationId) {
    const consultation = await db.consultation.findFirst({
      where: {
        id:        payload.consultationId,
        patient:   { userId: user.id },
      },
      select: { id: true },
    });
    if (!consultation) {
      return NextResponse.json(
        {
          error: {
            code:    "NOT_FOUND",
            message: `Consultation ${payload.consultationId} introuvable ou inaccessible`,
          },
        },
        { status: 404 },
      );
    }
  }

  // ── Pipeline clinique ──────────────────────────────────────────────────────
  console.log(
    `[POST /api/analysis/clinical] démarrage — user=${user.id} ` +
    `symptoms="${payload.rawSymptoms.slice(0, 80)}${payload.rawSymptoms.length > 80 ? "…" : ""}" ` +
    `drugs=${payload.drugs.map((d) => d.name).join(", ")}`,
  );

  let result;
  try {
    result = await runClinicalAnalysis({
      userId:         user.id,
      consultationId: payload.consultationId,
      rawSymptoms:    payload.rawSymptoms,
      drugs:          payload.drugs.map((d) => ({
        name:                d.name,
        dosage:              d.dosage,
        startedAt:           d.startedAt ? new Date(d.startedAt) : undefined,
        stoppedAt:           d.stoppedAt ? new Date(d.stoppedAt) : undefined,
        resolvedSubstanceId: d.resolvedSubstanceId,
      })),
      assessedAt: payload.assessedAt ? new Date(payload.assessedAt) : undefined,
    });
  } catch (err) {
    console.error("[POST /api/analysis/clinical] Erreur moteur :", err);
    return handleApiError(err);
  }

  // ── Logging post-pipeline ──────────────────────────────────────────────────
  console.log(
    `[POST /api/analysis/clinical] terminé — user=${user.id} ` +
    `analysisId=${result.analysisId} ` +
    `items=${result.itemCount} (T1=${result.tier1Count} T2=${result.tier2Count} T4=${result.tier4Count}) ` +
    `unresolvedDrugs=${result.unresolvedDrugs.length} ` +
    `unmatchedSymptoms=${result.unmatchedSymptoms.length} ` +
    `${result.durationMs}ms`,
  );

  if (result.unresolvedDrugs.length > 0) {
    console.warn(
      `[POST /api/analysis/clinical] médicaments non résolus : ${result.unresolvedDrugs.join(", ")}`,
    );
  }

  // ── Chargement des items pour la réponse ──────────────────────────────────
  const items = await db.analysisItem.findMany({
    where:   { analysisId: result.analysisId },
    include: {
      symptomTerm:       { select: { normalizedKey: true, label: true, category: true } },
      drugSubstance:     { select: { normalizedKey: true, canonicalName: true } },
      sideEffect: {
        select: {
          effectType:    true,
          frequency:     true,
          severity:      true,
          temporality:   true,
          evidenceLevel: true,
          mechanism:     true,
          source:        { select: { shortLabel: true, type: true } },
        },
      },
      nutrientDepletion: {
        select: {
          nutrient:      true,
          nutrientKey:   true,
          mechanism:     true,
          evidenceLevel: true,
          source:        { select: { shortLabel: true, type: true } },
        },
      },
    },
    orderBy: [{ tier: "asc" }, { confidenceScore: "desc" }],
  });

  // ── Réponse 201 ───────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      analysisId: result.analysisId,
      status:     result.status,

      meta: {
        itemCount:         result.itemCount,
        tier1Count:        result.tier1Count,
        tier2Count:        result.tier2Count,
        tier4Count:        result.tier4Count,
        unresolvedDrugs:   result.unresolvedDrugs,
        unmatchedSymptoms: result.unmatchedSymptoms,
        durationMs:        result.durationMs,
        totalDurationMs:   Date.now() - reqStart,
      },

      summary: result.summary,

      items: items.map((item) => ({
        id:                  item.id,
        tier:                item.tier,
        symptom: item.symptomTerm
          ? {
              normalizedKey: item.symptomTerm.normalizedKey,
              label:         item.symptomTerm.label,
              category:      item.symptomTerm.category,
            }
          : null,
        rawSymptomFragment:  item.rawSymptomFragment,
        substance: item.drugSubstance
          ? {
              normalizedKey: item.drugSubstance.normalizedKey,
              canonicalName: item.drugSubstance.canonicalName,
            }
          : null,
        source: item.sideEffect?.source ?? item.nutrientDepletion?.source ?? null,
        mechanism:           item.sideEffect?.mechanism ?? item.nutrientDepletion?.mechanism ?? null,
        nutrient:            item.nutrientDepletion
          ? { label: item.nutrientDepletion.nutrient, key: item.nutrientDepletion.nutrientKey }
          : null,
        scoring: {
          confidenceScore:    item.confidenceScore,
          confidencePct:      Math.round(item.confidenceScore * 100),
          frequencyFactor:    item.frequencyFactor,
          evidenceCeiling:    item.evidenceCeiling,
          temporalModifier:   item.temporalModifier,
          corroborationBoost: item.corroborationBoost,
        },
        evidenceLevel:        item.sideEffect?.evidenceLevel ?? item.nutrientDepletion?.evidenceLevel ?? null,
        frequency:            item.sideEffect?.frequency     ?? null,
        severity:             item.sideEffect?.severity      ?? null,
        temporality:          item.sideEffect?.temporality   ?? null,
        effectType:           item.sideEffect?.effectType    ?? null,
        corroborated:         item.corroborationBoost > 0,
        knowledgeFactId:      item.knowledgeFactId,
      })),
    },
    { status: 201 },
  );
}
