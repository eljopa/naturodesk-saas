/**
 * Script de test local — endpoint d'analyse knowledge (Phase 8).
 *
 * Simule les appels à POST /api/analysis/start en appelant directement
 * le pipeline (pas besoin de serveur HTTP démarré).
 *
 * Prérequis :
 *   Phases 1 → 5 exécutées (import, facts, terms + linking)
 *   npx tsx scripts/test-knowledge-import.ts
 *   npx tsx scripts/test-knowledge-facts.ts
 *   npx tsx scripts/test-knowledge-terms.ts
 *
 * Exécution :
 *   npx tsx scripts/test-analysis-api.ts
 *
 * Cas couverts :
 *   CAS 1 — Payload standard : metformine + oméprazole
 *   CAS 2 — Payload avec alias : glucophage + calcium
 *   CAS 3 — Payload multi-domaine : lévothyroxine + calcium + fatigue
 *   CAS 4 — Payload vide (doit produire une erreur de validation)
 */

import { validateAnalysisInput } from "../lib/knowledge/api/validator";
import { executeAnalysisPipeline } from "../lib/knowledge/api/pipeline";
import { buildAnalysisResponse } from "../lib/knowledge/api/response";
import type { KnowledgeAnalysisResponse } from "../lib/knowledge/api/types";

// ---------------------------------------------------------------------------
// Payloads de test (équivalents à ce qu'on enverrait en HTTP)
// ---------------------------------------------------------------------------

const PAYLOADS = [
  {
    label: "CAS 1 — Standard : metformine + oméprazole",
    body: {
      medications: ["metformine", "oméprazole"],
    },
  },
  {
    label: "CAS 2 — Alias + nutriment : glucophage + calcium",
    body: {
      medications: ["glucophage"],
      nutrients:   ["calcium"],
    },
  },
  {
    label: "CAS 3 — Multi-domaine : lévothyroxine + calcium + fatigue",
    body: {
      medications: ["lévothyroxine"],
      nutrients:   ["calcium"],
      symptoms:    ["fatigue"],
    },
  },
  {
    label: "CAS 4 — Input vide (doit être rejeté)",
    body: {},
  },
];

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

function printResponse(label: string, response: KnowledgeAnalysisResponse) {
  const m = response.meta;
  console.log();
  console.log("═".repeat(64));
  console.log(` ${label}`);
  console.log("═".repeat(64));

  console.log("\n  [normalizedInput]");
  console.log("   medications :", response.normalizedInput.medications);
  console.log("   supplements :", response.normalizedInput.supplements);
  console.log("   nutrients   :", response.normalizedInput.nutrients);
  console.log("   symptoms    :", response.normalizedInput.symptoms);

  console.log("\n  [termMatches]");
  for (const t of response.termMatches.recognized) {
    console.log(`   ✓ "${t.rawInput}" → ${t.canonicalName} [${t.termType}] (${t.matchMethod})`);
  }
  for (const u of response.termMatches.unrecognized) {
    console.log(`   ✗ "${u.rawInput}" — not_found`);
  }

  const buckets = [
    { key: "alerts",          label: "🔴 Alertes" },
    { key: "interactions",    label: "🟠 Interactions" },
    { key: "warnings",        label: "🟡 Vigilances" },
    { key: "depletions",      label: "🟡 Déplétions" },
    { key: "contextual_notes", label: "⚪ Contexte" },
    { key: "low_signal",      label: "⚫ Signal faible" },
  ] as const;

  for (const bucket of buckets) {
    const facts = response.analysis[bucket.key];
    if (facts.length === 0) continue;
    console.log(`\n  [${bucket.label}] (${facts.length})`);
    for (const f of facts) {
      console.log(
        `   • [${f.riskLevel} | score=${f.finalScore.toFixed(4)}] ` +
          `${f.subject} ${f.predicate} ${f.object}`
      );
    }
  }

  if (response.supportingChunks.length > 0) {
    console.log(`\n  [supportingChunks] (${response.supportingChunks.length})`);
    for (const c of response.supportingChunks) {
      const score = c.score !== undefined ? ` score=${c.score.toFixed(3)}` : "";
      console.log(`   • [${c.matchSource}${score}] ${c.drugKey}/${c.kind}`);
    }
  }

  console.log("\n  [meta]");
  console.log(`   highestRisk       : ${m.highestRisk ?? "none"}`);
  console.log(`   totalFacts        : ${m.totalFacts}`);
  console.log(`   termsRecognized   : ${m.termsRecognized}`);
  console.log(`   termsUnrecognized : ${m.termsUnrecognized}`);
  console.log(`   semanticUsed      : ${m.semanticUsed}`);
  console.log(`   durationMs        : ${m.durationMs}ms`);
  if (m.errors.length > 0) {
    console.log(`   errors            : ${m.errors.map((e) => e.error).join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(64));
  console.log(" NaturoDesk — Test API Analyse Knowledge (Phase 8)");
  console.log("=".repeat(64));

  for (const tc of PAYLOADS) {
    console.log(`\n▶ ${tc.label}`);

    // Simule la validation de l'endpoint
    let input;
    try {
      input = validateAnalysisInput(tc.body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  → Rejeté en validation : ${msg}`);
      continue;
    }

    const { matchResult, analysisResult } = await executeAnalysisPipeline(input);
    const response = buildAnalysisResponse(input, matchResult, analysisResult);
    printResponse(tc.label, response);
  }

  console.log();
  console.log("=".repeat(64));
  console.log(" Tests terminés.");
  console.log("=".repeat(64));
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
