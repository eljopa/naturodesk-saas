/**
 * Seeds V1 — Interactions croisées médicaments ↔ suppléments.
 *
 * Source principale (Option B) : règles structurées, auditables, documentées.
 * Ces seeds priment sur tout signal textuel (Option A fallback).
 *
 * Chaque règle est :
 *   - identifiable (id stable)
 *   - fondée sur un mécanisme connu et explicable
 *   - rattachée à une source de référence
 *   - actionnable pour le praticien (recommendation)
 *
 * Scope V1 (15–20 règles critiques) :
 *   - Anticoagulants / antiagrégants
 *   - Antibiotiques (chélation des minéraux, probiotiques)
 *   - Antihypertenseurs (IEC / sartans)
 *   - ISRS / IRSN
 *   - Immunosuppresseurs
 *
 * Statines reportées en V2 (déplétions déjà couvertes par rules.ts R4).
 */

export interface DrugInteractionSeed {
  /** Identifiant unique stable — utilisé dans le titre du finding pour traçabilité. */
  id: string;
  /** Clés normalisées du supplément (matchées contre IntakeWithResolution.normalizedKey). */
  supplementKeys: string[];
  /**
   * Patterns bruts de fallback pour suppléments non résolus
   * (matchés en substring insensible à la casse contre intake.rawText).
   */
  supplementRawPatterns: string[];
  /** Nom d'affichage du supplément. */
  supplementLabel: string;
  /** Classe médicamenteuse humaine. */
  drugClass: string;
  /**
   * Patterns de noms de médicaments (matchés en lowercase substring
   * contre Medication.name). Inclure DCI et noms de marque français.
   */
  drugPatterns: string[];
  /** Sévérité clinique estimée. */
  severity: "HIGH" | "MEDIUM" | "LOW";
  /** Niveau de risque affiché dans l'UI. */
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  /** Niveau de preuve : DOCUMENTED = sources primaires, CLINICAL = consensus clinique. */
  evidenceLevel: "DOCUMENTED" | "CLINICAL";
  /** Mécanisme d'interaction (phrase courte, explicable). */
  mechanism: string;
  /** Recommandation clinique concrète au praticien. */
  recommendation: string;
  /** Libellé de la (des) source(s) de référence. */
  sourceLabel: string;
}

// ---------------------------------------------------------------------------
// Listes de patterns médicamenteux partagées (DCI + marques françaises)
// ---------------------------------------------------------------------------

const ANTICOAGULANT_PATTERNS = [
  // AVK
  "warfarin", "warfarine",
  "acenocoumarol", "acénocoumarol",
  // AOD
  "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "edoxabane",
  // Héparines
  "heparin", "héparine", "hbpm", "enoxaparin", "enoxaparine",
  // Marques françaises
  "coumadine", "sintrom", "eliquis", "xarelto", "pradaxa", "lixiana",
  "préviscan", "previscan",
];

const ANTIAGGREGANT_PATTERNS = [
  "aspirine", "aspirin",
  "clopidogrel", "plavix",
  "ticagrelor", "brillique",
  "prasugrel", "efient",
  "dipyridamole", "persantine",
  "ticlopidine",
];

const QUINOLONE_PATTERNS = [
  "ciprofloxacin", "ciprofloxacine",
  "levofloxacin", "lévofloxacine", "levofloxacine",
  "ofloxacin", "ofloxacine",
  "norfloxacin", "norfloxacine",
  "moxifloxacin", "moxifloxacine",
  // Marques françaises
  "ciflox", "tavanic", "oflocet", "izilox",
];

const TETRACYCLINE_PATTERNS = [
  "doxycycline",
  "tetracycline", "tétracycline",
  "minocycline",
  // Marques françaises
  "vibramycine", "tolexine",
];

const ANTIBIOTIC_GENERAL_PATTERNS = [
  ...QUINOLONE_PATTERNS,
  ...TETRACYCLINE_PATTERNS,
  "amoxicillin", "amoxicilline",
  "amoxiclav", "augmentin", "clamoxyl",
  "penicillin", "pénicilline",
  "azithromycin", "azithromycine", "zithromax",
  "erythromycin", "erythromycine",
  "cephalexin", "cefalexine",
  "cefpodoxime", "ceftriaxone",
  "trimethoprim", "cotrimoxazole", "bactrim",
  "metronidazole", "flagyl",
  "clarithromycin", "clarithromycine", "zeclar",
  "nitrofurantoin", "furadantine",
  "clindamycin", "clindamycine",
  "vancomycin", "vancomycine",
  "linezolid", "linézolide",
];

const IEC_SARTAN_PATTERNS = [
  // IEC (DCI)
  "enalapril", "lisinopril", "ramipril", "perindopril", "captopril",
  "benazepril", "zofenopril", "quinapril", "fosinopril",
  // IEC (marques françaises)
  "triatec", "renitec", "coversyl", "acuitel", "monopril",
  // Sartans (DCI)
  "losartan", "valsartan", "irbesartan", "olmesartan",
  "candesartan", "telmisartan", "eprosartan",
  // Sartans (marques françaises)
  "cozaar", "nisis", "approvel", "olmetec", "atacand", "micardis",
];

const ISRS_PATTERNS = [
  "fluoxetine", "fluoxétine",
  "sertraline",
  "paroxetine", "paroxétine",
  "citalopram",
  "escitalopram",
  "fluvoxamine",
  // Marques françaises
  "prozac", "zoloft", "deroxat", "seropram", "seroplex", "floxyfral",
];

const IRSN_PATTERNS = [
  "venlafaxine",
  "duloxetine", "duloxétine",
  "milnacipran",
  "desvenlafaxine",
  // Marques françaises
  "effexor", "cymbalta", "ixel",
];

const ISRS_IRSN_PATTERNS = [...ISRS_PATTERNS, ...IRSN_PATTERNS];

const IMMUNOSUPPRESSANT_PATTERNS = [
  "cyclosporine", "ciclosporine",
  "tacrolimus",
  "sirolimus", "everolimus",
  "mycophenolate", "mofetil",
  "azathioprine",
  "methotrexate", "méthotrexate",
  // Marques françaises
  "neoral", "sandimmun",
  "prograf",
  "rapamune", "certican",
  "cellcept", "myfortic",
  "imurel",
];

// ---------------------------------------------------------------------------
// Seeds V1 — 18 règles
// ---------------------------------------------------------------------------

export const DRUG_INTERACTION_SEEDS: DrugInteractionSeed[] = [

  // ── Anticoagulants ────────────────────────────────────────────────────────

  {
    id: "ANTICOAG_OMEGA3",
    supplementKeys: [
      "omega-3", "acides-gras-omega-3",
      "epa", "dha",
      "huile-de-poisson",
    ],
    supplementRawPatterns: [
      "omega", "oméga",
      "fish oil", "huile de poisson",
      " epa ", " dha ",
    ],
    supplementLabel: "Oméga-3",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Les acides gras oméga-3 (EPA/DHA) inhibent l'agrégation plaquettaire et potentialisent l'effet des anticoagulants. A doses élevées (>= 3 g/j d'EPA+DHA), le risque hémorragique est cliniquement significatif.",
    recommendation:
      "Signaler au médecin prescripteur. Surveillance de l'INR si AVK. Prudence particulière à doses >= 3 g/j d'EPA+DHA.",
    sourceLabel: "NIH ODS — Omega-3 Fatty Acids ; ANSM",
  },

  {
    id: "ANTICOAG_VIT_E",
    supplementKeys: [
      "vitamine-e", "tocopherol",
      "alpha-tocopherol", "dl-alpha-tocopherol",
    ],
    supplementRawPatterns: [
      "vitamine e", "vitamin e",
      "tocopherol", "tocophérol",
    ],
    supplementLabel: "Vitamine E",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "La vitamine E inhibe l'agrégation plaquettaire et antagonise partiellement la vitamine K, potentialisant l'effet des AVK. A doses > 400 UI/j, le risque hémorragique est documenté.",
    recommendation:
      "Eviter les doses > 400 UI/j en cas d'anticoagulant. Surveillance INR renforcée. Informer le prescripteur.",
    sourceLabel: "NIH ODS — Vitamin E ; Prescrire",
  },

  {
    id: "ANTICOAG_GINKGO",
    supplementKeys: ["ginkgo", "ginkgo-biloba"],
    supplementRawPatterns: ["ginkgo"],
    supplementLabel: "Ginkgo biloba",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le ginkgo inhibe le PAF (platelet-activating factor) et la phosphodiestérase, réduisant l'agrégation plaquettaire. L'association avec les AVK est contre-indiquée ; déconseillée avec les anticoagulants directs.",
    recommendation:
      "Association déconseillée / contre-indiquée avec les AVK. Signaler impérativement au prescripteur.",
    sourceLabel: "NIH ODS — Ginkgo ; ANSM ; Prescrire",
  },

  {
    id: "ANTICOAG_NATTOKINASE",
    supplementKeys: ["nattokinase"],
    supplementRawPatterns: ["nattokinase"],
    supplementLabel: "Nattokinase",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "La nattokinase est une enzyme fibrinolytique propre. Son activité thrombolytique cumulée à un anticoagulant constitue un risque hémorragique sérieux, documenté.",
    recommendation:
      "Association contre-indiquée avec tout anticoagulant. Arrêt du supplément ou concertation impérative avec le prescripteur.",
    sourceLabel: "NIH ODS — Nattokinase",
  },

  {
    id: "ANTICOAG_CURCUMA",
    supplementKeys: ["curcuma", "curcumine", "curcuminoide"],
    supplementRawPatterns: ["curcuma", "curcumin", "turmeric"],
    supplementLabel: "Curcuma / Curcumine",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "La curcumine inhibe la COX-1/COX-2 et réduit modérément l'agrégation plaquettaire. La potentialisation avec les anticoagulants est documentée à doses élevées (> 1 g/j).",
    recommendation:
      "Prudence à doses élevées (> 1 g/j de curcumine). Surveiller les signes hémorragiques. Informer le prescripteur.",
    sourceLabel: "NIH ODS — Turmeric",
  },

  {
    id: "ANTICOAG_AIL",
    supplementKeys: ["ail", "allicine", "ail-des-ours"],
    supplementRawPatterns: ["ail", "garlic", "allicin", "allicine"],
    supplementLabel: "Ail (extrait concentré)",
    drugClass: "Anticoagulants / AVK",
    drugPatterns: ANTICOAGULANT_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "L'allicine et l'ajoène de l'ail inhibent l'agrégation plaquettaire et ont un léger effet fibrinolytique. Le risque concerne principalement les extraits concentrés.",
    recommendation:
      "Prudence avec les extraits d'ail concentrés en cas d'anticoagulant. L'ail alimentaire représente un risque négligeable.",
    sourceLabel: "NIH ODS — Garlic",
  },

  // ── Antiagrégants plaquettaires ───────────────────────────────────────────

  {
    id: "ANTIAGREG_OMEGA3",
    supplementKeys: [
      "omega-3", "acides-gras-omega-3",
      "epa", "dha",
      "huile-de-poisson",
    ],
    supplementRawPatterns: [
      "omega", "oméga",
      "fish oil", "huile de poisson",
      " epa ", " dha ",
    ],
    supplementLabel: "Oméga-3",
    drugClass: "Antiagrégants plaquettaires",
    drugPatterns: ANTIAGGREGANT_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Les oméga-3 (EPA/DHA) potentialisent l'inhibition de l'agrégation plaquettaire par les antiagrégants (aspirine, clopidogrel). Le risque hémorragique augmente à doses élevées.",
    recommendation:
      "Signaler au prescripteur. Limiter les oméga-3 à <= 2 g/j d'EPA+DHA. Surveiller les signes hémorragiques.",
    sourceLabel: "NIH ODS — Omega-3 Fatty Acids",
  },

  // ── Antibiotiques — Chélation par minéraux ────────────────────────────────

  {
    id: "ANTIBIO_MG_QUINOLONES",
    supplementKeys: [
      "magnesium",
      "magnesium-bisglycinate", "magnesium-citrate",
      "magnesium-marin", "magnesium-malate",
      "magnesium-glycerophosphate",
    ],
    supplementRawPatterns: ["magnesium", "magnésium", "magné"],
    supplementLabel: "Magnésium",
    drugClass: "Quinolones (antibiotiques)",
    drugPatterns: QUINOLONE_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le magnésium chélate les fluoroquinolones dans le tube digestif, réduisant leur absorption jusqu'à 50 %. L'efficacité antibiotique peut être compromise de manière cliniquement significative.",
    recommendation:
      "Espacer la prise de magnésium de 2 heures minimum avant ou 6 heures après la quinolone. Informer le prescripteur.",
    sourceLabel: "NIH ODS — Magnesium ; ANSM",
  },

  {
    id: "ANTIBIO_MG_TETRACYCLINES",
    supplementKeys: [
      "magnesium",
      "magnesium-bisglycinate", "magnesium-citrate",
      "magnesium-marin", "magnesium-malate",
      "magnesium-glycerophosphate",
    ],
    supplementRawPatterns: ["magnesium", "magnésium", "magné"],
    supplementLabel: "Magnésium",
    drugClass: "Tétracyclines (antibiotiques)",
    drugPatterns: TETRACYCLINE_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le magnésium forme des complexes insolubles avec les tétracyclines (doxycycline, minocycline), réduisant leur absorption intestinale et donc leur efficacité.",
    recommendation:
      "Espacer la prise de magnésium de la tétracycline de 2 heures minimum. Prendre l'antibiotique à distance de tout minéral bivalent.",
    sourceLabel: "NIH ODS — Magnesium ; Prescrire",
  },

  {
    id: "ANTIBIO_CA_TETRACYCLINES",
    supplementKeys: [
      "calcium",
      "carbonate-de-calcium", "citrate-de-calcium",
      "gluconate-de-calcium",
    ],
    supplementRawPatterns: ["calcium"],
    supplementLabel: "Calcium",
    drugClass: "Tétracyclines (antibiotiques)",
    drugPatterns: TETRACYCLINE_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le calcium forme des chélates insolubles avec les tétracyclines, réduisant substantiellement leur absorption (interaction similaire aux produits laitiers).",
    recommendation:
      "Espacer la prise de calcium de la tétracycline de 2 heures minimum. Eviter les produits laitiers pendant le traitement.",
    sourceLabel: "NIH ODS — Calcium ; ANSM",
  },

  {
    id: "ANTIBIO_ZINC_TETRACYCLINES_QUINOLONES",
    supplementKeys: ["zinc"],
    supplementRawPatterns: ["zinc"],
    supplementLabel: "Zinc",
    drugClass: "Tétracyclines / Quinolones (antibiotiques)",
    drugPatterns: [...TETRACYCLINE_PATTERNS, ...QUINOLONE_PATTERNS],
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le zinc chélate les tétracyclines et les quinolones, réduisant leur absorption. L'effet est moins marqué qu'avec le calcium ou le magnésium mais reste pertinent cliniquement.",
    recommendation:
      "Espacer la prise de zinc de l'antibiotique de 2 heures minimum.",
    sourceLabel: "NIH ODS — Zinc",
  },

  {
    id: "ANTIBIO_PROBIOTICS",
    supplementKeys: [
      "probiotiques", "lactobacillus",
      "bifidobacterium", "saccharomyces",
      "lactobacille",
    ],
    supplementRawPatterns: [
      "probiotique", "lactobacill",
      "bifidobacter", "saccharomyces",
      "lactobacille",
    ],
    supplementLabel: "Probiotiques",
    drugClass: "Antibiotiques (large spectre)",
    drugPatterns: ANTIBIOTIC_GENERAL_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "Les antibiotiques à large spectre réduisent la viabilité des souches probiotiques administrées simultanément. Pris sans délai, les probiotiques perdent l'essentiel de leur efficacité.",
    recommendation:
      "Espacer la prise de probiotiques et d'antibiotiques de 2 heures minimum. Privilégier Saccharomyces boulardii (moins sensible aux antibiotiques bactériens).",
    sourceLabel: "NIH ODS — Probiotics",
  },

  // ── Antihypertenseurs ─────────────────────────────────────────────────────

  {
    id: "ANTIHYP_POTASSIUM_IEC",
    supplementKeys: ["potassium"],
    supplementRawPatterns: ["potassium"],
    supplementLabel: "Potassium",
    drugClass: "IEC / Sartans (antihypertenseurs)",
    drugPatterns: IEC_SARTAN_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Les IEC et sartans bloquent l'aldostérone et réduisent l'excrétion rénale du potassium. Une supplémentation peut provoquer une hyperkaliémie (risque accru chez l'insuffisant rénal ou diabétique).",
    recommendation:
      "Surveiller la kaliémie. Eviter la supplémentation en potassium sans avis médical si traitement par IEC ou sartan.",
    sourceLabel: "NIH ODS — Potassium ; ANSM",
  },

  // ── ISRS / IRSN ───────────────────────────────────────────────────────────

  {
    id: "ISRS_MILLEPERTUIS",
    supplementKeys: ["millepertuis", "hypericum", "hypericum-perforatum"],
    supplementRawPatterns: [
      "millepertuis", "hypericum",
      "st john", "saint john",
    ],
    supplementLabel: "Millepertuis (Hypericum perforatum)",
    drugClass: "ISRS / IRSN (antidépresseurs)",
    drugPatterns: ISRS_IRSN_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le millepertuis inhibe la recapture de la sérotonine (mécanisme similaire aux ISRS/IRSN). L'association peut provoquer un syndrome sérotoninergique : confusion, tremblements, hyperthermie, agitation — potentiellement fatal.",
    recommendation:
      "Association contre-indiquée. Arrêt impératif du millepertuis si ISRS ou IRSN en cours. Informer le prescripteur immédiatement.",
    sourceLabel: "NIH ODS — St. John's Wort ; ANSM ; EMA",
  },

  {
    id: "ISRS_TRYPTOPHANE",
    supplementKeys: ["tryptophane", "l-tryptophane"],
    supplementRawPatterns: ["tryptophane", "tryptophan"],
    supplementLabel: "L-Tryptophane",
    drugClass: "ISRS / IRSN (antidépresseurs)",
    drugPatterns: ISRS_IRSN_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "Le tryptophane est le précurseur direct de la sérotonine. Combiné à un inhibiteur de recapture sérotoninergique, l'accumulation de sérotonine peut provoquer un syndrome sérotoninergique.",
    recommendation:
      "Eviter l'association sans avis médical. Si maintenue, surveiller les signes sérotoninergiques (agitation, tremblements, hyperthermie).",
    sourceLabel: "NIH ODS — Tryptophan ; Prescrire",
  },

  // ── Immunosuppresseurs ────────────────────────────────────────────────────

  {
    id: "IMMUNOSUP_MILLEPERTUIS",
    supplementKeys: ["millepertuis", "hypericum", "hypericum-perforatum"],
    supplementRawPatterns: [
      "millepertuis", "hypericum",
      "st john", "saint john",
    ],
    supplementLabel: "Millepertuis (Hypericum perforatum)",
    drugClass: "Immunosuppresseurs (ciclosporine, tacrolimus…)",
    drugPatterns: IMMUNOSUPPRESSANT_PATTERNS,
    severity: "HIGH",
    riskLevel: "HIGH",
    evidenceLevel: "DOCUMENTED",
    mechanism:
      "Le millepertuis est un puissant inducteur enzymatique (CYP3A4, P-gp). Il réduit de manière drastique les taux sanguins de ciclosporine, tacrolimus et sirolimus, avec rejets de greffe documentés dans la littérature.",
    recommendation:
      "Association absolument contre-indiquée. Arrêt impératif du millepertuis. Cas de rejets de greffe documentés.",
    sourceLabel: "NIH ODS — St. John's Wort ; ANSM ; EMA ; Prescrire",
  },

  {
    id: "IMMUNOSUP_ASTRAGALE",
    supplementKeys: ["astragale", "astragalus", "astragalus-membranaceus"],
    supplementRawPatterns: ["astragale", "astragalus"],
    supplementLabel: "Astragale (Astragalus membranaceus)",
    drugClass: "Immunosuppresseurs",
    drugPatterns: IMMUNOSUPPRESSANT_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "L'astragale stimule l'immunité cellulaire (lymphocytes T, NK, macrophages). Il peut antagoniser les traitements immunosuppresseurs et augmenter le risque de rejet ou de poussée inflammatoire.",
    recommendation:
      "Eviter l'association avec les immunosuppresseurs. Discuter avec le prescripteur avant toute utilisation chez un patient immunosupprimé.",
    sourceLabel: "NIH ODS — Astragalus",
  },

  {
    id: "IMMUNOSUP_ECHINACEA",
    supplementKeys: [
      "echinacea", "echinacea-purpurea",
      "echinacea-angustifolia", "echinacee",
    ],
    supplementRawPatterns: ["echinac", "échinac"],
    supplementLabel: "Echinacée (Echinacea sp.)",
    drugClass: "Immunosuppresseurs",
    drugPatterns: IMMUNOSUPPRESSANT_PATTERNS,
    severity: "MEDIUM",
    riskLevel: "MEDIUM",
    evidenceLevel: "CLINICAL",
    mechanism:
      "L'échinacée stimule la production de cytokines pro-inflammatoires et active les cellules NK. Elle peut antagoniser l'effet immunosuppresseur et augmenter le risque de rejet ou de poussée auto-immune.",
    recommendation:
      "Contre-indiqué en cas de traitement immunosuppresseur actif. Déconseillé en présence de maladies auto-immunes traitées.",
    sourceLabel: "NIH ODS — Echinacea ; ANSM",
  },
];
