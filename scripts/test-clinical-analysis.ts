/**
 * scripts/test-clinical-analysis.ts
 *
 * Cas de test du moteur d'analyse clinique V1.
 *
 * Cas couverts :
 *   1. Sertraline  — fatigue, insomnie, céphalée (Tier 1 attendu)
 *   2. Metformine  — fatigue, paresthésie        (Tier 1 + Tier 2 dépletion B12)
 *   3. Atorvastatine — fatigue musculaire, myalgie (Tier 1 + Tier 2 dépletion CoQ10)
 *   4. Médicament inconnu + symptômes non catalogués (tout Tier 4)
 *   5. Sertraline arrêtée — insomnie (temporalité incohérente → penalité -0.15)
 *
 * Chaque cas affiche :
 *   - Items par tier avec facteurs de score
 *   - Symptômes non matchés
 *   - Synthèse textuelle
 *   - Durée d'exécution
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/test-clinical-analysis.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient } from "@prisma/client";
import { runClinicalAnalysis } from "@/lib/clinical/run-analysis";
import type { ClinicalAnalysisInput, ClinicalAnalysisResult } from "@/lib/clinical/types";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

function hr(label: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(60));
}

function printResult(result: ClinicalAnalysisResult) {
  console.log(`  analysisId   : ${result.analysisId}`);
  console.log(`  status       : ${result.status}`);
  console.log(`  items        : ${result.itemCount} (T1=${result.tier1Count} T2=${result.tier2Count} T4=${result.tier4Count})`);
  console.log(`  durée        : ${result.durationMs}ms`);

  if (result.unresolvedDrugs.length > 0) {
    console.log(`  ⚠ non résolus : ${result.unresolvedDrugs.join(", ")}`);
  }
  if (result.unmatchedSymptoms.length > 0) {
    console.log(`  ⚠ non matchés : ${result.unmatchedSymptoms.join(", ")}`);
  }

  console.log("\n  Synthèse :");
  for (const line of result.summary.split("\n")) {
    console.log(`  ${line}`);
  }
}

async function printItemDetails(analysisId: string) {
  const items = await db.analysisItem.findMany({
    where: { analysisId },
    include: {
      symptomTerm:       { select: { label: true, normalizedKey: true } },
      drugSubstance:     { select: { canonicalName: true } },
      sideEffect:        { select: { frequency: true, temporality: true, effectType: true, evidenceLevel: true } },
      nutrientDepletion: { select: { nutrient: true, evidenceLevel: true } },
    },
    orderBy: [{ tier: "asc" }, { confidenceScore: "desc" }],
  });

  console.log("\n  Détail des items :");
  for (const item of items) {
    const symptom  = item.symptomTerm?.label ?? item.rawSymptomFragment ?? "?";
    const subst    = item.drugSubstance?.canonicalName ?? "—";
    const scores   = `conf=${(item.confidenceScore * 100).toFixed(0)}% freq=${(item.frequencyFactor * 100).toFixed(0)}% ceil=${(item.evidenceCeiling * 100).toFixed(0)}% temp=${item.temporalModifier >= 0 ? "+" : ""}${(item.temporalModifier * 100).toFixed(0)}% boost=${(item.corroborationBoost * 100).toFixed(0)}%`;

    if (item.tier === "TIER_1_DIRECT") {
      const freq = item.sideEffect?.frequency ?? "?";
      const temp = item.sideEffect?.temporality ?? "?";
      console.log(`  [T1] ${subst} → ${symptom}  ${scores}  freq=${freq} temp=${temp}`);
    } else if (item.tier === "TIER_2_INDIRECT") {
      if (item.nutrientDepletionId) {
        const nutrient = item.nutrientDepletion?.nutrient ?? "?";
        console.log(`  [T2-DEP] ${subst} →[${nutrient}]→ ${symptom}  ${scores}`);
      } else {
        console.log(`  [T2-SEC] ${subst} → ${symptom}  ${scores}`);
      }
    } else {
      console.log(`  [T4] ${symptom} — aucune correspondance structurée`);
    }
  }
}

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

async function runCase(
  label: string,
  input: ClinicalAnalysisInput,
): Promise<void> {
  hr(`CAS ${label}`);
  console.log(`  symptoms : "${input.rawSymptoms}"`);
  console.log(`  drugs    : ${input.drugs.map((d) => d.name + (d.stoppedAt ? " [arrêté]" : "")).join(", ")}`);

  try {
    const result = await runClinicalAnalysis(input);
    printResult(result);
    await printItemDetails(result.analysisId);
  } catch (err) {
    console.error(`  ✗ Erreur : ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Récupère un userId valide depuis la DB
  const user = await db.user.findFirst({ select: { id: true, name: true } });
  if (!user) {
    console.error("Aucun utilisateur en base. Créez d'abord un compte.");
    process.exit(1);
  }
  console.log(`\nUtilisateur de test : ${user.name} (${user.id})\n`);

  const userId = user.id;

  // ── Cas 1 : Sertraline — fatigue, insomnie, céphalée ─────────────────────
  await runCase("1 — Sertraline + fatigue/insomnie/céphalée", {
    userId,
    rawSymptoms: "fatigue, insomnie, céphalée",
    drugs: [{ name: "sertraline" }],
  });

  // ── Cas 2 : Metformine — fatigue, paresthésie ─────────────────────────────
  await runCase("2 — Metformine + fatigue/paresthésie", {
    userId,
    rawSymptoms: "fatigue, paresthésie",
    drugs: [{ name: "metformine" }],
  });

  // ── Cas 3 : Atorvastatine — fatigue musculaire, myalgie ───────────────────
  await runCase("3 — Atorvastatine + fatigue musculaire/myalgie", {
    userId,
    rawSymptoms: "fatigue musculaire, myalgie",
    drugs: [{ name: "atorvastatine" }],
  });

  // ── Cas 4 : Médicament inconnu + symptômes hors catalogue ─────────────────
  await runCase("4 — Médicament inconnu + symptômes non catalogués", {
    userId,
    rawSymptoms: "brouillard mental, frilosité inexpliquée",
    drugs: [{ name: "molécule-inexistante-xyz" }],
  });

  // ── Cas 5 : Sertraline arrêtée — insomnie (temporalité incohérente) ────────
  // L'insomnie est un effet EARLY de la sertraline (survient en début de traitement)
  // Mais ici le médicament est arrêté → temporalModifier = -0.15 (incohérent)
  await runCase("5 — Sertraline arrêtée + insomnie (temporalité incohérente)", {
    userId,
    rawSymptoms: "insomnie",
    drugs: [
      {
        name:      "sertraline",
        stoppedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // arrêtée il y a 3 mois
      },
    ],
  });

  console.log("\n" + "═".repeat(60));
  console.log("  Tests terminés");
  console.log("═".repeat(60) + "\n");
}

main()
  .catch((err) => {
    console.error("Erreur fatale :", err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => db.$disconnect());
