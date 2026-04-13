/**
 * Test du pipeline d'analyse suppléments ODS.
 *
 * Mode 1 — consultation réelle :
 *   npx tsx scripts/test-supplement-analysis.ts <consultationId>
 *
 * Mode 2 — consultation de test créée à la volée :
 *   npx tsx scripts/test-supplement-analysis.ts --mock
 *
 * Le mode --mock crée une consultation temporaire avec des suppléments couvrant
 * les 5 types de findings attendus, puis la supprime après le test.
 *
 * Prérequis :
 *   - Variables d'environnement DATABASE_URL et DIRECT_URL configurées
 *   - Tables seeded (npx tsx scripts/seed-supplement-terms.ts)
 *   - ODS importé pour au moins quelques termes (scripts/ingest-ods-supplements.ts)
 */

import { db } from "../lib/db";
import { runSupplementAnalysis } from "../lib/knowledge/supplements/supplement-runner";

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

/**
 * Suppléments de test couvrant les cas nominaux :
 *
 *   → "magnésium marin 300mg"  : parsing → "magnésium marin" → alias → Magnésium → ODS warnings/interactions
 *   → "Vitamine D3 2000 UI"    : parsing → "Vitamine D3" → alias → Vitamine D → ODS data
 *   → "ashwaganda KSM-66"      : parsing → "ashwaganda KSM-66" → alias (typo) → Ashwagandha → ODS data
 *   → "Oméga 3 EPA/DHA 1000mg" : parsing → "Oméga 3 EPA/DHA" → matching → Oméga-3 → ODS data
 *   → "glutamine poudre 5g"    : parsing → "glutamine" → alias → L-Glutamine → pas d'ODS → TERRAIN
 *   → "magnésium bisglycinate" : parsing → "magnésium bisglycinate" → alias → Magnésium → DUPLICATE
 *   → "SuperGreens ProFormula"  : pas de correspondance → QUESTION
 */
const MOCK_SUPPLEMENTS = [
  "magnésium marin 300mg par jour",
  "Vitamine D3 2000 UI le matin",
  "ashwaganda KSM-66",
  "Oméga 3 EPA/DHA 1000mg",
  "glutamine poudre 5g",
  "magnésium bisglycinate 200mg", // doublon avec magnésium marin → PROTOCOL
  "SuperGreens ProFormula",       // non reconnu → QUESTION
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage:");
    console.error("  npx tsx scripts/test-supplement-analysis.ts <consultationId>");
    console.error("  npx tsx scripts/test-supplement-analysis.ts --mock");
    process.exit(1);
  }

  if (arg === "--mock") {
    await runWithMockConsultation();
  } else {
    await runWithRealConsultation(arg);
  }
}

// ---------------------------------------------------------------------------
// Mode --mock
// ---------------------------------------------------------------------------

async function runWithMockConsultation() {
  console.log("=".repeat(60));
  console.log("Test Supplement Analysis — MODE MOCK");
  console.log("=".repeat(60));

  // Cherche ou crée un patient de test lié au premier user existant
  let patient = await db.patient.findFirst({ select: { id: true } });

  let createdPatient = false;
  if (!patient) {
    const user = await db.user.findFirst({ select: { id: true } });
    if (!user) {
      console.error("✗ Aucun user en base — impossible de créer une consultation de test");
      process.exit(1);
    }
    patient = await db.patient.create({
      data: {
        userId:    user.id,
        firstName: "Test",
        lastName:  "Supplement",
      },
      select: { id: true },
    });
    createdPatient = true;
    console.log(`Patient de test créé : ${patient.id}`);
  }

  // Crée une consultation temporaire
  const consultation = await db.consultation.create({
    data: {
      patientId: patient.id,
      status:    "DRAFT",
      supplements: {
        create: MOCK_SUPPLEMENTS.map((name) => ({ name })),
      },
    },
    select: { id: true },
  });

  console.log(`\nConsultation de test créée : ${consultation.id}`);
  console.log(`Suppléments injectés (${MOCK_SUPPLEMENTS.length}) :`);
  MOCK_SUPPLEMENTS.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log("");

  try {
    await runAndPrint(consultation.id);
  } finally {
    // Nettoyage manuel dans l'ordre des FK :
    // citations → findings → analysisRuns → supplements → consultation → patient
    const runs = await db.analysisRun.findMany({
      where:  { consultationId: consultation.id },
      select: { id: true },
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
    await db.supplement.deleteMany({ where: { consultationId: consultation.id } });
    await db.consultation.delete({ where: { id: consultation.id } });
    console.log(`\n[cleanup] Consultation de test ${consultation.id} supprimée`);
    if (createdPatient) {
      await db.patient.delete({ where: { id: patient.id } });
      console.log(`[cleanup] Patient de test ${patient.id} supprimé`);
    }
  }
}

// ---------------------------------------------------------------------------
// Mode consultation réelle
// ---------------------------------------------------------------------------

async function runWithRealConsultation(consultationId: string) {
  console.log("=".repeat(60));
  console.log(`Test Supplement Analysis — consultation=${consultationId}`);
  console.log("=".repeat(60));

  // Affiche les suppléments de la consultation
  const consultation = await db.consultation.findUnique({
    where:  { id: consultationId },
    select: { supplements: { select: { name: true } } },
  });

  if (!consultation) {
    console.error(`✗ Consultation ${consultationId} introuvable`);
    process.exit(1);
  }

  if (consultation.supplements.length === 0) {
    console.log("↩ Aucun supplément dans cette consultation — rien à analyser");
    process.exit(0);
  }

  console.log(`\nSuppléments (${consultation.supplements.length}) :`);
  consultation.supplements.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
  console.log("");

  await runAndPrint(consultationId);
}

// ---------------------------------------------------------------------------
// Exécution + affichage
// ---------------------------------------------------------------------------

async function runAndPrint(consultationId: string) {
  console.log("Démarrage du pipeline...\n");

  try {
    const summary = await runSupplementAnalysis(consultationId);

    console.log("\n" + "─".repeat(60));
    console.log("RÉSUMÉ DU RUN");
    console.log("─".repeat(60));
    console.log(`  consultationId   : ${summary.consultationId}`);
    console.log(`  analysisRunId    : ${summary.analysisRunId}`);
    console.log(`  inputCount       : ${summary.inputCount}`);
    console.log(`  matchedCount     : ${summary.matchedCount}`);
    console.log(`  unmatchedCount   : ${summary.unmatchedCount}`);
    console.log(`  withOdsCount     : ${summary.withOdsCount}`);
    console.log(`  duplicateCount   : ${summary.duplicateCount}`);
    console.log(`  findingsCreated  : ${summary.findingsCreated}`);
    console.log(`  findingsSkipped  : ${summary.findingsSkipped}`);
    console.log(`  durationMs       : ${summary.durationMs}ms`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠ Erreurs partielles (${summary.errors.length}) :`);
      for (const e of summary.errors) {
        console.log(`  [${e.context}] ${e.error}`);
      }
    } else {
      console.log("\n✓ Aucune erreur");
    }

    // Affiche les findings créés pour vérification
    if (summary.findingsCreated > 0) {
      const findings = await db.finding.findMany({
        where:   { analysisRunId: summary.analysisRunId },
        select:  { category: true, riskLevel: true, title: true, citations: { select: { id: true } } },
        orderBy: [{ riskLevel: "asc" }, { category: "asc" }],
      });

      console.log("\n" + "─".repeat(60));
      console.log(`FINDINGS CRÉÉS (${findings.length})`);
      console.log("─".repeat(60));
      for (const f of findings) {
        const citCount = f.citations.length;
        const risk = f.riskLevel ?? "—";
        console.log(`  [${f.category.padEnd(12)}] [${risk.padEnd(13)}] ${f.title.slice(0, 70)}`);
        if (citCount > 0) {
          console.log(`    └─ ${citCount} citation(s)`);
        }
      }
    }

    console.log("\n✓ Test terminé\n");
  } catch (err) {
    console.error("\n✗ Échec critique :");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
