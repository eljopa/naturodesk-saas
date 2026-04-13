/**
 * Script de test local — moteur de matching sécurisé.
 *
 * Prérequis :
 *   Avoir exécuté les phases précédentes dans l'ordre :
 *   npx tsx scripts/test-knowledge-import.ts      (chunks en base)
 *   npx tsx scripts/test-knowledge-embeddings.ts  (embeddings calculés — optionnel pour lexical)
 *   npx tsx scripts/test-knowledge-facts.ts       (facts en base)
 *   npx tsx scripts/test-knowledge-terms.ts       (termes créés + facts liés)
 *
 * Exécution :
 *   npx tsx scripts/test-knowledge-matching.ts
 *
 * Cas testés :
 *   CAS 1 — Metformine + Oméprazole (2 médicaments avec déplétion)
 *   CAS 2 — Lévothyroxine + Calcium (interaction documentée)
 *   CAS 3 — Glucophage (alias → Metformine) + Fatigue (symptôme inconnu)
 *   CAS 4 — Calcium seul (nutriment, côté objet dans les faits)
 *
 * Résultats attendus :
 *   CAS 1 : 2 termes, ≥ 3 facts (DEPLETES B12/Mg), ≥ 2 chunks
 *   CAS 2 : 2 termes, ≥ 1 fact (INTERACTS_WITH Calcium), ≥ 1 chunk
 *   CAS 3 : 1 terme (Metformine via alias_dictionary), 1 rejeté (fatigue)
 *   CAS 4 : 1 terme, ≥ 1 fact (Lévothyroxine INTERACTS_WITH Calcium côté objet)
 */

import { runMatchingBatch } from "../lib/knowledge/matching/batch";
import type { ConsultationMatchInput, SecureMatchResult } from "../lib/knowledge/matching/types";

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

const TEST_CASES: Array<{ label: string; input: ConsultationMatchInput }> = [
  {
    label: "CAS 1 — Metformine + Oméprazole",
    input: {
      drugs: ["metformine", "oméprazole"],
    },
  },
  {
    label: "CAS 2 — Lévothyroxine + Calcium",
    input: {
      drugs: ["lévothyroxine"],
      nutrients: ["calcium"],
    },
  },
  {
    label: "CAS 3 — Glucophage (alias) + Fatigue (inconnu)",
    input: {
      drugs: ["glucophage"],
      symptoms: ["fatigue"],
    },
  },
  {
    label: "CAS 4 — Calcium seul (côté objet)",
    input: {
      nutrients: ["calcium"],
    },
  },
];

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

function printResult(label: string, result: SecureMatchResult) {
  console.log();
  console.log("─".repeat(60));
  console.log(label);
  console.log("─".repeat(60));

  // Termes matchés
  if (result.termsMatched.length > 0) {
    console.log(`  Termes reconnus (${result.termsMatched.length}) :`);
    for (const t of result.termsMatched) {
      console.log(
        `    ✓ "${t.rawInput}" → ${t.canonicalName} [${t.termType}] via ${t.matchMethod}`
      );
    }
  }

  // Termes rejetés
  if (result.termsUnmatched.length > 0) {
    console.log(`  Termes rejetés (${result.termsUnmatched.length}) :`);
    for (const u of result.termsUnmatched) {
      console.log(`    ✗ "${u.rawInput}" (key=${u.normalizedKey}) — not_found`);
    }
  }

  // Facts
  if (result.facts.length > 0) {
    console.log(`  Facts retrouvés (${result.facts.length}) :`);
    for (const f of result.facts) {
      const conf = f.confidence < 1 ? ` [conf=${f.confidence}]` : "";
      const qual = f.qualifier ? ` (${f.qualifier})` : "";
      console.log(
        `    • ${f.subject} ${f.predicate} ${f.object}${qual}${conf} [${f.factType}]`
      );
    }
  } else {
    console.log("  Facts : aucun");
  }

  // Chunks
  if (result.chunks.length > 0) {
    console.log(`  Chunks retrouvés (${result.chunks.length}) :`);
    for (const c of result.chunks) {
      const score = c.score !== undefined ? ` score=${c.score.toFixed(3)}` : "";
      console.log(`    • [${c.matchSource}${score}] ${c.drugKey} / ${c.kind} — ${c.label}`);
    }
  } else {
    console.log("  Chunks : aucun");
  }

  // Semantic
  console.log(`  Vectoriel utilisé : ${result.semanticUsed ? "oui" : "non"}`);

  // Erreurs
  if (result.errors.length > 0) {
    console.log(`  Erreurs (${result.errors.length}) :`);
    for (const e of result.errors) {
      console.log(`    ✗ [${e.context}] ${e.error}`);
    }
  }

  console.log(`  Durée : ${result.durationMs}ms`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("NaturoDesk — Test Matching Sécurisé (Phase 6)");
  console.log("=".repeat(60));
  console.log();

  const batchResult = await runMatchingBatch(TEST_CASES.map((tc) => tc.input));

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i]!;
    const result = batchResult.results[i];
    if (result) {
      printResult(tc.label, result);
    } else {
      console.log();
      console.log(`✗ ${tc.label} — erreur critique (pas de résultat)`);
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("RÉSUMÉ");
  console.log("=".repeat(60));
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

  console.log("\n✓ Matching terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique :", err);
  process.exit(1);
});
