/**
 * Script de test local — analyse déterministe (Phase 7).
 *
 * Prérequis :
 *   Phases 1 → 5 exécutées (import, embeddings, facts, terms + linking)
 *   npx tsx scripts/test-knowledge-import.ts
 *   npx tsx scripts/test-knowledge-facts.ts
 *   npx tsx scripts/test-knowledge-terms.ts
 *
 * Exécution :
 *   npx tsx scripts/test-deterministic-analysis.ts
 *
 * Cas testés :
 *   CAS 1 — Metformine + Oméprazole
 *     → depletions : Metformine→DEPLETES→Vitamine B12
 *                    Oméprazole→DEPLETES→Magnésium
 *                    Oméprazole→DEPLETES→Vitamine B12
 *
 *   CAS 2 — Lévothyroxine + Calcium
 *     → interactions : Lévothyroxine INTERACTS_WITH Calcium, Fer, IPP, Soja...
 *
 *   CAS 3 — Glucophage (alias) + Fatigue (inconnu)
 *     → 1 terme reconnu (alias_dictionary), 1 rejeté
 *     → depletions : Metformine→DEPLETES→Vitamine B12
 *
 *   CAS 4 — Calcium seul (côté objet d'un fait)
 *     → interactions : Lévothyroxine INTERACTS_WITH Calcium
 */

import { runAnalysisBatch } from "../lib/knowledge/analysis/batch";
import type { ConsultationMatchInput } from "../lib/knowledge/matching/types";
import type { AnalysisResult, ScoredFact, RiskLevel } from "../lib/knowledge/analysis/types";

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

const TEST_CASES: Array<{ label: string; input: ConsultationMatchInput }> = [
  {
    label: "CAS 1 — Metformine + Oméprazole",
    input: { drugs: ["metformine", "oméprazole"] },
  },
  {
    label: "CAS 2 — Lévothyroxine + Calcium",
    input: { drugs: ["lévothyroxine"], nutrients: ["calcium"] },
  },
  {
    label: "CAS 3 — Glucophage (alias) + Fatigue (inconnu)",
    input: { drugs: ["glucophage"], symptoms: ["fatigue"] },
  },
  {
    label: "CAS 4 — Calcium seul (côté objet)",
    input: { nutrients: ["calcium"] },
  },
];

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

const RISK_ICONS: Record<RiskLevel, string> = {
  CRITICAL:      "🔴",
  HIGH:          "🟠",
  MEDIUM:        "🟡",
  LOW:           "🟢",
  INFORMATIONAL: "⚪",
};

function printFact(f: ScoredFact, indent = "    ") {
  const icon = RISK_ICONS[f.riskLevel];
  const score = f.finalScore.toFixed(4);
  const qual = f.qualifier ? ` (${f.qualifier})` : "";
  console.log(
    `${indent}${icon} [score=${score} | ${f.riskLevel}] ` +
      `${f.subject} ${f.predicate} ${f.object}${qual}`
  );
  console.log(
    `${indent}   ↳ via terme "${f.triggeredByTermName}" | ${f.extractionMethod} | chunk=${f.sourceChunkId.slice(0, 8)}…`
  );
}

function printResult(label: string, result: AnalysisResult) {
  const s = result.summary;
  console.log();
  console.log("═".repeat(64));
  console.log(` ${label}`);
  console.log("═".repeat(64));

  // Termes
  console.log(`  Termes reconnus (${s.termsRecognized}) :`);
  for (const t of result.termsMatched) {
    console.log(`    ✓ "${t.rawInput}" → ${t.canonicalName} [${t.termType}] (${t.matchMethod})`);
  }
  if (result.termsUnmatched.length > 0) {
    console.log(`  Termes rejetés (${s.termsUnrecognized}) :`);
    for (const u of result.termsUnmatched) {
      console.log(`    ✗ "${u.rawInput}" — not_found`);
    }
  }

  // Alerts
  if (result.alerts.length > 0) {
    console.log(`\n  🔴 ALERTES (${result.alerts.length}) :`);
    result.alerts.forEach((f) => printFact(f));
  }

  // Interactions
  if (result.interactions.length > 0) {
    console.log(`\n  🟠 INTERACTIONS (${result.interactions.length}) :`);
    result.interactions.forEach((f) => printFact(f));
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log(`\n  🟡 VIGILANCES (${result.warnings.length}) :`);
    result.warnings.forEach((f) => printFact(f));
  }

  // Depletions
  if (result.depletions.length > 0) {
    console.log(`\n  🟡 DÉPLÉTIONS (${result.depletions.length}) :`);
    result.depletions.forEach((f) => printFact(f));
  }

  // Contextual
  if (result.contextual_notes.length > 0) {
    console.log(`\n  ⚪ CONTEXTE (${result.contextual_notes.length}) :`);
    result.contextual_notes.forEach((f) => printFact(f));
  }

  // Low signal
  if (result.low_signal.length > 0) {
    console.log(`\n  ⚫ SIGNAL FAIBLE (${result.low_signal.length}) — non actionnable`);
  }

  // Chunks
  if (result.supporting_chunks.length > 0) {
    console.log(`\n  Chunks sources (${result.supporting_chunks.length}) :`);
    for (const c of result.supporting_chunks) {
      const score = c.score !== undefined ? ` score=${c.score.toFixed(3)}` : "";
      console.log(`    • [${c.matchSource}${score}] ${c.drugKey} / ${c.kind} — ${c.label}`);
    }
  }

  // Summary
  console.log();
  console.log(
    `  Résumé : total=${s.totalFacts} | alerts=${s.alertCount} interactions=${s.interactionCount} ` +
      `warnings=${s.warningCount} depletions=${s.depletionCount} contextual=${s.contextualCount} ` +
      `lowSignal=${s.lowSignalCount} | highestRisk=${s.highestRisk ?? "none"}`
  );
  console.log(`  Durée analyse : ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log(`\n  Erreurs (${result.errors.length}) :`);
    for (const e of result.errors) {
      console.log(`    ✗ [${e.context}] ${e.error}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(64));
  console.log(" NaturoDesk — Test Analyse Déterministe (Phase 7)");
  console.log("=".repeat(64));

  const batchResult = await runAnalysisBatch(TEST_CASES.map((tc) => tc.input));

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i]!;
    const result = batchResult.results[i];
    if (result) {
      printResult(tc.label, result);
    } else {
      console.log(`\n✗ ${tc.label} — erreur critique (pas de résultat)`);
    }
  }

  console.log();
  console.log("=".repeat(64));
  console.log(" RÉSUMÉ BATCH");
  console.log("=".repeat(64));
  console.log(`  Consultations traitées : ${batchResult.totalConsultations}`);
  console.log(`  Succès                 : ${batchResult.successCount}`);
  console.log(`  Erreurs                : ${batchResult.errorCount}`);
  console.log(`  Durée totale           : ${batchResult.durationMs}ms`);

  if (batchResult.errors.length > 0) {
    console.log("\nErreurs batch :");
    for (const e of batchResult.errors) {
      console.log(`  ✗ [${e.context}] ${e.error}`);
    }
    process.exit(1);
  }

  console.log("\n✓ Analyse déterministe terminée.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
