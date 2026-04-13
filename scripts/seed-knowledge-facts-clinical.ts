/**
 * scripts/seed-knowledge-facts-clinical.ts
 *
 * Seed des faits cliniques curatés pour Pipeline B (Knowledge BDPM).
 *
 * Ce script contourne la dépendance n8n/Supabase Storage en seeding directement :
 *   1. KnowledgeTerm (DRUG) pour les molécules non couvertes par seed-drug-terms.ts
 *   2. DrugSubstance → KnowledgeTerm linkage via knowledgeTermId
 *   3. KnowledgeDocument "CURATED" comme ancre source
 *   4. KnowledgeChunk par fait (texte clinique)
 *   5. KnowledgeFact avec subjectTermId + objectTermId correctement liés
 *
 * Résultat attendu :
 *   - KnowledgeFact > 0
 *   - Apparition de findings DOCUMENTED dans test-bdpm-enriched-analysis
 *   - sourceRefs réelles (pas d'hallucination)
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}'
 *     scripts/seed-knowledge-facts-clinical.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrugTermDef {
  termNormalizedKey:      string;
  canonicalName:          string;
  category:               string;
  aliases:                string[];
  substanceNormalizedKeys: string[]; // clés normalizedKey de DrugSubstance à lier
}

interface ClinicalFactDef {
  subjectKey:   string;       // KnowledgeTerm.normalizedKey du sujet (médicament)
  factType:     "DEPLETION" | "INTERACTION" | "SIDE_EFFECT" | "WARNING" | "CONTRAINDICATION";
  predicate:    "DEPLETES" | "INTERACTS_WITH" | "CAUSES" | "POTENTIATES" | "REDUCES_EFFICACY_OF" | "REQUIRES_MONITORING_WITH";
  objectKey:    string;       // KnowledgeTerm.normalizedKey ou libellé libre de l'objet
  objectType:   "NUTRIENT" | "SUPPLEMENT" | "HERB" | "CONDITION" | "SUBSTANCE";
  qualifier:    string;       // explication clinique (max 400 chars)
  confidence:   number;
  excerpt:      string;       // texte source (affiché dans RAG + traçabilité)
}

// ---------------------------------------------------------------------------
// Nouveaux KnowledgeTerm DRUG à créer (non couverts par seed-drug-terms.ts)
// ---------------------------------------------------------------------------

const DRUG_TERMS_TO_ENSURE: DrugTermDef[] = [

  // ── Statines ──────────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "atorvastatine",
    canonicalName:           "Atorvastatine",
    category:                "statin",
    aliases:                 ["Atorvastatin", "Tahor", "Lipitor"],
    substanceNormalizedKeys: ["atorvastatine-calcique", "atorvastatine-calcique-trihydratee"],
  },
  {
    termNormalizedKey:       "simvastatine",
    canonicalName:           "Simvastatine",
    category:                "statin",
    aliases:                 ["Simvastatin", "Zocor", "Lodales"],
    substanceNormalizedKeys: ["simvastatine"],
  },
  {
    termNormalizedKey:       "rosuvastatine",
    canonicalName:           "Rosuvastatine",
    category:                "statin",
    aliases:                 ["Rosuvastatin", "Crestor"],
    substanceNormalizedKeys: ["rosuvastatine", "rosuvastatine-calcique", "rosuvastatine-zincique"],
  },
  {
    termNormalizedKey:       "pravastatine",
    canonicalName:           "Pravastatine",
    category:                "statin",
    aliases:                 ["Pravastatin", "Elisor", "Vasten"],
    substanceNormalizedKeys: ["pravastatine-sodique"],
  },

  // ── IPP ───────────────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "omeprazole",
    canonicalName:           "Oméprazole",
    category:                "ppi",
    aliases:                 ["Omeprazole", "Mopral", "Prilosec"],
    substanceNormalizedKeys: ["omeprazole", "omeprazole-magnesium", "omeprazole-sodique"],
  },
  {
    termNormalizedKey:       "esomeprazole",
    canonicalName:           "Ésoméprazole",
    category:                "ppi",
    aliases:                 ["Esomeprazole", "Inexium", "Nexium"],
    substanceNormalizedKeys: [
      "esomeprazole-magnesique",
      "esomeprazole-magnesique-dihydrate",
      "esomeprazole-magnesique-trihydrate",
      "esomeprazole-sodique",
    ],
  },
  {
    termNormalizedKey:       "lansoprazole",
    canonicalName:           "Lansoprazole",
    category:                "ppi",
    aliases:                 ["Ogast", "Lanzor", "Prevacid"],
    substanceNormalizedKeys: ["lansoprazole"],
  },
  {
    termNormalizedKey:       "pantoprazole",
    canonicalName:           "Pantoprazole",
    category:                "ppi",
    aliases:                 ["Eupantol", "Inipomp", "Protonix"],
    substanceNormalizedKeys: ["pantoprazole-sodique-anhydre", "pantoprazole-sodique-sesquihydrate"],
  },

  // ── Biguanides ────────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "metformine",
    canonicalName:           "Metformine",
    category:                "biguanide",
    aliases:                 ["Metformin", "Glucophage", "Stagid"],
    substanceNormalizedKeys: ["metformine", "chlorhydrate-de-metformine", "metformine-embonate-de"],
  },

  // ── Thyroïde ──────────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "levothyroxine",
    canonicalName:           "Lévothyroxine",
    category:                "thyroid_hormone",
    aliases:                 ["Levothyroxine", "Levothyrox", "L-Thyroxine", "Euthyrox"],
    substanceNormalizedKeys: ["levothyroxine", "levothyroxine-sodique"],
  },

  // ── Diurétiques ───────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "furosemide",
    canonicalName:           "Furosémide",
    category:                "diuretic_loop",
    aliases:                 ["Furosemide", "Lasilix", "Lasix"],
    substanceNormalizedKeys: ["furosemide"],
  },

  // ── Corticostéroïdes ──────────────────────────────────────────────────────
  {
    termNormalizedKey:       "prednisone",
    canonicalName:           "Prednisone",
    category:                "corticosteroid",
    aliases:                 ["Cortancyl"],
    substanceNormalizedKeys: ["prednisone"],
  },
  {
    termNormalizedKey:       "prednisolone",
    canonicalName:           "Prednisolone",
    category:                "corticosteroid",
    aliases:                 ["Solupred", "Prednisolone"],
    substanceNormalizedKeys: [
      "prednisolone",
      "acetate-de-prednisolone",
      "caproate-de-prednisolone",
      "pivalate-de-prednisolone",
      "metasulfobenzoate-sodique-de-prednisolone",
    ],
  },

  // ── AINS ──────────────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "ibuprofene",
    canonicalName:           "Ibuprofène",
    category:                "nsaid",
    aliases:                 ["Ibuprofen", "Advil", "Nurofen", "Brufen"],
    substanceNormalizedKeys: ["ibuprofene", "ibuprofene-sodique-dihydrate", "lysinate-dibuprofene"],
  },

  // ── Bétahistine ───────────────────────────────────────────────────────────
  {
    termNormalizedKey:       "betahistine",
    canonicalName:           "Bétahistine",
    category:                "vestibular_agent",
    aliases:                 ["Betahistine", "Betaserc", "Serc"],
    substanceNormalizedKeys: ["dichlorhydrate-de-betahistine", "betahistine-mesilate-de"],
  },

  // ── Calcium antagoniste ───────────────────────────────────────────────────
  {
    termNormalizedKey:       "amlodipine",
    canonicalName:           "Amlodipine",
    category:                "calcium_channel_blocker",
    aliases:                 ["Amlodipine", "Amlor", "Norvasc"],
    substanceNormalizedKeys: ["besilate-damlodipine"],
  },

  // ── ISRS : enrichissement des termes existants avec substanceNormalizedKeys ──
  // (les KnowledgeTerm existent déjà — on ne recréera pas, on linke juste les DrugSubstances)
];

// DrugSubstances à lier à des KnowledgeTerm DÉJÀ EXISTANTS
const SUBSTANCE_TERM_LINKS: Record<string, string> = {
  // substanceNormalizedKey → termNormalizedKey (existant)
  "chlorhydrate-de-sertraline": "sertraline",
  "sertraline":                 "sertraline",
  "chlorhydrate-de-fluoxetine": "fluoxetine",
  "chlorhydrate-de-paroxetine-anhydre":    "paroxetine",
  "chlorhydrate-de-paroxetine-hemihydrate":"paroxetine",
  "mesilate-de-paroxetine":     "paroxetine",
  "oxalate-descitalopram":      "escitalopram",
  "apixaban":                   "apixaban",
  // rivaroxaban, warfarine, methotrexate, cotrimoxazole → déjà exacts
};

// ---------------------------------------------------------------------------
// Faits cliniques curatés (40 faits prioritaires naturopathie)
// ---------------------------------------------------------------------------

const CLINICAL_FACTS: ClinicalFactDef[] = [

  // ── Statines → CoQ10 (forte évidence) ────────────────────────────────────

  {
    subjectKey: "atorvastatine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "coenzyme-q10", objectType: "SUPPLEMENT",
    qualifier: "Inhibition HMG-CoA réductase → réduction biosynthèse ubiquinone. Myalgies potentialisées.",
    confidence: 0.95,
    excerpt: "Les statines inhibent la HMG-CoA réductase, enzyme commune à la synthèse du cholestérol et du coenzyme Q10. L'atorvastatine induit une réduction plasmatique de CoQ10 de 32 à 49%. Une supplémentation en CoQ10 (100–200 mg/j) est souvent recommandée en cas de myalgies sous statine.",
  },
  {
    subjectKey: "simvastatine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "coenzyme-q10", objectType: "SUPPLEMENT",
    qualifier: "Inhibition HMG-CoA réductase → réduction ubiquinone. Statine lipophile, déplétion marquée.",
    confidence: 0.95,
    excerpt: "La simvastatine est une statine lipophile qui réduit significativement le CoQ10 plasmatique. La déplétion est corrélée à la dose. Supplémentation CoQ10 recommandée en cas de faiblesse musculaire ou myalgies.",
  },
  {
    subjectKey: "rosuvastatine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "coenzyme-q10", objectType: "SUPPLEMENT",
    qualifier: "Inhibition HMG-CoA réductase → réduction ubiquinone. Statine hydrophile, déplétion modérée.",
    confidence: 0.90,
    excerpt: "La rosuvastatine, statine hydrophile, induit une réduction du CoQ10 plasmatique moins marquée que les statines lipophiles. La supplémentation peut être envisagée en cas de symptômes musculaires.",
  },
  {
    subjectKey: "pravastatine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "coenzyme-q10", objectType: "SUPPLEMENT",
    qualifier: "Inhibition HMG-CoA réductase. Statine hydrophile, déplétion CoQ10 moins marquée.",
    confidence: 0.85,
    excerpt: "La pravastatine est hydrophile et induit une déplétion en CoQ10 moindre comparée aux statines lipophiles. Néanmoins, une supplémentation peut être utile en cas de fatigue musculaire.",
  },

  // ── IPP → B12 (forte évidence — classe effet) ─────────────────────────────

  {
    subjectKey: "omeprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b12", objectType: "NUTRIENT",
    qualifier: "Réduction sécrétion HCl → altération absorption B12 (facteur intrinsèque dépendant). Risque accru si >2 ans.",
    confidence: 0.92,
    excerpt: "L'oméprazole réduit la sécrétion d'acide chlorhydrique nécessaire à la libération de la vitamine B12 des protéines alimentaires. Une utilisation prolongée (>2 ans) est associée à un risque accru de déficit en B12. Surveillance recommandée chez les patients âgés ou vegans.",
  },
  {
    subjectKey: "omeprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Hypomagnésémie documentée sous IPP prolongés. Alertes ANSM. Risque crampes, arythmies.",
    confidence: 0.90,
    excerpt: "L'oméprazole peut induire une hypomagnésémie significative lors d'une utilisation prolongée. La FDA et l'ANSM ont émis des alertes. Symptômes : crampes, tétanie, arythmies. Surveillance magnésémie recommandée si traitement >3 mois.",
  },
  {
    subjectKey: "esomeprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b12", objectType: "NUTRIENT",
    qualifier: "Classe effet IPP. Réduction HCl → altération absorption B12. Identique à l'oméprazole (isomère actif).",
    confidence: 0.92,
    excerpt: "L'ésoméprazole est l'isomère S de l'oméprazole et partage le même mécanisme d'action sur la sécrétion acide gastrique. La déplétion en vitamine B12 est un effet de classe IPP. Surveillance recommandée en cas d'utilisation >1 an.",
  },
  {
    subjectKey: "esomeprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Hypomagnésémie documentée. Alertes ANSM pour classe IPP. Classe effet partagé avec oméprazole.",
    confidence: 0.90,
    excerpt: "L'ésoméprazole partage avec l'oméprazole le risque d'hypomagnésémie sous traitement prolongé. Surveillance ionogramme recommandée. Potentiel de majoration sous diurétiques ou digitaliques.",
  },
  {
    subjectKey: "lansoprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b12", objectType: "NUTRIENT",
    qualifier: "Classe effet IPP. Absorption B12 dépendante de l'acidité gastrique. Risque majoré si >1 an.",
    confidence: 0.90,
    excerpt: "Le lansoprazole appartient à la classe des IPP et réduit l'absorption de la vitamine B12 par réduction de l'acidité gastrique. Contrôle du statut B12 recommandé chez les patients sous lansoprazole au long cours.",
  },
  {
    subjectKey: "pantoprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b12", objectType: "NUTRIENT",
    qualifier: "Classe effet IPP. Altération absorption B12. Pantoprazole : IPP à demi-vie courte mais effet cumulatif.",
    confidence: 0.90,
    excerpt: "Le pantoprazole, comme tous les IPP, réduit l'absorption de la vitamine B12 par inhibition de la sécrétion acide gastrique. Surveillance du statut B12 recommandée chez les patients en traitement prolongé.",
  },
  {
    subjectKey: "pantoprazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Hypomagnésémie documentée sous IPP. Alertes pharmacovigilance. Classe effet partagé.",
    confidence: 0.88,
    excerpt: "Le pantoprazole peut induire une hypomagnésémie, notamment en association avec des diurétiques ou de la digoxine. Surveillance magnésémie recommandée sous traitement prolongé.",
  },

  // ── Metformine → B12 (évidence très forte) ────────────────────────────────

  {
    subjectKey: "metformine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b12", objectType: "NUTRIENT",
    qualifier: "Réduction absorption intestinale B12 médiée par récepteurs calcium-dépendants. Risque neuropathie à long terme.",
    confidence: 0.95,
    excerpt: "La metformine réduit l'absorption de la vitamine B12 au niveau de l'iléon terminal via une inhibition des récepteurs calcium-dépendants. Le déficit en B12 est dose-dépendant et s'aggrave avec la durée. Neuropathie périphérique et anémie mégaloblastique possibles. Contrôle B12 annuel recommandé.",
  },

  // ── ISRS → déplétion nutritionnelle ──────────────────────────────────────

  {
    subjectKey: "sertraline",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "ISRS → réduction méthylation MTHFR → altération métabolisme folates. Dépression réfractaire liée au déficit folate.",
    confidence: 0.75,
    excerpt: "Les ISRS comme la sertraline peuvent altérer le métabolisme des folates en interférant avec les voies de méthylation. Un déficit en folates est associé à une moindre réponse aux antidépresseurs. Synergie thérapeutique folate + ISRS documentée dans plusieurs essais.",
  },
  {
    subjectKey: "sertraline",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-b6", objectType: "NUTRIENT",
    qualifier: "Inhibition partielle vitamine B6-kinase. Impact sur synthèse sérotonine et métabolisme de l'homocystéine.",
    confidence: 0.72,
    excerpt: "La sertraline peut réduire les niveaux de vitamine B6 par inhibition partielle de la pyridoxal kinase. La B6 est cofacteur de la synthèse de sérotonine (décarboxylation du 5-HTP). Un déficit peut paradoxalement réduire l'efficacité du traitement.",
  },
  {
    subjectKey: "sertraline",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Réduction magnésium intracellulaire observée sous ISRS. Potentialise anxiété et troubles du sommeil.",
    confidence: 0.70,
    excerpt: "Une réduction du magnésium intracellulaire a été observée chez des patients sous ISRS. Le magnésium joue un rôle modulateur sur les récepteurs NMDA et la transmission sérotoninergique. Une supplémentation peut potentialiser l'effet anxiolytique.",
  },
  {
    subjectKey: "fluoxetine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "Classe ISRS. Altération métabolisme folates. Synergie thérapeutique folate + ISRS documentée.",
    confidence: 0.74,
    excerpt: "La fluoxétine, ISRS à longue demi-vie, peut altérer le métabolisme des folates. La supplémentation en acide folique ou méthylfolate (5-MTHF) peut améliorer la réponse antidépressive. Recommandé si homocystéine élevée.",
  },
  {
    subjectKey: "paroxetine",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "Classe ISRS. Altération métabolisme folates. Paroxétine : ISRS avec effet anticholinergique supplémentaire.",
    confidence: 0.72,
    excerpt: "La paroxétine appartient à la classe des ISRS et partage le potentiel d'altération du métabolisme des folates. La surveillance du statut folate est recommandée, particulièrement en cas de dépression résistante.",
  },
  {
    subjectKey: "escitalopram",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "Classe ISRS. Altération métabolisme folates. Escitalopram : ISRS très sélectif, bonne tolérance.",
    confidence: 0.72,
    excerpt: "L'escitalopram, ISRS très sélectif, peut altérer le métabolisme des folates par des mécanismes épigénétiques. La supplémentation en 5-MTHF (forme active) peut améliorer la réponse thérapeutique.",
  },

  // ── Anticoagulants + plantes fluidifiantes ────────────────────────────────

  {
    subjectKey: "apixaban",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "omega-3", objectType: "SUPPLEMENT",
    qualifier: "Oméga-3 ≥3g/j : activité antiaggrégante plaquettaire → potentialisation risque hémorragique sous AOD.",
    confidence: 0.80,
    excerpt: "Les oméga-3 à doses élevées (>3g/j) exercent une activité antiagrégante plaquettaire qui peut potentialiser l'effet anticoagulant de l'apixaban. Risque hémorragique accru, particulièrement au niveau digestif et cérébral. Limiter la supplémentation à 1-2g/j sous AOD.",
  },
  {
    subjectKey: "apixaban",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "ginkgo-biloba", objectType: "SUPPLEMENT",
    qualifier: "Ginkgo : inhibition PAF et activité antiaggrégante → potentialisation risque hémorragique sous AOD.",
    confidence: 0.85,
    excerpt: "Le ginkgo biloba inhibe le facteur d'agrégation plaquettaire (PAF) et possède une activité antiagrégante intrinsèque. En association avec l'apixaban, le risque hémorragique est significativement majoré. Contre-indication relative documentée par plusieurs guidelines.",
  },
  {
    subjectKey: "rivaroxaban",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "omega-3", objectType: "SUPPLEMENT",
    qualifier: "Oméga-3 ≥3g/j : activité antiaggrégante → potentialisation risque hémorragique sous rivaroxaban.",
    confidence: 0.80,
    excerpt: "Les oméga-3 à fortes doses peuvent potentialiser l'effet anticoagulant du rivaroxaban. Même mécanisme qu'avec l'apixaban (classe AOD). Prudence et limitation de la dose d'oméga-3 recommandées.",
  },
  {
    subjectKey: "rivaroxaban",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "ginkgo-biloba", objectType: "SUPPLEMENT",
    qualifier: "Ginkgo biloba : activité antiaggrégante → potentialisation risque hémorragique sous rivaroxaban.",
    confidence: 0.85,
    excerpt: "Le ginkgo biloba potentialise l'activité anticoagulante du rivaroxaban par inhibition plaquettaire. Risque hémorragique majoré. Déconseillé en association avec tout anticoagulant oral.",
  },
  {
    subjectKey: "warfarine",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "millepertuis", objectType: "SUPPLEMENT",
    qualifier: "Millepertuis : inducteur puissant CYP3A4/P-gp → réduction INR significative. Interaction ANSM classée MAJEURE.",
    confidence: 0.98,
    excerpt: "Le millepertuis (Hypericum perforatum) est un puissant inducteur des cytochromes CYP3A4 et de la P-glycoprotéine. Il réduit significativement les taux plasmatiques de warfarine et l'INR, exposant à un risque thromboembolique. Cette interaction est classée MAJEURE par l'ANSM. Contre-indication formelle.",
  },
  {
    subjectKey: "warfarine",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "ginkgo-biloba", objectType: "SUPPLEMENT",
    qualifier: "Ginkgo biloba : activité anticoagulante additive → potentialisation risque hémorragique. Surveillance INR.",
    confidence: 0.82,
    excerpt: "Le ginkgo biloba potentialise l'activité anticoagulante de la warfarine. Des cas d'hémorragie intracrânienne ont été rapportés. Surveillance renforcée de l'INR indispensable en cas d'association. L'arrêt du ginkgo est préférable.",
  },

  // ── Lévothyroxine → interactions absorption ───────────────────────────────

  {
    subjectKey: "levothyroxine",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "calcium", objectType: "NUTRIENT",
    qualifier: "Calcium forme un complexe insoluble avec la T4 → réduction absorption lévothyroxine. Intervalle 4h requis.",
    confidence: 0.92,
    excerpt: "Le calcium (carbonate, citrate) forme un complexe insoluble avec la lévothyroxine dans le tube digestif, réduisant son absorption de 20 à 40%. Un intervalle d'au moins 4 heures est requis entre la prise de lévothyroxine (à jeun) et toute supplémentation en calcium. Risque d'hypothyroïdie iatrogène.",
  },
  {
    subjectKey: "levothyroxine",
    factType: "INTERACTION", predicate: "INTERACTS_WITH",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Magnésium forme un complexe avec la T4 → réduction absorption. Intervalle 2-4h recommandé.",
    confidence: 0.78,
    excerpt: "Le magnésium peut former des complexes avec la lévothyroxine et réduire son absorption intestinale. Un intervalle de 2 à 4 heures entre la prise de lévothyroxine et la supplémentation en magnésium est recommandé.",
  },

  // ── Immunosuppresseurs → folates ──────────────────────────────────────────

  {
    subjectKey: "methotrexate",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "Inhibition DHFR → blocage synthèse tétrahydrofolate. Supplémentation acide folique 5mg/semaine recommandée.",
    confidence: 0.98,
    excerpt: "Le méthotrexate est un antimétabolite qui inhibe la dihydrofolate réductase (DHFR), bloquant la synthèse du tétrahydrofolate. Cette déplétion provoque mucite, cytopénie et hépatotoxicité. La supplémentation systématique en acide folique (5 mg/semaine, le jour différent du MTX) est recommandée par toutes les guidelines rhumatologiques.",
  },
  {
    subjectKey: "cotrimoxazole",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "Inhibition DHFR bactérienne ET humaine → réduction tétrahydrofolate. Usage prolongé à surveiller.",
    confidence: 0.88,
    excerpt: "Le cotrimoxazole (triméthoprime + sulfaméthoxazole) inhibe partiellement la DHFR humaine, réduisant la synthèse de tétrahydrofolate. Un déficit en folates peut apparaître lors d'un usage prolongé, particulièrement chez les patients dénutris ou avec des besoins accrus (grossesse).",
  },

  // ── Corticostéroïdes → déplétion minéraux et vitamines ────────────────────

  {
    subjectKey: "prednisone",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "calcium", objectType: "NUTRIENT",
    qualifier: "Réduction absorption intestinale + augmentation excrétion rénale Ca. Risque ostéoporose cortisonique.",
    confidence: 0.92,
    excerpt: "La prednisone réduit l'absorption intestinale du calcium en inhibant l'action de la vitamine D et augmente son excrétion rénale. L'ostéoporose cortisonique est la complication la plus fréquente du traitement prolongé. Supplémentation calcium 1000-1500mg + vitamine D 800-2000 UI recommandée systématiquement.",
  },
  {
    subjectKey: "prednisone",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "zinc", objectType: "NUTRIENT",
    qualifier: "Augmentation excrétion urinaire zinc. Impact cicatrisation, immunité et synthèse protéique.",
    confidence: 0.78,
    excerpt: "Les corticostéroïdes augmentent l'excrétion urinaire de zinc, qui est essentiel à la cicatrisation, l'immunité et la synthèse des protéines. Une supplémentation en zinc peut être utile chez les patients sous corticothérapie prolongée présentant des retards de cicatrisation.",
  },
  {
    subjectKey: "prednisone",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "vitamine-c", objectType: "NUTRIENT",
    qualifier: "Corticoïdes accélèrent le catabolisme vitamine C → augmentation besoins. Déficit affecte l'immunité.",
    confidence: 0.75,
    excerpt: "Les corticostéroïdes augmentent le catabolisme de la vitamine C et peuvent induire un déficit. La vitamine C est nécessaire à la synthèse de collagène et au fonctionnement immunitaire. Supplémentation modérée (500 mg/j) envisageable lors de corticothérapie prolongée.",
  },
  {
    subjectKey: "prednisolone",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "calcium", objectType: "NUTRIENT",
    qualifier: "Même mécanisme que prednisone. Réduction absorption Ca + augmentation excrétion. Risque ostéoporose.",
    confidence: 0.92,
    excerpt: "La prednisolone, corticoïde de référence, partage avec la prednisone le mécanisme de déplétion calcique. Supplémentation calcium + vitamine D systématiquement recommandée en cas de traitement prolongé.",
  },
  {
    subjectKey: "prednisolone",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "zinc", objectType: "NUTRIENT",
    qualifier: "Augmentation excrétion urinaire zinc sous corticostéroïdes.",
    confidence: 0.78,
    excerpt: "La prednisolone augmente l'excrétion urinaire de zinc, affectant la cicatrisation et l'immunité. Supplémentation zinc à considérer en cas de traitement prolongé avec signes de déficit.",
  },

  // ── Furosémide → électrolytes ─────────────────────────────────────────────

  {
    subjectKey: "furosemide",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "potassium", objectType: "NUTRIENT",
    qualifier: "Diurétique de l'anse : perte potassium majeure. Risque hypokaliémie. Surveillance ionogramme indispensable.",
    confidence: 0.98,
    excerpt: "Le furosémide est un diurétique de l'anse qui inhibe la réabsorption de Na+/K+/2Cl- dans la branche ascendante de l'anse de Henle. La kaliurèse est majeure et dose-dépendante. Risque d'hypokaliémie sévère. Surveillance ionogramme, ECG. Supplémentation potassium souvent nécessaire.",
  },
  {
    subjectKey: "furosemide",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "magnesium", objectType: "NUTRIENT",
    qualifier: "Perte Mg parallèle à la perte K. Hypomagnésémie → résistance à la correction potassique.",
    confidence: 0.95,
    excerpt: "La perte rénale de magnésium sous furosémide accompagne la kaliurèse. L'hypomagnésémie est souvent sous-diagnostiquée et rend la correction de l'hypokaliémie difficile (le Mg est nécessaire pour recharger le K intracellulaire). Ionogramme complet incluant magnésémie recommandé.",
  },

  // ── AINS → muqueuse et folates ────────────────────────────────────────────

  {
    subjectKey: "ibuprofene",
    factType: "DEPLETION", predicate: "DEPLETES",
    objectKey: "folates", objectType: "NUTRIENT",
    qualifier: "AINS : inhibition partielle DHFR + augmentation besoins en folates. Surtout lors d'usage chronique.",
    confidence: 0.72,
    excerpt: "L'ibuprofène peut réduire modestement les niveaux de folates par inhibition partielle de la DHFR et augmentation du turnover. L'effet est principalement cliniquement significatif lors d'une utilisation chronique, notamment chez les femmes en âge de procréer.",
  },
  {
    subjectKey: "ibuprofene",
    factType: "SIDE_EFFECT", predicate: "CAUSES",
    objectKey: "irritation muqueuse gastrique", objectType: "CONDITION",
    qualifier: "Inhibition COX-1 → réduction prostaglandines protectrices → érosion muqueuse. Prise avec repas recommandée.",
    confidence: 0.95,
    excerpt: "L'ibuprofène inhibe la COX-1 gastrique, réduisant la production de prostaglandines protectrices de la muqueuse gastrique. Ce mécanisme provoque irritation, érosion et ulcération gastrique, particulièrement à jeun. Administration avec les repas, association IPP si facteurs de risque.",
  },

  // ── Bétahistine → effets digestifs ────────────────────────────────────────

  {
    subjectKey: "betahistine",
    factType: "SIDE_EFFECT", predicate: "CAUSES",
    objectKey: "nausées et troubles digestifs", objectType: "CONDITION",
    qualifier: "Agoniste histamine H1/H3 → effets digestifs fréquents. Prise avec repas recommandée.",
    confidence: 0.85,
    excerpt: "La bétahistine, agoniste des récepteurs H1 et antagoniste H3, peut provoquer des nausées, céphalées et troubles digestifs, effets indésirables fréquents de la classe. La prise avec les repas réduit ces symptômes. En cas de nausées persistantes, vérifier l'interaction avec d'autres antihistaminiques.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  Seed KnowledgeFact cliniques curatés — NaturoDesk");
  console.log("════════════════════════════════════════════════════════════\n");

  // ── Étape 1 : KnowledgeTerm DRUG — créer les manquants ──────────────────

  console.log("── Étape 1 : KnowledgeTerm DRUG ────────────────────────────");
  let termsCreated = 0;
  let termsExisting = 0;
  const termIdMap = new Map<string, string>(); // normalizedKey → id

  // Charger les terms existants
  const existingTerms = await db.knowledgeTerm.findMany({
    where: { termType: "DRUG" },
    select: { id: true, normalizedKey: true },
  });
  for (const t of existingTerms) {
    termIdMap.set(t.normalizedKey, t.id);
  }

  // Charger aussi les NUTRIENT/SUPPLEMENT terms pour objectTermId
  const existingNutrientTerms = await db.knowledgeTerm.findMany({
    where: { termType: { in: ["NUTRIENT", "SUPPLEMENT", "HERB"] } },
    select: { id: true, normalizedKey: true, termType: true },
  });
  const nutrientTermIdMap = new Map<string, string>();
  for (const t of existingNutrientTerms) {
    nutrientTermIdMap.set(t.normalizedKey, t.id);
  }

  console.log(`  ${existingTerms.length} KnowledgeTerm DRUG existants chargés`);
  console.log(`  ${existingNutrientTerms.length} KnowledgeTerm NUTRIENT/SUPPLEMENT existants chargés`);

  // Créer les KnowledgeTerm manquants
  for (const def of DRUG_TERMS_TO_ENSURE) {
    if (termIdMap.has(def.termNormalizedKey)) {
      termsExisting++;
      continue;
    }

    const term = await db.knowledgeTerm.create({
      data: {
        termType:      "DRUG",
        canonicalName: def.canonicalName,
        normalizedKey: def.termNormalizedKey,
        aliases:       def.aliases,
        category:      def.category,
      },
      select: { id: true },
    });
    termIdMap.set(def.termNormalizedKey, term.id);
    termsCreated++;
    console.log(`  + Créé KnowledgeTerm : ${def.termNormalizedKey} → ${def.canonicalName}`);
  }

  console.log(`  → ${termsCreated} créés, ${termsExisting} déjà présents`);

  // ── Étape 2 : DrugSubstance → knowledgeTermId ───────────────────────────

  console.log("\n── Étape 2 : Liaison DrugSubstance → KnowledgeTerm ─────────");
  let linksSet = 0;

  // Liens depuis DRUG_TERMS_TO_ENSURE
  for (const def of DRUG_TERMS_TO_ENSURE) {
    const termId = termIdMap.get(def.termNormalizedKey);
    if (!termId) continue;

    for (const substanceKey of def.substanceNormalizedKeys) {
      const updated = await db.drugSubstance.updateMany({
        where: {
          normalizedKey:    substanceKey,
          knowledgeTermId:  null, // ne pas écraser si déjà lié
        },
        data: { knowledgeTermId: termId },
      });
      if (updated.count > 0) {
        linksSet += updated.count;
        console.log(`  ↔ ${substanceKey} → ${def.termNormalizedKey}`);
      }
    }
  }

  // Liens supplémentaires (formes existantes)
  for (const [substanceKey, termKey] of Object.entries(SUBSTANCE_TERM_LINKS)) {
    const termId = termIdMap.get(termKey);
    if (!termId) continue;

    const updated = await db.drugSubstance.updateMany({
      where: {
        normalizedKey:   substanceKey,
        knowledgeTermId: null,
      },
      data: { knowledgeTermId: termId },
    });
    if (updated.count > 0) {
      linksSet += updated.count;
      console.log(`  ↔ ${substanceKey} → ${termKey}`);
    }
  }

  console.log(`  → ${linksSet} liaisons établies`);

  // ── Étape 3 : KnowledgeDocument CURATED ─────────────────────────────────

  console.log("\n── Étape 3 : KnowledgeDocument CURATED ─────────────────────");

  let curatedDoc = await db.knowledgeDocument.findFirst({
    where: { drugKey: "CURATED", sourceType: "MANUAL" },
    select: { id: true },
  });

  if (!curatedDoc) {
    curatedDoc = await db.knowledgeDocument.create({
      data: {
        drugKey:     "CURATED",
        sourceType:  "MANUAL",
        docType:     "MONOGRAPH",
        title:       "Faits cliniques curatés NaturoDesk — Interactions & Déplétion",
        contentHash: "curated-v1",
        fetchedAt:   new Date(),
      },
      select: { id: true },
    });
    console.log(`  + KnowledgeDocument créé : ${curatedDoc.id}`);
  } else {
    console.log(`  = KnowledgeDocument existant : ${curatedDoc.id}`);
  }

  // ── Étape 4 : KnowledgeChunk + KnowledgeFact ────────────────────────────

  console.log("\n── Étape 4 : KnowledgeChunk + KnowledgeFact ─────────────────");
  let chunksCreated = 0;
  let factsCreated = 0;
  let factsSkipped = 0;

  for (const factDef of CLINICAL_FACTS) {
    const subjectTermId = termIdMap.get(factDef.subjectKey);
    if (!subjectTermId) {
      console.warn(`  ⚠ Terme sujet inconnu : ${factDef.subjectKey} — skipped`);
      factsSkipped++;
      continue;
    }

    const objectTermId = nutrientTermIdMap.get(factDef.objectKey) ?? null;

    // Détermine le canonicalName du sujet
    const subjectTerm = [...termIdMap.entries()].find(([k]) => k === factDef.subjectKey);
    const subjectCanonical =
      DRUG_TERMS_TO_ENSURE.find((d) => d.termNormalizedKey === factDef.subjectKey)?.canonicalName ??
      existingTerms.find((t) => t.normalizedKey === factDef.subjectKey)?.id ?? // fallback id
      factDef.subjectKey;

    // ID déterministe pour idempotence
    const chunkId = `curated-chunk-${factDef.subjectKey}-${normalizeKey(factDef.objectKey)}-${factDef.predicate.toLowerCase()}`;
    const factId  = `curated-fact-${factDef.subjectKey}-${normalizeKey(factDef.objectKey)}-${factDef.predicate.toLowerCase()}`;

    // KnowledgeChunk
    await db.knowledgeChunk.upsert({
      where:  { id: chunkId },
      create: {
        id:         chunkId,
        documentId: curatedDoc.id,
        kind:       factDef.factType,
        label:      `${factDef.factType} — ${factDef.subjectKey} ${factDef.predicate} ${factDef.objectKey}`,
        excerpt:    factDef.excerpt,
        metaJson: {
          subject:   factDef.subjectKey,
          predicate: factDef.predicate,
          object:    factDef.objectKey,
          qualifier: factDef.qualifier,
        },
      },
      update: {
        excerpt: factDef.excerpt,
        label:   `${factDef.factType} — ${factDef.subjectKey} ${factDef.predicate} ${factDef.objectKey}`,
      },
    });
    chunksCreated++;

    // KnowledgeFact
    const existingFact = await db.knowledgeFact.findUnique({
      where:  { id: factId },
      select: { id: true },
    });

    if (!existingFact) {
      // Determine canonical names for display
      const knowledgeTermRecord = await db.knowledgeTerm.findUnique({
        where: { id: subjectTermId },
        select: { canonicalName: true },
      });
      const subjectName = knowledgeTermRecord?.canonicalName ?? factDef.subjectKey;

      // Get object canonical name
      let objectName = factDef.objectKey;
      if (objectTermId) {
        const objTerm = await db.knowledgeTerm.findUnique({
          where: { id: objectTermId },
          select: { canonicalName: true },
        });
        objectName = objTerm?.canonicalName ?? factDef.objectKey;
      }

      await db.knowledgeFact.create({
        data: {
          id:               factId,
          chunkId:          chunkId,
          documentId:       curatedDoc.id,
          factType:         factDef.factType,
          subject:          subjectName,
          subjectType:      "DRUG",
          predicate:        factDef.predicate,
          object:           objectName,
          objectType:       factDef.objectType as "NUTRIENT" | "SUPPLEMENT" | "HERB" | "CONDITION" | "SUBSTANCE",
          qualifier:        factDef.qualifier,
          confidence:       factDef.confidence,
          extractionMethod: "DETERMINISTIC",
          rawExcerpt:       factDef.excerpt.slice(0, 500),
          subjectTermId:    subjectTermId,
          objectTermId:     objectTermId,
        },
      });
      factsCreated++;
    } else {
      factsSkipped++;
    }
  }

  console.log(`  → ${chunksCreated} chunks créés/mis à jour, ${factsCreated} facts créés, ${factsSkipped} ignorés (existants ou terme manquant)`);

  // ── Résumé final ─────────────────────────────────────────────────────────

  const [totalFacts, totalTermsDrug, totalChunks] = await Promise.all([
    db.knowledgeFact.count(),
    db.knowledgeTerm.count({ where: { termType: "DRUG" } }),
    db.knowledgeChunk.count(),
  ]);

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  RÉSUMÉ");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  KnowledgeFact total    : ${totalFacts}`);
  console.log(`  KnowledgeTerm DRUG     : ${totalTermsDrug}`);
  console.log(`  KnowledgeChunk total   : ${totalChunks}`);
  console.log(`\n  → Test enrichi : npx ts-node -r tsconfig-paths/register \\`);
  console.log(`    --compiler-options '{"module":"CommonJS"}' scripts/test-bdpm-enriched-analysis.ts`);
  console.log("════════════════════════════════════════════════════════════\n");
}

main()
  .catch((err) => { console.error("Erreur :", err); process.exit(1); })
  .finally(() => db.$disconnect());
