/**
 * Données de seed pour les 30 ingrédients suppléments V1.
 *
 * Ces données alimentent le script scripts/seed-supplement-terms.ts
 * via un upsert Prisma sur KnowledgeTerm (clé unique : normalizedKey).
 *
 * termType :
 *   NUTRIENT  → micronutriments (vitamines, minéraux, acides gras essentiels)
 *   SUPPLEMENT → molécules, plantes, extraits, probiotiques
 *
 * odsId :
 *   Slug URL de la fiche ODS HealthProfessional (ex: "Magnesium" →
 *   https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/)
 *   null si aucune fiche ODS dédiée n'existe pour cet ingrédient.
 *
 * category :
 *   Catégorie métier libre — utilisée pour le regroupement UI et le filtrage.
 *
 * aliases :
 *   Stockés dans KnowledgeTerm.aliases (String[]).
 *   Les clés normalisées de ces aliases doivent également être présentes
 *   dans ALIAS_DICTIONARY (lib/knowledge/terms/utils/aliases.ts) pour la
 *   résolution en mémoire.
 */

import type { TermType } from "@prisma/client";

export interface SupplementTermSeed {
  canonicalName: string;
  normalizedKey: string;
  termType: TermType;
  category: string;
  odsId: string | null;
  aliases: string[];
}

export const SUPPLEMENT_SEED_TERMS: SupplementTermSeed[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // MINÉRAUX
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Calcium",
    normalizedKey: "calcium",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Calcium",
    aliases: [
      "Ca",
      "Carbonate de calcium",
      "Citrate de calcium",
      "Gluconate de calcium",
      "Malate de calcium",
      "Calcium marin",
    ],
  },
  {
    canonicalName: "Potassium",
    normalizedKey: "potassium",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Potassium",
    aliases: [
      "Citrate de potassium",
      "Gluconate de potassium",
      "Chlorure de potassium",
      "Bicarbonate de potassium",
    ],
  },
  {
    canonicalName: "Magnésium",
    normalizedKey: "magnesium",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Magnesium",
    aliases: [
      "Magnesium",
      "Mg",
      "Oxyde de magnésium",
      "Citrate de magnésium",
      "Bisglycinate de magnésium",
      "Chlorure de magnésium",
      "Malate de magnésium",
      "Glycinate de magnésium",
      "Thréonate de magnésium",
    ],
  },
  {
    canonicalName: "Zinc",
    normalizedKey: "zinc",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Zinc",
    aliases: [
      "Zn",
      "Sulfate de zinc",
      "Gluconate de zinc",
      "Bisglycinate de zinc",
      "Picolinate de zinc",
      "Oxyde de zinc",
    ],
  },
  {
    canonicalName: "Fer",
    normalizedKey: "fer",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Iron",
    aliases: [
      "Iron",
      "Sulfate ferreux",
      "Gluconate ferreux",
      "Bisglycinate de fer",
      "Fumarate ferreux",
    ],
  },
  {
    canonicalName: "Iode",
    normalizedKey: "iode",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Iodine",
    aliases: [
      "Iodine",
      "Iodure de potassium",
      "Iodure de sodium",
    ],
  },
  {
    canonicalName: "Sélénium",
    normalizedKey: "selenium",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Selenium",
    aliases: [
      "Selenium",
      "Se",
      "Sélénométhionine",
      "Selenomethionine",
      "Sélénite de sodium",
    ],
  },
  {
    canonicalName: "Chrome",
    normalizedKey: "chrome",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: "Chromium",
    aliases: [
      "Chromium",
      "Cr",
      "Picolinate de chrome",
      "Chlorure de chrome",
    ],
  },
  {
    canonicalName: "Silicium",
    normalizedKey: "silicium",
    termType: "NUTRIENT",
    category: "Minéraux",
    odsId: null,
    aliases: [
      "Silicon",
      "Silice",
      "Dioxyde de silicium",
      "Silicium organique",
      "Silicium végétal",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VITAMINES
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Vitamine D",
    normalizedKey: "vitamine-d",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "VitaminD",
    aliases: [
      "Vitamine D3",
      "Vitamine D2",
      "Cholécalciférol",
      "Cholecalciferol",
      "Ergocalciférol",
      "D3",
      "D2",
      "VitD",
    ],
  },
  {
    canonicalName: "Vitamine B12",
    normalizedKey: "vitamine-b12",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "VitaminB12",
    aliases: [
      "B12",
      "Cobalamine",
      "Cyanocobalamine",
      "Méthylcobalamine",
      "Methylcobalamine",
      "Adénosylcobalamine",
      "Hydroxycobalamine",
    ],
  },
  {
    canonicalName: "Vitamine B6",
    normalizedKey: "vitamine-b6",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "VitaminB6",
    aliases: [
      "Pyridoxine",
      "Pyridoxal-5-phosphate",
      "P5P",
      "B6",
      "Chlorhydrate de pyridoxine",
    ],
  },
  {
    canonicalName: "Vitamine C",
    normalizedKey: "vitamine-c",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "VitaminC",
    aliases: [
      "Acide ascorbique",
      "Ascorbate de sodium",
      "Ascorbate de calcium",
      "Ester-C",
    ],
  },
  {
    canonicalName: "Folates",
    normalizedKey: "folates",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "Folate",
    aliases: [
      "Acide folique",
      "Folate",
      "Méthylfolate",
      "5-MTHF",
      "L-méthylfolate",
      "B9",
      "Folacine",
    ],
  },
  {
    canonicalName: "Vitamine E",
    normalizedKey: "vitamine-e",
    termType: "NUTRIENT",
    category: "Vitamines",
    odsId: "VitaminE",
    aliases: [
      "Vitamin E",
      "Tocophérol",
      "Tocopherol",
      "Alpha-tocophérol",
      "d-alpha-tocophérol",
      "dl-alpha-tocophérol",
      "Tocophérols mixtes",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ACIDES GRAS
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Oméga-3",
    normalizedKey: "omega-3",
    termType: "NUTRIENT",
    category: "Acides gras",
    odsId: "Omega3FattyAcids",
    aliases: [
      "Omega 3",
      "Oméga 3",
      "Acides gras oméga-3",
      "DHA",
      "EPA",
      "ALA",
      "Huile de poisson",
      "Acide docosahexaénoïque",
      "Acide eicosapentaénoïque",
      "Acide alpha-linolénique",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SOMMEIL
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Mélatonine",
    normalizedKey: "melatonine",
    termType: "SUPPLEMENT",
    category: "Sommeil",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "Melatonin",
      "N-acétyl-5-méthoxytryptamine",
    ],
  },
  {
    canonicalName: "Griffonia",
    normalizedKey: "griffonia",
    termType: "SUPPLEMENT",
    category: "Sommeil",
    odsId: null,
    aliases: [
      "Griffonia simplicifolia",
      "5-HTP",
      "5-hydroxytryptophane",
      "L-5-HTP",
    ],
  },
  {
    canonicalName: "L-Théanine",
    normalizedKey: "l-theanine",
    termType: "SUPPLEMENT",
    category: "Sommeil",
    odsId: null,
    aliases: [
      "L-Theanine",
      "Theanine",
      "Théanine",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ADAPTOGÈNES
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Ashwagandha",
    normalizedKey: "ashwagandha",
    termType: "SUPPLEMENT",
    category: "Adaptogènes",
    odsId: "Ashwagandha",
    aliases: [
      "Withania somnifera",
      "Ginseng indien",
      "Indian ginseng",
      "Winter cherry",
      "Cerise d'hiver",
    ],
  },
  {
    canonicalName: "Ginseng",
    normalizedKey: "ginseng",
    termType: "SUPPLEMENT",
    category: "Adaptogènes",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "Panax ginseng",
      "Ginseng coréen",
      "Ginseng asiatique",
      "Asian ginseng",
      "Korean ginseng",
    ],
  },
  {
    canonicalName: "Rhodiola",
    normalizedKey: "rhodiola",
    termType: "SUPPLEMENT",
    category: "Adaptogènes",
    odsId: null,
    aliases: [
      "Rhodiola rosea",
      "Orpin rose",
      "Golden root",
      "Racine arctique",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ANTIOXYDANTS
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Curcumine",
    normalizedKey: "curcumine",
    termType: "SUPPLEMENT",
    category: "Antioxydants",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "Curcumin",
      "Curcuma",
      "Extrait de curcuma",
      "Curcuma longa",
      "Diferuloylméthane",
    ],
  },
  {
    canonicalName: "Coenzyme Q10",
    normalizedKey: "coenzyme-q10",
    termType: "SUPPLEMENT",
    category: "Antioxydants",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "CoQ10",
      "Ubiquinol",
      "Ubiquinone",
      "Q10",
      "Coenzyme Q-10",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FOIE
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Chardon-marie",
    normalizedKey: "chardon-marie",
    termType: "SUPPLEMENT",
    category: "Foie",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "Milk Thistle",
      "Silybum marianum",
      "Silymarine",
      "Silibinine",
      "Silymarin",
    ],
  },
  {
    canonicalName: "Desmodium",
    normalizedKey: "desmodium",
    termType: "SUPPLEMENT",
    category: "Foie",
    odsId: null,
    aliases: [
      "Desmodium adscendens",
      "Desmodium ascendens",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // IMMUNITÉ
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Échinacée",
    normalizedKey: "echinacea",
    termType: "SUPPLEMENT",
    category: "Immunité",
    odsId: null, // Pas de page HealthProfessional ODS (404 vérifié)
    aliases: [
      "Echinacea",
      "Echinacea purpurea",
      "Echinacea angustifolia",
      "Echinacea pallida",
      "Rudbeckia purpurea",
    ],
  },
  {
    canonicalName: "Gelée royale",
    normalizedKey: "gelee-royale",
    termType: "SUPPLEMENT",
    category: "Immunité",
    odsId: null,
    aliases: [
      "Royal jelly",
      "Gelée royale fraîche",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // INTESTIN
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Probiotiques",
    normalizedKey: "probiotiques",
    termType: "SUPPLEMENT",
    category: "Intestin",
    odsId: "Probiotics",
    aliases: [
      "Probiotics",
      "Lactobacillus",
      "Bifidobacterium",
      "Flore intestinale",
      "Flore lactique",
    ],
  },
  {
    canonicalName: "L-Glutamine",
    normalizedKey: "l-glutamine",
    termType: "SUPPLEMENT",
    category: "Intestin",
    odsId: null,
    aliases: [
      "Glutamine",
      "Glutamine libre",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ANTIOXYDANTS (suite)
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Précurseur du glutathion (GSH) — principal antioxydant endogène.
    // Usage naturo : stress oxydatif, hépatoprotection, sécrétions bronchiques.
    // Note : statut hybride médicament/complément selon les pays (Mucomyst en France).
    // Tags fonctionnels : antioxydant, foie, respiratoire, détox.
    canonicalName: "N-Acétylcystéine",
    normalizedKey: "n-acetylcysteine",
    termType: "SUPPLEMENT",
    category: "Antioxydants",
    odsId: null,
    aliases: [
      "NAC",
      "N-Acetylcysteine",
      "N-acetyl-cysteine",
      "Acétylcystéine",
      "N-Acétyl-L-Cystéine",
      "N-acetyl L-cysteine",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLANTES — interactions médicament critiques (seeds V1)
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Ginkgo biloba",
    normalizedKey: "ginkgo-biloba",
    termType: "SUPPLEMENT",
    category: "Plantes",
    odsId: "Ginkgo",
    aliases: [
      "Ginkgo",
      "Ginkgo biloba",
      "Extrait de ginkgo",
      "Ginkgo biloba EGb761",
    ],
  },
  {
    canonicalName: "Millepertuis",
    normalizedKey: "millepertuis",
    termType: "SUPPLEMENT",
    category: "Plantes",
    odsId: "StJohnsWort",
    aliases: [
      "Hypericum",
      "Hypericum perforatum",
      "St. John's Wort",
      "St John's Wort",
    ],
  },
  {
    canonicalName: "Ail",
    normalizedKey: "ail",
    termType: "SUPPLEMENT",
    category: "Plantes",
    odsId: "Garlic",
    aliases: [
      "Garlic",
      "Allicine",
      "Ail des ours",
      "Allium sativum",
      "Extrait d'ail",
      "Ail noir",
    ],
  },
  {
    canonicalName: "Astragale",
    normalizedKey: "astragale",
    termType: "SUPPLEMENT",
    category: "Plantes",
    odsId: null, // Pas de page HealthProfessional ODS dédiée (non vérifié)
    aliases: [
      "Astragalus",
      "Astragalus membranaceus",
      "Astragale membraneux",
      "Huang Qi",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ACIDES AMINÉS — interactions médicament critiques (seeds V1)
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "L-Tryptophane",
    normalizedKey: "l-tryptophane",
    termType: "SUPPLEMENT",
    category: "Acides aminés",
    odsId: null, // Pas de page HealthProfessional ODS dédiée
    aliases: [
      "Tryptophane",
      "Tryptophan",
      "L-Tryptophan",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ENZYMES — interactions médicament critiques (seeds V1)
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Nattokinase",
    normalizedKey: "nattokinase",
    termType: "SUPPLEMENT",
    category: "Enzymes",
    odsId: null, // Pas de page HealthProfessional ODS dédiée
    aliases: [
      "Natto-kinase",
      "Extrait de natto",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PEAU & ARTICULATIONS
  // ──────────────────────────────────────────────────────────────────────────
  {
    canonicalName: "Collagène",
    normalizedKey: "collagene",
    termType: "SUPPLEMENT",
    category: "Peau & articulations",
    odsId: null,
    aliases: [
      "Collagen",
      "Collagène marin",
      "Collagène bovin",
      "Hydrolysat de collagène",
      "Peptides de collagène",
    ],
  },
  {
    canonicalName: "Acide hyaluronique",
    normalizedKey: "acide-hyaluronique",
    termType: "SUPPLEMENT",
    category: "Peau & articulations",
    odsId: null,
    aliases: [
      "Hyaluronic acid",
      "Hyaluronate de sodium",
      "HA",
    ],
  },
];
