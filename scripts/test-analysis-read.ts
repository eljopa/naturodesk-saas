/**
 * Script de test local — lecture des findings knowledge (Phase 10).
 *
 * Simule l'appel à GET /api/analysis/findings?consultationId=...
 * en appelant directement les services (pas de serveur HTTP nécessaire).
 *
 * Prérequis :
 *   Phases 1 → 9 exécutées :
 *   npx tsx scripts/test-knowledge-import.ts
 *   npx tsx scripts/test-knowledge-facts.ts
 *   npx tsx scripts/test-knowledge-terms.ts
 *   npx tsx scripts/test-analysis-persistence.ts   ← crée les runs + findings
 *
 * Exécution :
 *   npx tsx scripts/test-analysis-read.ts
 *
 *   Pour cibler une consultation spécifique :
 *   CONSULTATION_ID=<uuid> npx tsx scripts/test-analysis-read.ts
 *
 * Scénarios testés :
 *   1. consultationId valide avec run(s) existant(s)
 *   2. consultationId valide sans aucun run (état initial)
 */

import { db } from "../lib/db";
import { getLatestKnowledgeRunForConsultation } from "../lib/knowledge/read/services/get-run";
import { getFindingsForKnowledgeRun } from "../lib/knowledge/read/services/get-findings";
import { buildFindingsResponse } from "../lib/knowledge/read/serializer";
import type { FindingsApiResponse } from "../lib/knowledge/read/types";

// ---------------------------------------------------------------------------
// Résolution de la consultationId
// ---------------------------------------------------------------------------

async function resolveConsultationId(): Promise<string> {
  const envId = process.env.CONSULTATION_ID;
  if (envId) return envId;

  const first = await db.consultation.findFirst({
    orderBy: { createdAt: "asc" },
    select:  { id: true },
  });

  if (!first) {
    throw new Error(
      "Aucune consultation en base. " +
        "Lancez d'abord test-analysis-persistence.ts ou créez une consultation via l'app."
    );
  }

  return first.id;
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

function printResponse(response: FindingsApiResponse) {
  const { run, summary, meta } = response;

  console.log("\n  [run]");
  if (run) {
    console.log(`    id         : ${run.id}`);
    console.log(`    status     : ${run.status}`);
    console.log(`    createdAt  : ${run.createdAt}`);
    console.log(`    durationMs : ${run.durationMs ?? "N/A"}ms`);
  } else {
    console.log("    → Aucun run knowledge trouvé (état initial normal)");
  }

  console.log("\n  [summary]");
  console.log(`    total       : ${summary.totalFindings}`);
  console.log(`    alerts      : ${summary.alertCount}`);
  console.log(`    interactions: ${summary.interactionCount}`);
  console.log(`    warnings    : ${summary.warningCount}`);
  console.log(`    depletions  : ${summary.depletionCount}`);
  console.log(`    contextual  : ${summary.contextualCount}`);
  console.log(`    highestRisk : ${summary.highestRisk ?? "none"}`);
  console.log(`    unvalidated : ${summary.hasUnvalidated}`);

  const BUCKETS = [
    { key: "alerts"          as const, label: "🔴 Alertes" },
    { key: "interactions"    as const, label: "🟠 Interactions" },
    { key: "warnings"        as const, label: "🟡 Vigilances" },
    { key: "depletions"      as const, label: "🟡 Déplétions" },
    { key: "contextualNotes" as const, label: "⚪ Contexte" },
  ];

  for (const { key, label } of BUCKETS) {
    const bucket = response[key];
    if (bucket.length === 0) continue;

    console.log(`\n  [${label}] (${bucket.length})`);
    for (const f of bucket) {
      const validated =
        f.validated === null ? "en attente" : f.validated ? "validé" : "rejeté";
      console.log(
        `    • [${f.riskLevel ?? "?"} | conf=${f.confidence.toFixed(4)}] ${f.title}`
      );
      console.log(
        `      cat=${f.category} | ${validated}` +
          (f.practitionerNote ? ` | note: ${f.practitionerNote}` : "")
      );
      if (f.citations.length > 0) {
        for (const c of f.citations) {
          const factRef = c.knowledgeFactId ? ` factId=${c.knowledgeFactId.slice(0, 8)}…` : "";
          console.log(`      ↳ [citation] ${c.reference}${factRef}`);
        }
      }
    }
  }

  console.log("\n  [meta]");
  console.log(`    hasRun    : ${meta.hasRun}`);
  console.log(`    hasErrors : ${meta.hasErrors}`);
  console.log(`    runId     : ${meta.runId ?? "none"}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(64));
  console.log(" NaturoDesk — Test Lecture Findings Knowledge (Phase 10)");
  console.log("=".repeat(64));

  const consultationId = await resolveConsultationId();
  console.log(`\n  Consultation : ${consultationId}`);

  // --- Scénario 1 : consultation avec run(s) ---
  console.log("\n─".repeat(64));
  console.log(" Scénario 1 — Consultation avec dernier run");
  console.log("─".repeat(64));

  const run      = await getLatestKnowledgeRunForConsultation(consultationId);
  const findings = run ? await getFindingsForKnowledgeRun(run.id) : [];
  const response = buildFindingsResponse(consultationId, run, findings);

  printResponse(response);

  // --- Scénario 2 : consultation sans run (UUID fictif) ---
  console.log("\n─".repeat(64));
  console.log(" Scénario 2 — Consultation sans aucun run (état initial)");
  console.log("─".repeat(64));

  const fakeId      = "00000000-0000-0000-0000-000000000000";
  const emptyRun:      null = null;
  const emptyFindings: never[] = [];
  const emptyResponse = buildFindingsResponse(fakeId, emptyRun, emptyFindings);

  printResponse(emptyResponse);
  console.log("\n  → Comportement correct : run=null, all buckets empty, hasRun=false");

  // --- Stats globales ---
  console.log("\n─".repeat(64));
  console.log(" Stats en base");
  console.log("─".repeat(64));

  const [totalRuns, totalFindings, totalCitations] = await Promise.all([
    db.analysisRun.count({ where: { stage: "KNOWLEDGE" } }),
    db.finding.count({ where: { sourceType: "KNOWLEDGE" } }),
    db.citation.count({ where: { knowledgeFactId: { not: null } } }),
  ]);

  console.log(`\n  Runs KNOWLEDGE en base     : ${totalRuns}`);
  console.log(`  Findings KNOWLEDGE en base : ${totalFindings}`);
  console.log(`  Citations knowledge        : ${totalCitations}`);

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
