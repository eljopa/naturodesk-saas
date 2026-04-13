import type { ConsultationSnapshot, RuleResult } from "./types";

// ---------------------------------------------------------------------------
// Keyword lists for drug matching (case-insensitive substring match)
// ---------------------------------------------------------------------------

const STATINS = [
  "atorvastatin", "atorvastatine", "simvastatin", "simvastatine",
  "rosuvastatin", "rosuvastatine", "pravastatin", "pravastatine",
  "fluvastatin", "fluvastatine", "lovastatin", "lovastatine",
  "pitavastatin", "pitavastatine",
  // French brand names
  "tahor", "crestor", "zocor", "elisor", "vasten", "fractal", "livalo",
];

const PPIS = [
  "omeprazole", "oméprazole", "esomeprazole", "ésoméprazole",
  "lansoprazole", "pantoprazole", "rabeprazole", "rabéprazole",
  // French brand names
  "mopral", "inexium", "ogast", "lanzor", "inipomp", "eupantol", "pariet",
];

const ANTICOAGULANTS = [
  "warfarin", "warfarine", "acenocoumarol", "acénocoumarol",
  "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "edoxabane",
  "heparin", "héparine", "hbpm", "enoxaparin", "enoxaparine",
  // French brand names
  "coumadine", "sintrom", "eliquis", "xarelto", "pradaxa", "lixiana", "préviscan", "previscan",
];

const NATURAL_THINNERS = [
  "omega-3", "oméga-3", "omega 3", "oméga 3", "fish oil", "huile de poisson",
  "ginkgo", "ginkgo biloba",
  "curcumin", "curcumine", "curcuma",
  "ginger", "gingembre",
  "ail", "garlic", "allicin",
  "saule blanc", "willow bark", "salix",
  "bromelain", "bromélaïne", "bromelaine",
  "vitamine e", "vitamin e", "tocophérol",
  "coenzyme q10", "coq10",
  "nattokinase",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function matchingKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k));
}

// ---------------------------------------------------------------------------
// 6 rules
// ---------------------------------------------------------------------------

export function runRules(snapshot: ConsultationSnapshot): RuleResult[] {
  const results: RuleResult[] = [];

  // R1 — MISSING_DATA_NO_SYMPTOMS
  {
    const matched = snapshot.symptoms.length === 0;
    results.push({
      ruleCode: "MISSING_DATA_NO_SYMPTOMS",
      matched,
      finding: matched
        ? {
            category: "QUESTION",
            title: "Aucun symptôme renseigné",
            description:
              "Le bilan ne comporte aucun symptôme. L'analyse IA sera moins précise sans cette information. Veuillez compléter la liste des symptômes avant de relancer l'analyse.",
            confidence: 1,
          }
        : undefined,
      evidence: { symptomCount: snapshot.symptoms.length },
    });
  }

  // R2 — MISSING_DATA_NO_CONTEXT
  {
    const matched = !snapshot.context || snapshot.context.trim().length < 20;
    results.push({
      ruleCode: "MISSING_DATA_NO_CONTEXT",
      matched,
      finding: matched
        ? {
            category: "QUESTION",
            title: "Contexte clinique insuffisant",
            description:
              "Le contexte général du bilan est absent ou très succinct. Ajoutez le motif de consultation, l'historique pertinent et les objectifs du patient pour améliorer la qualité de l'analyse.",
            confidence: 0.9,
          }
        : undefined,
      evidence: { contextLength: snapshot.context?.trim().length ?? 0 },
    });
  }

  // R3 — MEDICATION_LOAD_HIGH
  {
    const count = snapshot.medications.length;
    const matched = count >= 5;
    results.push({
      ruleCode: "MEDICATION_LOAD_HIGH",
      matched,
      finding: matched
        ? {
            category: "RED_FLAG",
            title: `Charge médicamenteuse élevée (${count} médicaments)`,
            description:
              `Ce patient prend ${count} médicaments. Une polymédication ≥ 5 augmente significativement le risque d'interactions, d'effets indésirables cumulés et de déplétion nutritionnelle. Une revue de traitement par le médecin traitant est conseillée.`,
            confidence: 0.95,
          }
        : undefined,
      evidence: { medicationCount: count },
    });
  }

  // R4 — DEPLETION_STATINS_COQ10
  {
    const statinMeds = snapshot.medications.filter((m) =>
      containsAny(m.name, STATINS)
    );
    const matched = statinMeds.length > 0;
    const alreadyHasCoQ10 = snapshot.supplements.some((s) =>
      containsAny(s.name, ["coq10", "coenzyme q10", "coenzyme q-10", "ubiquinol", "ubiquinone"])
    );
    results.push({
      ruleCode: "DEPLETION_STATINS_COQ10",
      matched: matched && !alreadyHasCoQ10,
      finding:
        matched && !alreadyHasCoQ10
          ? {
              category: "DEPLETION",
              title: "Déplétion en CoQ10 probable (statine détectée)",
              description:
                `Les statines (${statinMeds.map((m) => m.name).join(", ")}) inhibent la synthèse du mésovaolinate, réduisant la production endogène de CoQ10. Cela peut contribuer à une fatigue musculaire et cardiaque. Une supplémentation en CoQ10 (100–300 mg/jour) mérite d'être envisagée.`,
              confidence: 0.85,
            }
          : undefined,
      evidence: {
        statins: statinMeds.map((m) => m.name),
        alreadySupplemented: alreadyHasCoQ10,
      },
    });
  }

  // R5 — DEPLETION_PPI_B12_MG
  {
    const ppiMeds = snapshot.medications.filter((m) =>
      containsAny(m.name, PPIS)
    );
    const matched = ppiMeds.length > 0;
    const alreadyB12 = snapshot.supplements.some((s) =>
      containsAny(s.name, ["b12", "cobalamine", "methylcobalamine", "méthylcobalamine"])
    );
    results.push({
      ruleCode: "DEPLETION_PPI_B12_MG",
      matched,
      finding: matched
        ? {
            category: "DEPLETION",
            title: "Risque de déplétion B12 et Magnésium (IPP détecté)",
            description:
              `Les inhibiteurs de la pompe à protons (${ppiMeds.map((m) => m.name).join(", ")}) réduisent l'absorption de la vitamine B12 (via diminution de l'acide gastrique nécessaire au facteur intrinsèque) et du magnésium (usage chronique). Surveiller les taux sériques et envisager une supplémentation si usage > 3 mois.`,
            confidence: 0.8,
          }
        : undefined,
      evidence: {
        ppis: ppiMeds.map((m) => m.name),
        alreadyB12,
      },
    });
  }

  // R6 — INTERACTION_ANTICOAG_NATURALS
  {
    const anticoagMeds = snapshot.medications.filter((m) =>
      containsAny(m.name, ANTICOAGULANTS)
    );
    const allItems = [
      ...snapshot.medications.map((m) => m.name),
      ...snapshot.supplements.map((s) => s.name),
    ];
    const thinnerNames = allItems.filter((n) => containsAny(n, NATURAL_THINNERS));
    const matched = anticoagMeds.length > 0 && thinnerNames.length > 0;
    results.push({
      ruleCode: "INTERACTION_ANTICOAG_NATURALS",
      matched,
      finding: matched
        ? {
            category: "INTERACTION",
            title: "Interaction potentielle : anticoagulant + fluidifiant naturel",
            description:
              `Une interaction est possible entre ${anticoagMeds.map((m) => m.name).join(", ")} et les substances à effet fluidifiant détectées (${thinnerNames.join(", ")}). Cette association peut potentialiser l'effet anticoagulant et augmenter le risque hémorragique. À signaler au médecin prescripteur.`,
            confidence: 0.9,
          }
        : undefined,
      evidence: {
        anticoagulants: anticoagMeds.map((m) => m.name),
        naturalThinners: thinnerNames,
      },
    });
  }

  return results;
}
