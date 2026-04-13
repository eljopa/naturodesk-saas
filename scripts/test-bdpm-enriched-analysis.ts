/**
 * scripts/test-bdpm-enriched-analysis.ts
 *
 * Valide la qualité des analyses enrichies par la BDPM.
 * Appelle directement buildBdpmContext + callOpenAI — PAS d'écriture en DB.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/test-bdpm-enriched-analysis.ts
 *
 * Pré-requis : ingestion BDPM réelle déjà en place (drug_products peuplée).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { buildBdpmContext } from "@/lib/analysis/services/build-bdpm-context";
import { callOpenAI }       from "@/lib/analysis/openai";
import type { ConsultationSnapshot } from "@/lib/analysis/types";

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

interface TestCase {
  id:          string;
  description: string;
  snapshot:    ConsultationSnapshot;
}

const TEST_CASES: TestCase[] = [
  // ── Cas 1 : médicament simple, contexte sain ─────────────────────────────
  {
    id: "CAS1_SIMPLE",
    description: "Médicament simple sans difficulté — Doliprane ponctuel, terrain sain",
    snapshot: {
      id: "test-1",
      context: "Femme 34 ans, bonne santé générale, prise ponctuelle pour céphalées de tension.",
      symptoms: [
        { label: "Céphalées de tension", intensity: 4, duration: "2-3 jours/semaine", category: "neurologique" },
      ],
      medications: [
        { name: "Doliprane 1000", dosage: "1000 mg", frequency: "si besoin", duration: null, drugKey: null },
      ],
      supplements: [],
    },
  },

  // ── Cas 2 : polypharmacie — charge médicamenteuse élevée ─────────────────
  {
    id: "CAS2_POLYPHARMACIE",
    description: "Polypharmacie — statine + IPP + metformine, déplétions potentielles",
    snapshot: {
      id: "test-2",
      context: "Homme 62 ans, diabète type 2, dyslipidémie, RGO chronique. Suivi médical régulier.",
      symptoms: [
        { label: "Fatigue chronique",        intensity: 6, duration: "6 mois",  category: "général" },
        { label: "Crampes musculaires",       intensity: 3, duration: "2 mois",  category: "musculaire" },
        { label: "Brûlures d'estomac",        intensity: 5, duration: "1 an",    category: "digestif" },
      ],
      medications: [
        { name: "Tahor 40mg",        dosage: "40 mg",  frequency: "1x/j soir", duration: "3 ans",   drugKey: null },
        { name: "Mopral 20mg",       dosage: "20 mg",  frequency: "1x/j matin", duration: "2 ans",  drugKey: null },
        { name: "Metformine 850mg",  dosage: "850 mg", frequency: "2x/j",       duration: "5 ans",  drugKey: null },
        { name: "Amlodipine 5mg",    dosage: "5 mg",   frequency: "1x/j",       duration: "2 ans",  drugKey: null },
      ],
      supplements: [],
    },
  },

  // ── Cas 3 : médicament + complément, interaction possible ─────────────────
  {
    id: "CAS3_ANTICOAG_OMEGA3",
    description: "Anticoagulant + oméga-3 + ginkgo — risque fluidification sanguine",
    snapshot: {
      id: "test-3",
      context: "Femme 58 ans, fibrillation auriculaire sous anticoagulant. Souhaite prendre des compléments anti-inflammatoires.",
      symptoms: [
        { label: "Palpitations résiduelles",  intensity: 3, duration: "stable", category: "cardio" },
        { label: "Douleurs articulaires",     intensity: 5, duration: "1 an",   category: "articulaire" },
      ],
      medications: [
        { name: "Eliquis 5mg",  dosage: "5 mg", frequency: "2x/j", duration: "18 mois", drugKey: null },
      ],
      supplements: [
        { name: "Oméga-3 EPA/DHA 2g/j", dosage: "2 g", duration: "cure de 3 mois" },
        { name: "Ginkgo biloba 120mg",   dosage: "120 mg", duration: null },
      ],
    },
  },

  // ── Cas 4 : interaction absorption — Levothyrox + calcium + magnésium ────
  {
    id: "CAS4_LEVOTHYROX_INTERACTIONS",
    description: "Levothyrox + calcium + magnésium — compétition d'absorption",
    snapshot: {
      id: "test-4",
      context: "Femme 45 ans, hypothyroïdie traitée depuis 8 ans, TSH récente à 3.2 mUI/L (légèrement haute malgré traitement). Prend des compléments le matin.",
      symptoms: [
        { label: "Fatigue matinale persistante", intensity: 6, duration: "3 mois", category: "général" },
        { label: "Frilosité", intensity: 4, duration: "chronique", category: "général" },
        { label: "Prise de poids inexpliquée", intensity: null, duration: "6 mois", category: "métabolique" },
      ],
      medications: [
        { name: "Levothyrox 100 mcg", dosage: "100 mcg", frequency: "le matin à jeun", duration: "8 ans", drugKey: null },
      ],
      supplements: [
        { name: "Carbonate de calcium 1000mg",  dosage: "1000 mg", duration: "continu" },
        { name: "Magnésium bisglycinate 300mg",  dosage: "300 mg",  duration: "continu" },
        { name: "Vitamine D3 2000 UI",           dosage: "2000 UI", duration: "continu" },
      ],
    },
  },

  // ── Cas 5 : médicament peu courant, BDPM résolu mais peu de contexte ──────
  {
    id: "CAS5_MED_RARE",
    description: "Médicament peu commun — Bétahistine + contexte vertiges, BDPM résolu mais peu de facts",
    snapshot: {
      id: "test-5",
      context: "Homme 51 ans, syndrome de Ménière diagnostiqué il y a 1 an. Vertiges rotatoires récurrents.",
      symptoms: [
        { label: "Vertiges rotatoires",  intensity: 8, duration: "crises 20-30 min", category: "neurologique" },
        { label: "Acouphènes unilatéraux", intensity: 5, duration: "permanent",      category: "ORL" },
        { label: "Nausées associées aux crises", intensity: 6, duration: "crises",   category: "digestif" },
      ],
      medications: [
        { name: "Betaserc 16mg",   dosage: "16 mg",  frequency: "3x/j",    duration: "6 mois", drugKey: null },
        { name: "Tanganil 500mg",  dosage: "500 mg", frequency: "si crise", duration: null,     drugKey: null },
      ],
      supplements: [
        { name: "Gingembre 250mg", dosage: "250 mg", duration: "2 mois" },
      ],
    },
  },

  // ── Cas 6 : BDPM bon mais contexte clinique prioritaire ───────────────────
  {
    id: "CAS6_SERTRALINE_TERRAIN",
    description: "Sertraline + terrain anxio-dépressif — BDPM résolu, analyse terrain prioritaire",
    snapshot: {
      id: "test-6",
      context: "Femme 38 ans, burnout il y a 1 an, sous antidépresseur depuis 8 mois. Cherche un accompagnement naturopathique complémentaire pour retrouver de l'énergie et réduire l'anxiété résiduelle.",
      symptoms: [
        { label: "Anxiété résiduelle",         intensity: 5, duration: "chronique",   category: "psychologique" },
        { label: "Fatigue mentale",             intensity: 7, duration: "8 mois",      category: "psychologique" },
        { label: "Troubles du sommeil",         intensity: 5, duration: "6 mois",      category: "sommeil" },
        { label: "Baisse de libido",            intensity: 3, duration: "8 mois",      category: "hormonal" },
        { label: "Difficultés de concentration", intensity: 6, duration: "8 mois",    category: "neurologique" },
      ],
      medications: [
        { name: "Zoloft 50mg",     dosage: "50 mg",  frequency: "1x/j matin", duration: "8 mois",  drugKey: null },
      ],
      supplements: [
        { name: "Magnésium marin 300mg", dosage: "300 mg", duration: "2 mois" },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

function printSeparator(char = "─", length = 90) {
  console.log(char.repeat(length));
}

function printHeader(text: string) {
  printSeparator("═");
  console.log(`  ${text}`);
  printSeparator("═");
}

function evidenceBadge(level: string | undefined): string {
  switch (level) {
    case "DOCUMENTED":  return "[DOCUMENTÉ]";
    case "SIGNAL":      return "[SIGNAL]";
    case "HYPOTHESIS":  return "[HYPOTHÈSE]";
    default:             return "[?]";
  }
}

// ---------------------------------------------------------------------------
// Résumé qualité global
// ---------------------------------------------------------------------------

interface CaseSummary {
  id:              string;
  description:     string;
  medsTotal:       number;
  medsResolved:    number;
  totalSubstances: number;
  totalFacts:      number;
  totalChunks:     number;
  findingsCount:   number;
  documented:      number;
  signals:         number;
  hypotheses:      number;
  tokensUsed:      number;
  error?:          string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runCase(tc: TestCase): Promise<CaseSummary> {
  const sep = "  " + "─".repeat(86);

  console.log(`\n${"═".repeat(90)}`);
  console.log(`  CAS : ${tc.id} — ${tc.description}`);
  console.log(`${"═".repeat(90)}`);

  // Médicaments bruts
  if (tc.snapshot.medications.length > 0) {
    console.log("\n  Médicaments saisis :");
    for (const m of tc.snapshot.medications) {
      const parts = [m.name];
      if (m.dosage)    parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      if (m.duration)  parts.push(m.duration ?? "");
      console.log(`    · ${parts.filter(Boolean).join(", ")}`);
    }
  } else {
    console.log("\n  Médicaments saisis : aucun");
  }

  if (tc.snapshot.supplements.length > 0) {
    console.log("  Compléments saisis :");
    for (const s of tc.snapshot.supplements) {
      console.log(`    · ${s.name}${s.dosage ? ` — ${s.dosage}` : ""}`);
    }
  }

  // ── BDPM enrichment ──────────────────────────────────────────────────────
  console.log("\n  ── Enrichissement BDPM ─────────────────────────────────────────────────────");

  // Passer uniquement m.name — le parser de matching est conçu pour le label brut saisi.
  const medNames = tc.snapshot.medications.map((m) => m.name);

  let totalSubstances = 0;
  let totalFacts      = 0;
  let totalChunks     = 0;
  let medsResolved    = 0;

  let bdpmSummaryText = "";

  try {
    const ctx = await buildBdpmContext(medNames);
    bdpmSummaryText = ctx.summaryText;

    for (const med of ctx.medications) {
      const resolved = med.drugProductId ?? med.drugSubstanceId;
      if (resolved) medsResolved++;

      const icon = resolved ? "✓" : "✗";
      const name = (med.productName ?? med.substanceName ?? "non résolu").slice(0, 60);
      console.log(`  ${icon} "${med.inputLabel.slice(0, 40)}" → ${name}`);

      if (med.activeSubstances.length > 0) {
        const subs = med.activeSubstances.map((s) => `${s.name}${s.dosage ? ` ${s.dosage}` : ""}`).join(" + ");
        console.log(`      Composition : ${subs.slice(0, 100)}`);
      }
      if (med.relevantFacts.length > 0) {
        console.log(`      Facts       : ${med.relevantFacts.length}`);
        for (const f of med.relevantFacts) {
          console.log(`        · ${f.predicate} → ${f.object}${f.qualifier ? ` (${f.qualifier})` : ""}`);
        }
      }
      if (med.relevantChunks.length > 0) {
        console.log(`      Chunks      : ${med.relevantChunks.length}`);
      }

      totalSubstances += med.activeSubstances.length;
      totalFacts      += med.relevantFacts.length;
      totalChunks     += med.relevantChunks.length;
    }

    console.log(`\n  Résolution BDPM : ${medsResolved}/${medNames.length} médicaments`);
    console.log(`  Substances actives injectées : ${totalSubstances}`);
    console.log(`  Facts Knowledge  : ${totalFacts}`);
    console.log(`  Chunks BDPM      : ${totalChunks}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Erreur BDPM enrichissement : ${msg}`);
    return {
      id: tc.id, description: tc.description,
      medsTotal: medNames.length, medsResolved, totalSubstances, totalFacts, totalChunks,
      findingsCount: 0, documented: 0, signals: 0, hypotheses: 0, tokensUsed: 0,
      error: msg,
    };
  }

  // ── Appel LLM ─────────────────────────────────────────────────────────────
  console.log("\n  ── Findings LLM ────────────────────────────────────────────────────────────");

  let llmResult;
  try {
    llmResult = await callOpenAI(tc.snapshot, "", { medications: [], summaryText: bdpmSummaryText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Erreur OpenAI : ${msg}`);
    return {
      id: tc.id, description: tc.description,
      medsTotal: medNames.length, medsResolved, totalSubstances, totalFacts, totalChunks,
      findingsCount: 0, documented: 0, signals: 0, hypotheses: 0, tokensUsed: 0,
      error: msg,
    };
  }

  let documented = 0; let signals = 0; let hypotheses = 0;

  for (const f of llmResult.findings) {
    const badge = evidenceBadge(f.evidenceLevel);
    const conf  = `${(f.confidence * 100).toFixed(0)}%`;
    console.log(`\n  ${badge} [${f.category}] ${f.title}`);
    console.log(`    confidence=${conf}`);
    console.log(`    ${f.description.slice(0, 250)}${f.description.length > 250 ? "…" : ""}`);
    if (f.sourceRefs && f.sourceRefs.length > 0) {
      console.log(`    Sources : ${f.sourceRefs.join(" | ")}`);
    }
    if (f.evidenceLevel === "DOCUMENTED")  documented++;
    if (f.evidenceLevel === "SIGNAL")      signals++;
    if (f.evidenceLevel === "HYPOTHESIS")  hypotheses++;
  }

  console.log(`\n  medicationLoadLevel = ${llmResult.medicationLoadLevel} (score ${llmResult.medicationLoadScore}/10)`);
  if (llmResult.terrainSummary) {
    console.log(`  Terrain : ${llmResult.terrainSummary.slice(0, 200)}`);
  }
  console.log(`  Tokens utilisés : ${llmResult.tokensUsed}`);

  return {
    id: tc.id, description: tc.description,
    medsTotal: medNames.length, medsResolved,
    totalSubstances, totalFacts, totalChunks,
    findingsCount: llmResult.findings.length,
    documented, signals, hypotheses,
    tokensUsed: llmResult.tokensUsed,
  };
}

async function main() {
  printHeader("Test analyse enrichie BDPM — NaturoDesk");
  console.log(`\n  ${TEST_CASES.length} cas de test — appels directs buildBdpmContext + callOpenAI`);
  console.log("  Aucune écriture en base de données.\n");

  const summaries: CaseSummary[] = [];

  for (const tc of TEST_CASES) {
    const summary = await runCase(tc);
    summaries.push(summary);
  }

  // ── Synthèse globale ────────────────────────────────────────────────────
  printHeader("SYNTHÈSE DE QUALITÉ");
  console.log("");

  const col = [42, 8, 8, 8, 8, 10, 10, 10, 10];
  const hdr = ["Cas", "Résolu", "Subst.", "Facts", "Chnks", "Findings", "Docum.", "Signal", "Hypoth."].map((h, i) => h.padEnd(col[i] ?? 10));
  console.log("  " + hdr.join(""));
  console.log("  " + "─".repeat(col.reduce((a, b) => a + b, 0)));

  let totalTokens = 0;
  for (const s of summaries) {
    if (s.error) {
      console.log(`  ${s.id.padEnd(col[0] ?? 42)} ERREUR : ${s.error.slice(0, 50)}`);
      continue;
    }
    const row = [
      s.id.slice(0, 40).padEnd(col[0] ?? 42),
      `${s.medsResolved}/${s.medsTotal}`.padEnd(col[1] ?? 8),
      String(s.totalSubstances).padEnd(col[2] ?? 8),
      String(s.totalFacts).padEnd(col[3] ?? 8),
      String(s.totalChunks).padEnd(col[4] ?? 8),
      String(s.findingsCount).padEnd(col[5] ?? 10),
      String(s.documented).padEnd(col[6] ?? 10),
      String(s.signals).padEnd(col[7] ?? 10),
      String(s.hypotheses).padEnd(col[8] ?? 10),
    ];
    console.log("  " + row.join(""));
    totalTokens += s.tokensUsed;
  }

  console.log("");
  console.log(`  Tokens totaux consommés : ${totalTokens.toLocaleString("fr-FR")}`);
  console.log(`  Coût estimé (gpt-4o-mini @0.15$/M tokens) : ${((totalTokens / 1_000_000) * 0.15).toFixed(4)} $`);

  // ── Conclusions ────────────────────────────────────────────────────────
  const allDone     = summaries.filter((s) => !s.error);
  const totalDocs   = allDone.reduce((s, c) => s + c.documented,      0);
  const totalSigs   = allDone.reduce((s, c) => s + c.signals,         0);
  const totalHyps   = allDone.reduce((s, c) => s + c.hypotheses,      0);
  const totalFinds  = allDone.reduce((s, c) => s + c.findingsCount,   0);
  const totalRes    = allDone.reduce((s, c) => s + c.medsResolved,    0);
  const totalMeds   = allDone.reduce((s, c) => s + c.medsTotal,       0);
  const totalSubst  = allDone.reduce((s, c) => s + c.totalSubstances, 0);
  const totalFacts  = allDone.reduce((s, c) => s + c.totalFacts,      0);

  console.log("");
  console.log("  ── CONCLUSIONS ──────────────────────────────────────────────────────────────");
  console.log(`  Taux de résolution BDPM : ${totalRes}/${totalMeds} médicaments (${Math.round(totalRes / Math.max(totalMeds, 1) * 100)}%)`);
  console.log(`  Substances injectées en contexte : ${totalSubst} au total`);
  console.log(`  Facts Knowledge disponibles      : ${totalFacts}`);
  console.log("");
  console.log(`  Répartition traçabilité LLM (${totalFinds} findings totaux) :`);
  if (totalFinds > 0) {
    console.log(`    · DOCUMENTED  : ${totalDocs} (${Math.round(totalDocs / totalFinds * 100)}%) — appuyés par données BDPM`);
    console.log(`    · SIGNAL      : ${totalSigs} (${Math.round(totalSigs / totalFinds * 100)}%) — indices cliniques plausibles`);
    console.log(`    · HYPOTHESIS  : ${totalHyps} (${Math.round(totalHyps / totalFinds * 100)}%) — vigilances praticien`);
    const untraced = totalFinds - totalDocs - totalSigs - totalHyps;
    if (untraced > 0) console.log(`    · non tracés  : ${untraced}`);
  }
  console.log("");
  if (totalFacts === 0) {
    console.log("  ⚠ Pipeline B (KnowledgeFact/KnowledgeChunk) non alimenté — facts=0.");
    console.log("    → DOCUMENTED s'appuie sur les compositions DrugProductSubstance.");
    console.log("    → L'activation du pipeline n8n BDPM renforcera les DOCUMENTED.");
  }
  if (totalSubst > 0 && totalDocs > 0) {
    console.log("  ✓ Les compositions BDPM (substances actives) sont exploitées par le LLM.");
  }
  console.log("");
  console.log(`${"═".repeat(90)}`);
}

// Désactiver les logs Prisma pour ce script (trop verbeux)
process.env.DEBUG = "";

main()
  .catch((err) => { console.error("Erreur fatale :", err); process.exit(1); })
  .finally(async () => {
    const { db } = await import("@/lib/db");
    await db.$disconnect();
  });
