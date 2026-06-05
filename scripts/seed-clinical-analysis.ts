/**
 * scripts/seed-clinical-analysis.ts
 *
 * Seed Phase 2 — Couche d'analyse clinique V1.
 *
 * Peuple dans l'ordre :
 *   1. ClinicalSource  — référentiels structurés (RCP ANSM + études)
 *   2. SymptomTerm     — catalogue symptômes normalisés (29 entrées)
 *   3. DrugSideEffect  — effets directs/mécanismes secondaires par substance
 *   4. DrugNutrientDepletion + NutrientDepletionSymptom — déplétions nutritionnelles
 *
 * Périmètre initial : 21 DCI couvrant les 43 substances BDPM déjà liées.
 * Sources : RCP ANSM §4.8 + études cliniques publiées (voir ClinicalSource).
 *
 * Idempotence :
 *   - SymptomTerm    : upsert par normalizedKey (unique)
 *   - DrugSideEffect : upsert par (drugSubstanceId, symptomTermId, effectType)
 *   - DrugNutrientDepletion : upsert par (drugSubstanceId, nutrientKey)
 *   - NutrientDepletionSymptom : upsert par (depletionId, symptomId)
 *   - ClinicalSource : findFirst par shortLabel + create si absent
 *
 * Obsolescence : les entrées qui ne font plus partie du catalogue courant
 *   sont marquées isActive=false (jamais supprimées).
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *     scripts/seed-clinical-analysis.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import {
  PrismaClient,
  type ClinicalSourceType,
  type SymptomCategory,
  type SideEffectFrequency,
  type SideEffectSeverity,
  type EffectTemporality,
  type ClinicalEvidenceLevel,
  type DrugEffectType,
} from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface SourceDef {
  type:        ClinicalSourceType;
  shortLabel:  string;
  authority?:  string;
  productName?: string;
  section?:    string;
  year?:       number;
  authors?:    string;
  journal?:    string;
  doi?:        string;
  pmid?:       string;
  url?:        string;
}

interface SymptomTermDef {
  normalizedKey: string;
  label:         string;
  labelEn?:      string;
  category:      SymptomCategory;
  synonyms:      string[];
  meddraCode?:   string;
}

interface SideEffectDef {
  symptomKey:    string;
  frequency:     SideEffectFrequency;
  severity?:     SideEffectSeverity;
  temporality?:  EffectTemporality;
  effectType?:   DrugEffectType;
  evidenceLevel: ClinicalEvidenceLevel;
  sourceSlug:    string;
  mechanism?:    string;
}

interface DepletionDef {
  nutrient:      string;
  nutrientKey:   string;
  mechanism:     string;
  evidenceLevel: ClinicalEvidenceLevel;
  sourceSlug:    string;
  symptomKeys:   string[];
}

// ---------------------------------------------------------------------------
// DATA — ClinicalSources
// Déduplication par shortLabel (unique stable).
// PMIDs inclus uniquement si vérifiés.
// ---------------------------------------------------------------------------

const SOURCES: Record<string, SourceDef> = {

  // ── RCP ANSM par DCI (ou groupe) ──────────────────────────────────────────
  "rcp-sertraline-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Sertraline", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Sertraline — ANSM 2024",
  },
  "rcp-escitalopram-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Escitalopram", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Escitalopram — ANSM 2024",
  },
  "rcp-fluoxetine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Fluoxétine", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Fluoxétine — ANSM 2024",
  },
  "rcp-paroxetine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Paroxétine", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Paroxétine — ANSM 2024",
  },
  "rcp-metformine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Metformine", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Metformine — ANSM 2024",
  },
  "rcp-statines-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Statines (atorvastatine, simvastatine, rosuvastatine, pravastatine)",
    section: "§4.8 Effets indésirables", shortLabel: "RCP Statines — ANSM 2024",
  },
  "rcp-levothyroxine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Lévothyroxine sodique", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Lévothyroxine — ANSM 2024",
  },
  "rcp-ipp-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Inhibiteurs de la pompe à protons (oméprazole, ésoméprazole, pantoprazole, lansoprazole)",
    section: "§4.8 Effets indésirables", shortLabel: "RCP IPP — ANSM 2024",
  },
  "rcp-ibuprofene-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Ibuprofène", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Ibuprofène — ANSM 2024",
  },
  "rcp-prednisolone-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Prednisolone", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Prednisolone — ANSM 2024",
  },
  "rcp-prednisone-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Prednisone", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Prednisone — ANSM 2024",
  },
  "rcp-furosemide-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Furosémide", section: "§4.4 Mises en garde / §4.8 Effets indésirables",
    shortLabel: "RCP Furosémide — ANSM 2024",
  },
  "rcp-amlodipine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Amlodipine", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Amlodipine — ANSM 2024",
  },
  "rcp-betahistine-ansm-2024": {
    type: "RCP_ANSM", authority: "ANSM", year: 2024,
    productName: "Bétahistine", section: "§4.8 Effets indésirables",
    shortLabel: "RCP Bétahistine — ANSM 2024",
  },

  // ── Études cliniques — déplétions nutritionnelles ─────────────────────────
  "study-b12-metformin-dejager-2010": {
    // Essai randomisé contrôlé — référence pivot B12/metformine
    type: "CLINICAL_STUDY",
    shortLabel: "de Jager J et al. — BMJ 2010 — Metformine et déficit B12",
    authors: "de Jager J, Kooy A, Lehert P et al.",
    journal: "BMJ", year: 2010,
    doi: "10.1136/bmj.c2181",
    // PMID: 20488910 — à vérifier avant utilisation clinique
  },
  "study-coq10-statins-expert-consensus": {
    // Mécanisme biochimique établi (inhibition HMG-CoA réductase commune) ;
    // effet clinique variable selon individu — RCP ne mentionne pas CoQ10 explicitement.
    type: "EXPERT_CONSENSUS",
    shortLabel: "Consensus — Déplétions CoQ10 par statines (médecine fonctionnelle)",
    authors: "Littarru GP, Langsjoen P",
    journal: "Mitochondrion", year: 2007,
  },
  "study-b12-ppi-lam-2013": {
    // Étude cas-témoins N > 25 000 — référence pivot B12/IPP
    type: "CLINICAL_STUDY",
    shortLabel: "Lam JR et al. — JAMA 2013 — IPP et déficit B12",
    authors: "Lam JR, Schneider JL, Zhao W, Corley DA",
    journal: "JAMA", year: 2013,
    doi: "10.1001/jama.2013.280927",
  },
  "study-mg-ppi-fda-2011": {
    // Communication FDA Drug Safety 2011 ; ANSM a suivi avec un DHPC similaire
    type: "HAS_GUIDELINE",
    shortLabel: "FDA Drug Safety Communication — IPP et hypomagnésémie 2011",
    authority: "FDA / ANSM", year: 2011,
    url: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-low-magnesium-levels-can-be-associated-long-term-use-proton-pump",
  },
};

// ---------------------------------------------------------------------------
// DATA — SymptomTerms
// 29 entrées — uniquement les symptômes référencés par les effets ci-dessous.
// Synonymes : vocabulaire patient (non médical), utilisé pour la normalisation.
// ---------------------------------------------------------------------------

const SYMPTOM_TERMS: SymptomTermDef[] = [

  // ── GASTROINTESTINAL ──────────────────────────────────────────────────────
  { normalizedKey: "nausee",          label: "Nausée",               labelEn: "Nausea",
    category: "GASTROINTESTINAL", meddraCode: "10028813",
    synonyms: ["nausées", "haut-le-cœur", "envie de vomir", "mal au cœur", "écœurement"] },
  { normalizedKey: "diarrhee",        label: "Diarrhée",             labelEn: "Diarrhea",
    category: "GASTROINTESTINAL", meddraCode: "10012735",
    synonyms: ["diarrhées", "selles liquides", "transit accéléré", "selles molles"] },
  { normalizedKey: "vomissement",     label: "Vomissement",          labelEn: "Vomiting",
    category: "GASTROINTESTINAL", meddraCode: "10047700",
    synonyms: ["vomissements", "nausées et vomissements"] },
  { normalizedKey: "douleur-abdominale", label: "Douleur abdominale", labelEn: "Abdominal pain",
    category: "GASTROINTESTINAL", meddraCode: "10000081",
    synonyms: ["douleurs abdominales", "douleur au ventre", "maux de ventre", "crampes abdominales", "ventre qui fait mal"] },
  { normalizedKey: "brulures-estomac", label: "Brûlures d'estomac",  labelEn: "Heartburn",
    category: "GASTROINTESTINAL", meddraCode: "10019326",
    synonyms: ["brûlures gastriques", "acidité", "pyrosis", "reflux gastrique", "remontées acides", "estomac qui brûle"] },
  { normalizedKey: "constipation",    label: "Constipation",         labelEn: "Constipation",
    category: "GASTROINTESTINAL", meddraCode: "10010774",
    synonyms: ["transit ralenti", "difficultés à aller aux toilettes", "selles dures"] },
  { normalizedKey: "ballonnement",    label: "Ballonnement",         labelEn: "Bloating",
    category: "GASTROINTESTINAL", meddraCode: "10000060",
    synonyms: ["ballonnements", "flatulences", "gaz intestinaux", "ventre gonflé", "distension abdominale"] },
  { normalizedKey: "perte-appetit",   label: "Perte d'appétit",      labelEn: "Loss of appetite",
    category: "GASTROINTESTINAL", meddraCode: "10002862",
    synonyms: ["anorexie", "manque d'appétit", "pas faim", "diminution de l'appétit", "plus envie de manger"] },

  // ── NEUROLOGICAL ─────────────────────────────────────────────────────────
  { normalizedKey: "cephalee",        label: "Céphalée",             labelEn: "Headache",
    category: "NEUROLOGICAL", meddraCode: "10019211",
    synonyms: ["maux de tête", "céphalées", "migraine", "tête qui fait mal", "mal à la tête"] },
  { normalizedKey: "vertiges",        label: "Vertiges",             labelEn: "Dizziness",
    category: "NEUROLOGICAL", meddraCode: "10013573",
    synonyms: ["vertige", "étourdissements", "tête qui tourne", "sensation de vertige", "tournis"] },
  { normalizedKey: "paresthesie",     label: "Paresthésie",          labelEn: "Paresthesia",
    category: "NEUROLOGICAL", meddraCode: "10033987",
    synonyms: ["fourmillements", "picotements", "engourdissements", "fourmis dans les jambes", "membres qui s'endorment"] },
  { normalizedKey: "tremblements",    label: "Tremblements",         labelEn: "Tremor",
    category: "NEUROLOGICAL", meddraCode: "10044565",
    synonyms: ["tremblement", "tremblements des mains", "mains qui tremblent"] },

  // ── PSYCHIATRIC ──────────────────────────────────────────────────────────
  { normalizedKey: "insomnie",        label: "Insomnie",             labelEn: "Insomnia",
    category: "PSYCHIATRIC", meddraCode: "10022437",
    synonyms: ["troubles du sommeil", "difficultés à dormir", "réveil nocturne", "difficultés d'endormissement", "sommeil perturbé", "nuits agitées"] },
  { normalizedKey: "anxiete",         label: "Anxiété",              labelEn: "Anxiety",
    category: "PSYCHIATRIC", meddraCode: "10002855",
    synonyms: ["angoisse", "nervosité", "stress", "agitation anxieuse", "inquiétude excessive"] },
  { normalizedKey: "irritabilite",    label: "Irritabilité",         labelEn: "Irritability",
    category: "PSYCHIATRIC", meddraCode: "10022998",
    synonyms: ["irritable", "humeur irritable", "nerveux", "impatience", "sautes d'humeur"] },

  // ── CARDIOVASCULAR ───────────────────────────────────────────────────────
  { normalizedKey: "palpitations",    label: "Palpitations",         labelEn: "Palpitations",
    category: "CARDIOVASCULAR", meddraCode: "10033557",
    synonyms: ["cœur qui bat fort", "battements cardiaques", "tachycardie", "cœur qui s'emballe", "cœur irrégulier"] },
  { normalizedKey: "hypotension-orthostatique", label: "Hypotension orthostatique", labelEn: "Orthostatic hypotension",
    category: "CARDIOVASCULAR", meddraCode: "10021097",
    synonyms: ["baisse de tension en se levant", "sensation d'évanouissement debout", "hypotension", "vertige en se levant"] },
  { normalizedKey: "oedeme-membres-inferieurs", label: "Œdème des membres inférieurs", labelEn: "Peripheral oedema",
    category: "CARDIOVASCULAR", meddraCode: "10030971",
    synonyms: ["jambes gonflées", "chevilles gonflées", "rétention d'eau", "œdème des chevilles"] },
  { normalizedKey: "bouffees-chaleur", label: "Bouffées de chaleur",  labelEn: "Hot flashes",
    category: "CARDIOVASCULAR", meddraCode: "10054524",
    synonyms: ["bouffées de chaleur", "flush", "rougeur soudaine", "sensation de chaleur subite"] },

  // ── MUSCULOSKELETAL ───────────────────────────────────────────────────────
  { normalizedKey: "myalgie",         label: "Myalgie",              labelEn: "Myalgia",
    category: "MUSCULOSKELETAL", meddraCode: "10028411",
    synonyms: ["douleurs musculaires", "courbatures", "muscles douloureux", "douleurs dans les muscles"] },
  { normalizedKey: "crampes-musculaires", label: "Crampes musculaires", labelEn: "Muscle cramps",
    category: "MUSCULOSKELETAL", meddraCode: "10049694",
    synonyms: ["crampes", "crampe musculaire", "contracture", "crampes dans les jambes", "crampes nocturnes"] },
  { normalizedKey: "faiblesse-musculaire", label: "Faiblesse musculaire", labelEn: "Muscle weakness",
    category: "MUSCULOSKELETAL", meddraCode: "10049436",
    synonyms: ["faiblesse des muscles", "perte de force musculaire", "asthénie musculaire", "difficultés à monter les escaliers"] },
  { normalizedKey: "arthralgie",      label: "Arthralgie",           labelEn: "Arthralgia",
    category: "MUSCULOSKELETAL", meddraCode: "10003239",
    synonyms: ["douleurs articulaires", "articulations douloureuses", "douleur des articulations"] },

  // ── METABOLIC ────────────────────────────────────────────────────────────
  { normalizedKey: "hyperglycemie",   label: "Hyperglycémie",        labelEn: "Hyperglycemia",
    category: "METABOLIC", meddraCode: "10020635",
    synonyms: ["glycémie élevée", "sucre dans le sang trop haut", "taux de glucose élevé"] },
  { normalizedKey: "prise-de-poids",  label: "Prise de poids",       labelEn: "Weight gain",
    category: "METABOLIC", meddraCode: "10047899",
    synonyms: ["poids qui augmente", "grossissement", "augmentation du poids", "kilos en plus"] },
  { normalizedKey: "perte-poids",     label: "Perte de poids",       labelEn: "Weight loss",
    category: "METABOLIC", meddraCode: "10047912",
    synonyms: ["amaigrissement", "poids qui diminue", "perte pondérale", "maigrir"] },

  // ── GENERAL ──────────────────────────────────────────────────────────────
  { normalizedKey: "fatigue",         label: "Fatigue",              labelEn: "Fatigue",
    category: "GENERAL", meddraCode: "10016256",
    synonyms: ["fatigué", "épuisement", "manque d'énergie", "asthénie", "lassitude", "pas d'énergie", "coup de pompe"] },
  { normalizedKey: "sueurs",          label: "Transpiration excessive", labelEn: "Hyperhidrosis",
    category: "GENERAL", meddraCode: "10020642",
    synonyms: ["transpiration", "sueurs", "sueurs nocturnes", "diaphorèse", "sueurs abondantes"] },
  { normalizedKey: "secheresse-buccale", label: "Sécheresse buccale", labelEn: "Dry mouth",
    category: "GENERAL", meddraCode: "10013781",
    synonyms: ["bouche sèche", "xérostomie", "manque de salive", "bouche pâteuse"] },
];

// ---------------------------------------------------------------------------
// DATA — Effets indésirables par DCI
// Clé = normalizedKey du KnowledgeTerm DCI
// Expanded automatiquement vers toutes les formes sel de la même DCI.
// Fréquences : VERY_COMMON > 1/10, COMMON 1/100–1/10, UNCOMMON 1/1000–1/100
// ---------------------------------------------------------------------------

const SIDE_EFFECTS_BY_DCI: Record<string, SideEffectDef[]> = {

  // ── ISRS ──────────────────────────────────────────────────────────────────
  "sertraline": [
    { symptomKey: "nausee",           frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024", mechanism: "Stimulation des récepteurs 5-HT3 intestinaux par la sérotonine" },
    { symptomKey: "diarrhee",         frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "fatigue",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "secheresse-buccale", frequency: "COMMON",    severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "anxiete",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "tremblements",     frequency: "UNCOMMON",    severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
    { symptomKey: "perte-appetit",    frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-sertraline-ansm-2024" },
  ],

  "escitalopram": [
    { symptomKey: "nausee",           frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024", mechanism: "Stimulation des récepteurs 5-HT3 intestinaux" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
    { symptomKey: "fatigue",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
    { symptomKey: "anxiete",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-escitalopram-ansm-2024" },
  ],

  "fluoxetine": [
    { symptomKey: "nausee",           frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024", mechanism: "Stimulation des récepteurs 5-HT3 intestinaux" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "fatigue",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "perte-appetit",    frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "tremblements",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
    { symptomKey: "anxiete",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-fluoxetine-ansm-2024" },
  ],

  "paroxetine": [
    { symptomKey: "nausee",           frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024", mechanism: "Stimulation des récepteurs 5-HT3 intestinaux" },
    { symptomKey: "secheresse-buccale", frequency: "VERY_COMMON", severity: "MILD",   temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024", mechanism: "Effet anticholinergique plus prononcé que les autres ISRS" },
    { symptomKey: "constipation",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024", mechanism: "Effet anticholinergique" },
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "fatigue",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "tremblements",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "anxiete",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
    { symptomKey: "perte-appetit",    frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-paroxetine-ansm-2024" },
  ],

  // ── Biguanides ────────────────────────────────────────────────────────────
  "metformine": [
    { symptomKey: "nausee",           frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-metformine-ansm-2024", mechanism: "Ralentissement de l'absorption intestinale du glucose ; irritation de la muqueuse digestive" },
    { symptomKey: "vomissement",      frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-metformine-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-metformine-ansm-2024" },
    { symptomKey: "douleur-abdominale", frequency: "VERY_COMMON", severity: "MILD",   temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-metformine-ansm-2024" },
    { symptomKey: "perte-appetit",    frequency: "VERY_COMMON", severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-metformine-ansm-2024" },
  ],

  // ── Statines ──────────────────────────────────────────────────────────────
  "atorvastatine": [
    { symptomKey: "myalgie",          frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024", mechanism: "Altération de la fonction mitochondriale musculaire par inhibition de la HMG-CoA réductase" },
    { symptomKey: "arthralgie",       frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
    { symptomKey: "faiblesse-musculaire", frequency: "UNCOMMON", severity: "MODERATE", temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024", mechanism: "Myopathie induite — surveiller CPK si douleurs musculaires intenses" },
  ],
  "simvastatine": [
    { symptomKey: "myalgie",          frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024", mechanism: "Altération de la fonction mitochondriale musculaire" },
    { symptomKey: "arthralgie",       frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
    { symptomKey: "faiblesse-musculaire", frequency: "UNCOMMON", severity: "MODERATE", temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
  ],
  "rosuvastatine": [
    { symptomKey: "myalgie",          frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024", mechanism: "Altération de la fonction mitochondriale musculaire" },
    { symptomKey: "arthralgie",       frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
    { symptomKey: "faiblesse-musculaire", frequency: "UNCOMMON", severity: "MODERATE", temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
  ],
  "pravastatine": [
    { symptomKey: "myalgie",          frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
    { symptomKey: "arthralgie",       frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
    { symptomKey: "faiblesse-musculaire", frequency: "UNCOMMON", severity: "MODERATE", temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-statines-ansm-2024" },
  ],

  // ── Thyroïde ──────────────────────────────────────────────────────────────
  "levothyroxine": [
    // Effets en cas de surdosage relatif ou phase d'ajustement
    { symptomKey: "palpitations",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024", mechanism: "Effet chronotrope positif par excès d'hormones thyroïdiennes" },
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024" },
    { symptomKey: "tremblements",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024" },
    { symptomKey: "anxiete",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024" },
    { symptomKey: "perte-poids",      frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-levothyroxine-ansm-2024" },
  ],

  // ── IPP ───────────────────────────────────────────────────────────────────
  "omeprazole": [
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "constipation",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "ballonnement",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
  ],
  "esomeprazole": [
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "constipation",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "ballonnement",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
  ],
  "pantoprazole": [
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "constipation",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "ballonnement",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
  ],
  "lansoprazole": [
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "diarrhee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "constipation",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
    { symptomKey: "ballonnement",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ipp-ansm-2024" },
  ],

  // ── AINS ──────────────────────────────────────────────────────────────────
  "ibuprofene": [
    { symptomKey: "brulures-estomac", frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ibuprofene-ansm-2024", mechanism: "Inhibition des COX-1 → réduction de la prostaglandine protectrice de la muqueuse gastrique" },
    { symptomKey: "douleur-abdominale", frequency: "COMMON",    severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ibuprofene-ansm-2024" },
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ibuprofene-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-ibuprofene-ansm-2024" },
  ],

  // ── Corticoïdes ───────────────────────────────────────────────────────────
  "prednisolone": [
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024", mechanism: "Activation glucocorticoïde du système nerveux central → perturbation du cycle veille-sommeil" },
    { symptomKey: "prise-de-poids",   frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024" },
    { symptomKey: "hyperglycemie",    frequency: "COMMON",      severity: "MODERATE", temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024", mechanism: "Augmentation de la néoglucogenèse hépatique et résistance à l'insuline" },
    { symptomKey: "irritabilite",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024" },
  ],
  "prednisone": [
    { symptomKey: "insomnie",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024" },
    { symptomKey: "prise-de-poids",   frequency: "COMMON",      severity: "MILD",     temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024" },
    { symptomKey: "hyperglycemie",    frequency: "COMMON",      severity: "MODERATE", temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024" },
    { symptomKey: "irritabilite",     frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024" },
    { symptomKey: "sueurs",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024" },
  ],

  // ── Diurétiques ───────────────────────────────────────────────────────────
  "furosemide": [
    { symptomKey: "hypotension-orthostatique", frequency: "COMMON", severity: "MILD",  temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024", mechanism: "Réduction de la volémie par natriurèse forcée" },
    { symptomKey: "vertiges",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024" },
    { symptomKey: "fatigue",          frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024" },
    // Crampes : mécanisme secondaire via déplétion potassium/magnésium
    { symptomKey: "crampes-musculaires", frequency: "COMMON",   severity: "MILD",     temporality: "DELAYED",
      effectType: "SECONDARY_MECHANISM", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024",
      mechanism: "Hypokaliémie et/ou hypomagnésémie induites par excrétion rénale accrue" },
    { symptomKey: "faiblesse-musculaire", frequency: "UNCOMMON", severity: "MILD",    temporality: "DELAYED",
      effectType: "SECONDARY_MECHANISM", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024",
      mechanism: "Hypokaliémie induite par excrétion rénale accrue" },
  ],

  // ── Calcium antagoniste ───────────────────────────────────────────────────
  "amlodipine": [
    { symptomKey: "oedeme-membres-inferieurs", frequency: "VERY_COMMON", severity: "MILD", temporality: "DELAYED", evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-amlodipine-ansm-2024", mechanism: "Vasodilatation précapillaire artériolaire avec filtration capillaire accrue" },
    { symptomKey: "bouffees-chaleur", frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-amlodipine-ansm-2024", mechanism: "Vasodilatation périphérique par blocage des canaux calciques" },
    { symptomKey: "palpitations",     frequency: "UNCOMMON",    severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-amlodipine-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-amlodipine-ansm-2024" },
    { symptomKey: "vertiges",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-amlodipine-ansm-2024" },
  ],

  // ── Bétahistine ───────────────────────────────────────────────────────────
  "betahistine": [
    { symptomKey: "nausee",           frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-betahistine-ansm-2024" },
    { symptomKey: "cephalee",         frequency: "COMMON",      severity: "MILD",     temporality: "EARLY",   evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-betahistine-ansm-2024" },
  ],
};

// ---------------------------------------------------------------------------
// DATA — Déplétions nutritionnelles par DCI
// Mécanisme 2 niveaux : substance → nutriment → symptôme(s) consécutif(s)
// ---------------------------------------------------------------------------

const DEPLETIONS_BY_DCI: Record<string, DepletionDef[]> = {

  // ── Metformine → Vitamine B12 ─────────────────────────────────────────────
  "metformine": [
    {
      nutrient: "Vitamine B12", nutrientKey: "vitamine-b12",
      mechanism:
        "La metformine réduit l'absorption intestinale de la vitamine B12 en inhibant " +
        "le transporteur cubam au niveau de l'iléon terminal, nécessaire à l'internalisation " +
        "du complexe vitamine B12-facteur intrinsèque. La déplétion est proportionnelle à " +
        "la durée et à la dose de traitement.",
      evidenceLevel: "CLINICAL_STUDY",
      sourceSlug: "study-b12-metformin-dejager-2010",
      symptomKeys: ["fatigue", "paresthesie", "irritabilite"],
    },
  ],

  // ── Statines → Coenzyme Q10 ───────────────────────────────────────────────
  "atorvastatine": [
    {
      nutrient: "Coenzyme Q10 (ubiquinone)", nutrientKey: "coenzyme-q10",
      mechanism:
        "Les statines inhibent la HMG-CoA réductase, enzyme commune aux voies de synthèse " +
        "du cholestérol et du coenzyme Q10. La réduction des taux plasmatiques et musculaires " +
        "de CoQ10 peut altérer la phosphorylation oxydative mitochondriale, contribuant aux " +
        "symptômes musculaires.",
      evidenceLevel: "EXPERT_CONSENSUS",
      sourceSlug: "study-coq10-statins-expert-consensus",
      symptomKeys: ["fatigue", "myalgie"],
    },
  ],
  "simvastatine": [
    {
      nutrient: "Coenzyme Q10 (ubiquinone)", nutrientKey: "coenzyme-q10",
      mechanism:
        "Inhibition de la HMG-CoA réductase → réduction de la synthèse du coenzyme Q10 " +
        "par la même voie que le cholestérol. Contribution potentielle aux myalgies sous statines.",
      evidenceLevel: "EXPERT_CONSENSUS",
      sourceSlug: "study-coq10-statins-expert-consensus",
      symptomKeys: ["fatigue", "myalgie"],
    },
  ],
  "rosuvastatine": [
    {
      nutrient: "Coenzyme Q10 (ubiquinone)", nutrientKey: "coenzyme-q10",
      mechanism:
        "Inhibition de la HMG-CoA réductase → réduction de la synthèse du coenzyme Q10. " +
        "Contribution potentielle aux myalgies sous statines.",
      evidenceLevel: "EXPERT_CONSENSUS",
      sourceSlug: "study-coq10-statins-expert-consensus",
      symptomKeys: ["fatigue", "myalgie"],
    },
  ],
  "pravastatine": [
    {
      nutrient: "Coenzyme Q10 (ubiquinone)", nutrientKey: "coenzyme-q10",
      mechanism:
        "Inhibition de la HMG-CoA réductase → réduction de la synthèse du coenzyme Q10. " +
        "Contribution potentielle aux myalgies sous statines.",
      evidenceLevel: "EXPERT_CONSENSUS",
      sourceSlug: "study-coq10-statins-expert-consensus",
      symptomKeys: ["fatigue", "myalgie"],
    },
  ],

  // ── IPP → Vitamine B12 + Magnésium ────────────────────────────────────────
  "omeprazole": [
    {
      nutrient: "Vitamine B12", nutrientKey: "vitamine-b12",
      mechanism:
        "La suppression de l'acidité gastrique par les IPP réduit la libération de la " +
        "vitamine B12 des protéines alimentaires et inhibe l'activité du facteur intrinsèque " +
        "acide-dépendante. L'absorption de B12 libre n'est pas affectée. La déplétion " +
        "apparaît après plusieurs années de traitement au long cours.",
      evidenceLevel: "CLINICAL_STUDY",
      sourceSlug: "study-b12-ppi-lam-2013",
      symptomKeys: ["fatigue", "paresthesie"],
    },
    {
      nutrient: "Magnésium", nutrientKey: "magnesium",
      mechanism:
        "Les IPP réduisent l'absorption active du magnésium au niveau intestinal par un " +
        "mécanisme non encore entièrement élucidé, possiblement lié à l'inhibition de " +
        "transporteurs TRPM6/TRPM7 magnésium-dépendants. L'hypomagnésémie survient après " +
        "3 mois ou plus de traitement.",
      evidenceLevel: "HAS_GUIDELINE",
      sourceSlug: "study-mg-ppi-fda-2011",
      symptomKeys: ["crampes-musculaires", "fatigue"],
    },
  ],
  "esomeprazole": [
    {
      nutrient: "Vitamine B12", nutrientKey: "vitamine-b12",
      mechanism:
        "Suppression de l'acidité gastrique → réduction de l'absorption de B12 acide-dépendante. " +
        "Risque après plusieurs années de traitement au long cours.",
      evidenceLevel: "CLINICAL_STUDY", sourceSlug: "study-b12-ppi-lam-2013",
      symptomKeys: ["fatigue", "paresthesie"],
    },
    {
      nutrient: "Magnésium", nutrientKey: "magnesium",
      mechanism:
        "Inhibition des transporteurs intestinaux du magnésium (TRPM6/TRPM7). " +
        "Hypomagnésémie après 3 mois ou plus de traitement.",
      evidenceLevel: "HAS_GUIDELINE", sourceSlug: "study-mg-ppi-fda-2011",
      symptomKeys: ["crampes-musculaires", "fatigue"],
    },
  ],
  "pantoprazole": [
    {
      nutrient: "Vitamine B12", nutrientKey: "vitamine-b12",
      mechanism:
        "Suppression de l'acidité gastrique → réduction de l'absorption de B12 acide-dépendante.",
      evidenceLevel: "CLINICAL_STUDY", sourceSlug: "study-b12-ppi-lam-2013",
      symptomKeys: ["fatigue", "paresthesie"],
    },
    {
      nutrient: "Magnésium", nutrientKey: "magnesium",
      mechanism:
        "Inhibition des transporteurs intestinaux du magnésium. " +
        "Hypomagnésémie après 3 mois ou plus de traitement.",
      evidenceLevel: "HAS_GUIDELINE", sourceSlug: "study-mg-ppi-fda-2011",
      symptomKeys: ["crampes-musculaires", "fatigue"],
    },
  ],
  "lansoprazole": [
    {
      nutrient: "Vitamine B12", nutrientKey: "vitamine-b12",
      mechanism:
        "Suppression de l'acidité gastrique → réduction de l'absorption de B12 acide-dépendante.",
      evidenceLevel: "CLINICAL_STUDY", sourceSlug: "study-b12-ppi-lam-2013",
      symptomKeys: ["fatigue", "paresthesie"],
    },
    {
      nutrient: "Magnésium", nutrientKey: "magnesium",
      mechanism:
        "Inhibition des transporteurs intestinaux du magnésium. " +
        "Hypomagnésémie après 3 mois ou plus de traitement.",
      evidenceLevel: "HAS_GUIDELINE", sourceSlug: "study-mg-ppi-fda-2011",
      symptomKeys: ["crampes-musculaires", "fatigue"],
    },
  ],

  // ── Furosémide → Potassium + Magnésium ───────────────────────────────────
  "furosemide": [
    {
      nutrient: "Potassium", nutrientKey: "potassium",
      mechanism:
        "Le furosémide inhibe le cotransporteur Na-K-2Cl (NKCC2) dans l'anse de Henlé, " +
        "augmentant l'excrétion urinaire de potassium. Une hypokaliémie peut résulter " +
        "d'un traitement prolongé sans supplémentation ou régime riche en potassium.",
      evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024",
      symptomKeys: ["crampes-musculaires", "faiblesse-musculaire", "palpitations"],
    },
    {
      nutrient: "Magnésium", nutrientKey: "magnesium",
      mechanism:
        "Le furosémide augmente l'excrétion rénale de magnésium. " +
        "Une hypomagnésémie peut survenir lors d'une utilisation prolongée, " +
        "aggravant les troubles musculaires.",
      evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-furosemide-ansm-2024",
      symptomKeys: ["crampes-musculaires", "fatigue"],
    },
  ],

  // ── Corticoïdes → Potassium ───────────────────────────────────────────────
  "prednisolone": [
    {
      nutrient: "Potassium", nutrientKey: "potassium",
      mechanism:
        "Les corticoïdes activent les récepteurs minéralocorticoïdes rénaux, " +
        "augmentant la réabsorption de sodium et l'excrétion de potassium. " +
        "Une hypokaliémie peut survenir lors de traitements prolongés à doses élevées.",
      evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisolone-ansm-2024",
      symptomKeys: ["crampes-musculaires", "faiblesse-musculaire"],
    },
  ],
  "prednisone": [
    {
      nutrient: "Potassium", nutrientKey: "potassium",
      mechanism:
        "La prednisone est convertie en prednisolone (forme active). " +
        "Activation des récepteurs minéralocorticoïdes → excrétion rénale accrue de potassium.",
      evidenceLevel: "RCP_ANSM", sourceSlug: "rcp-prednisone-ansm-2024",
      symptomKeys: ["crampes-musculaires", "faiblesse-musculaire"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Déduplication ClinicalSource par shortLabel (clé stable du seed). */
async function upsertSource(slug: string, def: SourceDef): Promise<string> {
  const existing = await db.clinicalSource.findFirst({
    where: { shortLabel: def.shortLabel },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.clinicalSource.create({ data: def });
  return created.id;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n==============================================");
  console.log("  Seed — Couche d'analyse clinique V1");
  console.log("==============================================\n");

  // ── Step 1 : ClinicalSources ──────────────────────────────────────────────
  console.log("  [1/4] ClinicalSources...");
  const sourceMap = new Map<string, string>(); // slug → id

  for (const [slug, def] of Object.entries(SOURCES)) {
    const id = await upsertSource(slug, def);
    sourceMap.set(slug, id);
  }
  console.log(`        ${sourceMap.size} sources traitées\n`);

  // ── Step 2 : SymptomTerms ──────────────────────────────────────────────────
  console.log("  [2/4] SymptomTerms...");
  const symptomMap = new Map<string, string>(); // normalizedKey → id
  let stCreated = 0, stUpdated = 0;

  const currentSymptomKeys = SYMPTOM_TERMS.map((s) => s.normalizedKey);

  for (const def of SYMPTOM_TERMS) {
    const result = await db.symptomTerm.upsert({
      where:  { normalizedKey: def.normalizedKey },
      create: { ...def },
      update: { label: def.label, labelEn: def.labelEn, category: def.category, synonyms: def.synonyms, meddraCode: def.meddraCode, isActive: true },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    symptomMap.set(def.normalizedKey, result.id);
    // createdAt === updatedAt → nouvelle entrée
    if (result.createdAt.getTime() === result.updatedAt.getTime()) stCreated++;
    else stUpdated++;
  }

  // Marquer obsolètes les entrées hors du catalogue courant
  const { count: stDeactivated } = await db.symptomTerm.updateMany({
    where: { normalizedKey: { notIn: currentSymptomKeys }, isActive: true },
    data:  { isActive: false },
  });
  console.log(`        créés=${stCreated} mis-à-jour=${stUpdated} désactivés=${stDeactivated}\n`);

  // ── Step 3 : Charger DrugSubstances groupées par DCI ──────────────────────
  console.log("  [3/4] DrugSideEffects...");

  const substances = await db.drugSubstance.findMany({
    where:   { isActive: true, knowledgeTermId: { not: null } },
    include: { knowledgeTerm: { select: { normalizedKey: true } } },
  });

  // DCI normalizedKey → [substanceId, ...]
  const substancesByDci = new Map<string, string[]>();
  for (const s of substances) {
    if (!s.knowledgeTerm) continue;
    const k = s.knowledgeTerm.normalizedKey;
    if (!substancesByDci.has(k)) substancesByDci.set(k, []);
    substancesByDci.get(k)!.push(s.id);
  }

  // Upsert DrugSideEffects
  let seCreated = 0, seUpdated = 0, seMissing = 0;

  for (const [dciKey, effects] of Object.entries(SIDE_EFFECTS_BY_DCI)) {
    const substanceIds = substancesByDci.get(dciKey);
    if (!substanceIds?.length) {
      console.warn(`        ⚠ DCI non trouvé en DB : ${dciKey}`);
      seMissing++;
      continue;
    }

    for (const substanceId of substanceIds) {
      for (const eff of effects) {
        const symptomTermId = symptomMap.get(eff.symptomKey);
        if (!symptomTermId) {
          console.warn(`        ⚠ SymptomTerm non trouvé : ${eff.symptomKey}`);
          continue;
        }
        const sourceId = sourceMap.get(eff.sourceSlug);
        if (!sourceId) {
          console.warn(`        ⚠ Source non trouvée : ${eff.sourceSlug}`);
          continue;
        }

        const effectType: DrugEffectType = eff.effectType ?? "DIRECT_SIDE_EFFECT";

        const result = await db.drugSideEffect.upsert({
          where: {
            drugSubstanceId_symptomTermId_effectType: {
              drugSubstanceId: substanceId,
              symptomTermId,
              effectType,
            },
          },
          create: {
            drugSubstanceId: substanceId,
            symptomTermId,
            effectType,
            frequency:     eff.frequency,
            severity:      eff.severity ?? "MILD",
            temporality:   eff.temporality ?? "UNKNOWN",
            evidenceLevel: eff.evidenceLevel,
            sourceId,
            mechanism:     eff.mechanism ?? null,
            isActive:      true,
          },
          update: {
            frequency:     eff.frequency,
            severity:      eff.severity ?? "MILD",
            temporality:   eff.temporality ?? "UNKNOWN",
            evidenceLevel: eff.evidenceLevel,
            sourceId,
            mechanism:     eff.mechanism ?? null,
            isActive:      true,
          },
          select: { id: true, createdAt: true, updatedAt: true },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) seCreated++;
        else seUpdated++;
      }
    }
  }
  console.log(`        créés=${seCreated} mis-à-jour=${seUpdated} DCI-manquants=${seMissing}\n`);

  // ── Step 4 : DrugNutrientDepletions + NutrientDepletionSymptoms ───────────
  console.log("  [4/4] Déplétions nutritionnelles...");
  let dndCreated = 0, dndUpdated = 0, ndsCreated = 0;

  for (const [dciKey, depletions] of Object.entries(DEPLETIONS_BY_DCI)) {
    const substanceIds = substancesByDci.get(dciKey);
    if (!substanceIds?.length) {
      console.warn(`        ⚠ DCI non trouvé en DB : ${dciKey}`);
      continue;
    }

    for (const substanceId of substanceIds) {
      for (const dep of depletions) {
        const sourceId = sourceMap.get(dep.sourceSlug);
        if (!sourceId) {
          console.warn(`        ⚠ Source non trouvée : ${dep.sourceSlug}`);
          continue;
        }

        const depletion = await db.drugNutrientDepletion.upsert({
          where: {
            drugSubstanceId_nutrientKey: {
              drugSubstanceId: substanceId,
              nutrientKey: dep.nutrientKey,
            },
          },
          create: {
            drugSubstanceId: substanceId,
            nutrient:      dep.nutrient,
            nutrientKey:   dep.nutrientKey,
            mechanism:     dep.mechanism,
            evidenceLevel: dep.evidenceLevel,
            sourceId,
            isActive:      true,
          },
          update: {
            nutrient:      dep.nutrient,
            mechanism:     dep.mechanism,
            evidenceLevel: dep.evidenceLevel,
            sourceId,
            isActive:      true,
          },
          select: { id: true, createdAt: true, updatedAt: true },
        });

        if (depletion.createdAt.getTime() === depletion.updatedAt.getTime()) dndCreated++;
        else dndUpdated++;

        // NutrientDepletionSymptoms
        for (const symptomKey of dep.symptomKeys) {
          const symptomId = symptomMap.get(symptomKey);
          if (!symptomId) {
            console.warn(`        ⚠ Symptôme déplétion non trouvé : ${symptomKey}`);
            continue;
          }

          await db.nutrientDepletionSymptom.upsert({
            where: {
              depletionId_symptomId: {
                depletionId: depletion.id,
                symptomId,
              },
            },
            create: { depletionId: depletion.id, symptomId },
            update: {},
          });
          ndsCreated++;
        }
      }
    }
  }
  console.log(`        dépletions créées=${dndCreated} mises-à-jour=${dndUpdated}`);
  console.log(`        jonctions symptômes=${ndsCreated}\n`);

  // ── Résumé final ──────────────────────────────────────────────────────────
  const [csStat, stStat, dseStat, dndStat, ndsStat] = await Promise.all([
    db.clinicalSource.count(),
    db.symptomTerm.count({ where: { isActive: true } }),
    db.drugSideEffect.count({ where: { isActive: true } }),
    db.drugNutrientDepletion.count({ where: { isActive: true } }),
    db.nutrientDepletionSymptom.count(),
  ]);

  console.log("==============================================");
  console.log("  Résumé base de données");
  console.log("==============================================");
  console.log(`  clinical_sources             : ${csStat}`);
  console.log(`  symptom_terms (actifs)       : ${stStat}`);
  console.log(`  drug_side_effects (actifs)   : ${dseStat}`);
  console.log(`  drug_nutrient_depletions     : ${dndStat}`);
  console.log(`  nutrient_depletion_symptoms  : ${ndsStat}`);
  console.log("==============================================\n");
}

main()
  .catch((err) => {
    console.error("  ✗ Erreur fatale :", err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => db.$disconnect());
