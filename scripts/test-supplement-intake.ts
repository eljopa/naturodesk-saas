/**
 * Test complet du pipeline supplements V2 (intake structuré + findings).
 *
 * Usage :
 *   npx tsx scripts/test-supplement-intake.ts --mock
 *   npx tsx scripts/test-supplement-intake.ts <consultationId>
 *
 * Mode --mock :
 *   Crée une consultation temporaire avec les 7 cas de test canoniques,
 *   exécute le pipeline, affiche le résultat détaillé, puis nettoie.
 *
 * Cas couverts :
 *   1. "magnésium bisglycinate 200mg, 1 gélule matin"  → variante CHELATE + dose HIGH
 *   2. "magnésium marin 300mg par jour"               → variante MARINE + declared daily
 *   3. "Vitamine D3 2000 UI le matin"                 → variante D3 + timing
 *   4. "oméga 3 EPA/DHA 1000mg"                       → variante EPA_DHA
 *   5. "glutamine poudre 5g"                          → parent résolu, pas variante, pas ODS → TERRAIN
 *   6. "probiotiques 10 milliards"                    → dosePerUnit en milliards
 *   7. "SuperGreens ProFormula"                       → non reconnu → QUESTION
 */

import { db } from "../lib/db";
import { runSupplementAnalysis } from "../lib/knowledge/supplements/supplement-runner";
import { parseSupplementIntake } from "../lib/knowledge/supplements/services/parse-supplement-intake";

// ---------------------------------------------------------------------------
// Jeu de test
// ---------------------------------------------------------------------------

const MOCK_SUPPLEMENTS = [
  "magnésium bisglycinate 200mg, 1 gélule matin",
  "magnésium marin 300mg par jour",
  "Vitamine D3 2000 UI le matin",
  "oméga 3 EPA/DHA 1000mg",
  "glutamine poudre 5g",
  "probiotiques 10 milliards",
  "SuperGreens ProFormula",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage:");
    console.error("  npx tsx scripts/test-supplement-intake.ts --mock");
    console.error("  npx tsx scripts/test-supplement-intake.ts <consultationId>");
    process.exit(1);
  }

  // Afficher d'abord le parsing statique (sans DB)
  printParsePreview();

  if (arg === "--mock") {
    await runWithMockConsultation();
  } else {
    await runWithRealConsultation(arg);
  }
}

// ---------------------------------------------------------------------------
// Parsing preview (statique, sans DB)
// ---------------------------------------------------------------------------

function printParsePreview() {
  console.log("\n" + "=".repeat(70));
  console.log("PARSING STATIQUE (sans DB)");
  console.log("=".repeat(70));

  for (const raw of MOCK_SUPPLEMENTS) {
    const p = parseSupplementIntake(raw);
    console.log(`\n  ▸ "${raw}"`);
    console.log(`    parsedLabel    : ${p.parsedLabel ?? "—"}`);
    console.log(`    normalizedKey  : ${p.normalizedKey ?? "—"}`);
    if (p.dosePerUnitValue !== null)
      console.log(`    dosePerUnit    : ${p.dosePerUnitValue} ${p.dosePerUnitUnit}`);
    if (p.declaredDailyDoseValue !== null)
      console.log(`    declaredDaily  : ${p.declaredDailyDoseValue} ${p.declaredDailyDoseUnit}`);
    if (p.estimatedDailyDoseValue !== null)
      console.log(`    estimatedDaily : ${p.estimatedDailyDoseValue} ${p.estimatedDailyDoseUnit}`);
    if (p.unitsPerIntake !== null)
      console.log(`    unitsPerIntake : ${p.unitsPerIntake}`);
    if (p.intakesPerDay !== null)
      console.log(`    intakesPerDay  : ${p.intakesPerDay}`);
    if (p.timingText)
      console.log(`    timing         : ${p.timingText}`);
    if (p.durationText)
      console.log(`    duration       : ${p.durationText}`);
    console.log(`    parseStatus    : ${p.parseStatus}   parseConf: ${p.parseConfidence}`);
  }
}

// ---------------------------------------------------------------------------
// Mode --mock
// ---------------------------------------------------------------------------

async function runWithMockConsultation() {
  console.log("\n" + "=".repeat(70));
  console.log("MODE MOCK — pipeline complet");
  console.log("=".repeat(70));

  let patient = await db.patient.findFirst({ select: { id: true } });
  let createdPatient = false;

  if (!patient) {
    const user = await db.user.findFirst({ select: { id: true } });
    if (!user) {
      console.error("✗ Aucun user en base");
      process.exit(1);
    }
    patient = await db.patient.create({
      data: { userId: user.id, firstName: "Test", lastName: "Intake" },
      select: { id: true },
    });
    createdPatient = true;
  }

  const consultation = await db.consultation.create({
    data: {
      patientId:   patient.id,
      status:      "DRAFT",
      supplements: { create: MOCK_SUPPLEMENTS.map((name) => ({ name })) },
    },
    select: { id: true },
  });

  console.log(`\nConsultation : ${consultation.id}`);

  try {
    await runAndPrint(consultation.id);
  } finally {
    // Cleanup dans l'ordre des FK
    const runs = await db.analysisRun.findMany({
      where: { consultationId: consultation.id }, select: { id: true },
    });
    for (const run of runs) {
      const findings = await db.finding.findMany({
        where: { analysisRunId: run.id }, select: { id: true },
      });
      for (const f of findings) {
        await db.citation.deleteMany({ where: { findingId: f.id } });
      }
      await db.finding.deleteMany({ where: { analysisRunId: run.id } });
      await db.analysisRun.delete({ where: { id: run.id } });
    }
    await db.consultationSupplementIntake.deleteMany({ where: { consultationId: consultation.id } });
    await db.supplement.deleteMany({ where: { consultationId: consultation.id } });
    await db.consultation.delete({ where: { id: consultation.id } });
    if (createdPatient) await db.patient.delete({ where: { id: patient.id } });
    console.log("\n[cleanup] ✓ Données de test supprimées");
  }
}

// ---------------------------------------------------------------------------
// Mode consultation réelle
// ---------------------------------------------------------------------------

async function runWithRealConsultation(consultationId: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`TEST — consultation=${consultationId}`);
  console.log("=".repeat(70));
  await runAndPrint(consultationId);
}

// ---------------------------------------------------------------------------
// Exécution + affichage
// ---------------------------------------------------------------------------

async function runAndPrint(consultationId: string) {
  console.log("\nDémarrage pipeline...\n");

  const summary = await runSupplementAnalysis(consultationId);

  // ── Résumé global ─────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(70));
  console.log("RÉSUMÉ");
  console.log("─".repeat(70));
  console.log(`  consultationId        : ${summary.consultationId}`);
  console.log(`  analysisRunId         : ${summary.analysisRunId}`);
  console.log(`  inputCount            : ${summary.inputCount}`);
  console.log(`  matchedCount          : ${summary.matchedCount}`);
  console.log(`  unmatchedCount        : ${summary.unmatchedCount}`);
  console.log(`  withOdsCount          : ${summary.withOdsCount}`);
  console.log(`  duplicateCount        : ${summary.duplicateCount}`);
  console.log(`  variantsResolvedCount : ${summary.variantsResolvedCount}`);
  console.log(`  intakesCreated        : ${summary.intakesCreated}`);
  console.log(`  findingsCreated       : ${summary.findingsCreated}`);
  console.log(`  findingsSkipped       : ${summary.findingsSkipped}`);
  console.log(`  durationMs            : ${summary.durationMs}ms`);

  if (summary.errors.length > 0) {
    console.log(`\n⚠ Erreurs (${summary.errors.length}) :`);
    for (const e of summary.errors) console.log(`  [${e.context}] ${e.error}`);
  }

  // ── Intakes structurés ────────────────────────────────────────────────────
  const intakes = await db.consultationSupplementIntake.findMany({
    where:   { consultationId },
    include: {
      knowledgeTerm:        { select: { canonicalName: true } },
      knowledgeTermVariant: { select: { label: true, variantType: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n" + "─".repeat(70));
  console.log(`INTAKES STRUCTURÉS (${intakes.length})`);
  console.log("─".repeat(70));

  for (const intake of intakes) {
    console.log(`\n  ▸ "${intake.rawText}"`);
    console.log(`    parsedLabel    : ${intake.parsedLabel ?? "—"}`);
    console.log(`    parent         : ${intake.knowledgeTerm?.canonicalName ?? "non reconnu"}`);
    console.log(`    variante       : ${intake.knowledgeTermVariant?.label ?? "—"} ${intake.knowledgeTermVariant ? `[${intake.knowledgeTermVariant.variantType}]` : ""}`);
    if (intake.dosePerUnitValue !== null)
      console.log(`    dosePerUnit    : ${intake.dosePerUnitValue} ${intake.dosePerUnitUnit ?? ""}`);
    if (intake.declaredDailyDoseValue !== null)
      console.log(`    declaredDaily  : ${intake.declaredDailyDoseValue} ${intake.declaredDailyDoseUnit ?? ""}`);
    if (intake.estimatedDailyDoseValue !== null)
      console.log(`    estimatedDaily : ${intake.estimatedDailyDoseValue} ${intake.estimatedDailyDoseUnit ?? ""}`);
    if (intake.unitsPerIntake !== null)
      console.log(`    unitsPerIntake : ${intake.unitsPerIntake}`);
    if (intake.intakesPerDay !== null)
      console.log(`    intakesPerDay  : ${intake.intakesPerDay}`);
    if (intake.timingText)
      console.log(`    timing         : ${intake.timingText}`);
    console.log(`    parseStatus    : ${intake.parseStatus}   parseConf: ${intake.parseConfidence}   resolConf: ${intake.resolutionConfidence ?? "—"}`);
  }

  // ── Findings ──────────────────────────────────────────────────────────────
  const findings = await db.finding.findMany({
    where:   { analysisRunId: summary.analysisRunId },
    include: { citations: { select: { id: true } } },
    orderBy: [{ riskLevel: "asc" }, { category: "asc" }],
  });

  if (findings.length > 0) {
    console.log("\n" + "─".repeat(70));
    console.log(`FINDINGS (${findings.length})`);
    console.log("─".repeat(70));
    for (const f of findings) {
      const risk = f.riskLevel ?? "—";
      console.log(`  [${f.category.padEnd(12)}] [${risk.padEnd(13)}] ${f.title.slice(0, 65)}`);
      if (f.citations.length > 0)
        console.log(`    └─ ${f.citations.length} citation(s)`);
    }
  }

  console.log("\n✓ Test terminé\n");
}

main().catch((err) => {
  console.error("\n✗ Échec :", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
