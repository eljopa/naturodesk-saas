/**
 * Dictionnaire d'alias et termes initiaux (seed).
 *
 * ALIAS_DICTIONARY :
 * Mappe les clés normalisées d'alias connus vers leur terme canonique.
 * Utilisé par resolveAlias() pour résoudre un nom brut en terme canonique.
 *
 * Règle : les clés du dictionnaire sont des normalizedKey (buildNormalizedKey()).
 * Cela rend la lookup insensible à la casse et aux accents.
 *
 * Exemples couverts :
 * - Noms commerciaux → DCI          (glucophage → Metformine)
 * - Abréviations → noms complets    (b12 → Vitamine B12)
 * - Synonymes chimiques             (cyanocobalamine → Vitamine B12)
 * - Autres noms de marque           (mopral → Oméprazole, levothyrox → Lévothyroxine)
 *
 * SEED_TERMS :
 * Termes à créer en base lors du premier import, indépendamment des faits extraits.
 * Garantit que le dictionnaire de base existe même avant l'import BDPM réel.
 */

import type { TermType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Alias dictionary
// ---------------------------------------------------------------------------

export interface AliasEntry {
  /** Nom canonique cible (ex: "Metformine"). */
  canonicalName: string;
  termType: TermType;
}

/**
 * Dictionnaire d'alias.
 * Clés = buildNormalizedKey(alias).
 * Valeurs = { canonicalName, termType } du terme cible.
 */
export const ALIAS_DICTIONARY: Record<string, AliasEntry> = {
  // ──────────────────────────────────────────────────────────────────────────
  // Médicaments — noms commerciaux → DCI
  // ──────────────────────────────────────────────────────────────────────────
  glucophage: { canonicalName: "Metformine", termType: "DRUG" },
  mopral: { canonicalName: "Oméprazole", termType: "DRUG" },
  inexium: { canonicalName: "Ésoméprazole", termType: "DRUG" },
  levothyrox: { canonicalName: "Lévothyroxine", termType: "DRUG" },
  euthyrox: { canonicalName: "Lévothyroxine", termType: "DRUG" },
  "l-thyroxine": { canonicalName: "Lévothyroxine", termType: "DRUG" },
  doliprane: { canonicalName: "Paracétamol", termType: "DRUG" },
  efferalgan: { canonicalName: "Paracétamol", termType: "DRUG" },

  // IPP — différentes formes
  "inhibiteurs-de-la-pompe-a-protons": { canonicalName: "IPP", termType: "DRUG" },
  "inhibiteurs-pompe-protons": { canonicalName: "IPP", termType: "DRUG" },
  "anti-acides": { canonicalName: "IPP", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Anticoagulants — AVK + AOD (marques → DCI)
  // ──────────────────────────────────────────────────────────────────────────
  warfarin: { canonicalName: "Warfarine", termType: "DRUG" },
  warfarine: { canonicalName: "Warfarine", termType: "DRUG" },
  coumadine: { canonicalName: "Warfarine", termType: "DRUG" },
  coumadin: { canonicalName: "Warfarine", termType: "DRUG" },
  acenocoumarol: { canonicalName: "Acénocoumarol", termType: "DRUG" },
  "acenocoumarol-acenocoumarol": { canonicalName: "Acénocoumarol", termType: "DRUG" },
  sintrom: { canonicalName: "Acénocoumarol", termType: "DRUG" },
  minisintrom: { canonicalName: "Acénocoumarol", termType: "DRUG" },
  previscan: { canonicalName: "Fluindione", termType: "DRUG" },
  apixaban: { canonicalName: "Apixaban", termType: "DRUG" },
  eliquis: { canonicalName: "Apixaban", termType: "DRUG" },
  rivaroxaban: { canonicalName: "Rivaroxaban", termType: "DRUG" },
  xarelto: { canonicalName: "Rivaroxaban", termType: "DRUG" },
  dabigatran: { canonicalName: "Dabigatran", termType: "DRUG" },
  pradaxa: { canonicalName: "Dabigatran", termType: "DRUG" },
  edoxaban: { canonicalName: "Édoxaban", termType: "DRUG" },
  edoxabane: { canonicalName: "Édoxaban", termType: "DRUG" },
  lixiana: { canonicalName: "Édoxaban", termType: "DRUG" },
  heparine: { canonicalName: "Héparine", termType: "DRUG" },
  heparin: { canonicalName: "Héparine", termType: "DRUG" },
  enoxaparine: { canonicalName: "Énoxaparine", termType: "DRUG" },
  enoxaparin: { canonicalName: "Énoxaparine", termType: "DRUG" },
  lovenox: { canonicalName: "Énoxaparine", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Antiagrégants plaquettaires
  // ──────────────────────────────────────────────────────────────────────────
  aspirine: { canonicalName: "Aspirine", termType: "DRUG" },
  aspirin: { canonicalName: "Aspirine", termType: "DRUG" },
  "acide-acetylsalicylique": { canonicalName: "Aspirine", termType: "DRUG" },
  "aspegic": { canonicalName: "Aspirine", termType: "DRUG" },
  kardegic: { canonicalName: "Aspirine", termType: "DRUG" },
  aspro: { canonicalName: "Aspirine", termType: "DRUG" },
  clopidogrel: { canonicalName: "Clopidogrel", termType: "DRUG" },
  plavix: { canonicalName: "Clopidogrel", termType: "DRUG" },
  ticagrelor: { canonicalName: "Ticagrélor", termType: "DRUG" },
  brillique: { canonicalName: "Ticagrélor", termType: "DRUG" },
  brilique: { canonicalName: "Ticagrélor", termType: "DRUG" },
  prasugrel: { canonicalName: "Prasugrel", termType: "DRUG" },
  efient: { canonicalName: "Prasugrel", termType: "DRUG" },
  dipyridamole: { canonicalName: "Dipyridamole", termType: "DRUG" },
  persantine: { canonicalName: "Dipyridamole", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Fluoroquinolones
  // ──────────────────────────────────────────────────────────────────────────
  ciprofloxacine: { canonicalName: "Ciprofloxacine", termType: "DRUG" },
  ciprofloxacin: { canonicalName: "Ciprofloxacine", termType: "DRUG" },
  ciflox: { canonicalName: "Ciprofloxacine", termType: "DRUG" },
  ciproxine: { canonicalName: "Ciprofloxacine", termType: "DRUG" },
  levofloxacine: { canonicalName: "Lévofloxacine", termType: "DRUG" },
  levofloxacin: { canonicalName: "Lévofloxacine", termType: "DRUG" },
  tavanic: { canonicalName: "Lévofloxacine", termType: "DRUG" },
  ofloxacine: { canonicalName: "Ofloxacine", termType: "DRUG" },
  ofloxacin: { canonicalName: "Ofloxacine", termType: "DRUG" },
  oflocet: { canonicalName: "Ofloxacine", termType: "DRUG" },
  moxifloxacine: { canonicalName: "Moxifloxacine", termType: "DRUG" },
  moxifloxacin: { canonicalName: "Moxifloxacine", termType: "DRUG" },
  izilox: { canonicalName: "Moxifloxacine", termType: "DRUG" },
  norfloxacine: { canonicalName: "Norfloxacine", termType: "DRUG" },
  norfloxacin: { canonicalName: "Norfloxacine", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Tétracyclines
  // ──────────────────────────────────────────────────────────────────────────
  doxycycline: { canonicalName: "Doxycycline", termType: "DRUG" },
  vibramycine: { canonicalName: "Doxycycline", termType: "DRUG" },
  tolexine: { canonicalName: "Doxycycline", termType: "DRUG" },
  minocycline: { canonicalName: "Minocycline", termType: "DRUG" },
  mynocine: { canonicalName: "Minocycline", termType: "DRUG" },
  tetracycline: { canonicalName: "Tétracycline", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Antibiotiques généraux
  // ──────────────────────────────────────────────────────────────────────────
  amoxicilline: { canonicalName: "Amoxicilline", termType: "DRUG" },
  amoxicillin: { canonicalName: "Amoxicilline", termType: "DRUG" },
  clamoxyl: { canonicalName: "Amoxicilline", termType: "DRUG" },
  amoxil: { canonicalName: "Amoxicilline", termType: "DRUG" },
  amoxiclav: { canonicalName: "Amoxicilline/Clavulanate", termType: "DRUG" },
  augmentin: { canonicalName: "Amoxicilline/Clavulanate", termType: "DRUG" },
  metronidazole: { canonicalName: "Métronidazole", termType: "DRUG" },
  flagyl: { canonicalName: "Métronidazole", termType: "DRUG" },
  azithromycine: { canonicalName: "Azithromycine", termType: "DRUG" },
  azithromycin: { canonicalName: "Azithromycine", termType: "DRUG" },
  zithromax: { canonicalName: "Azithromycine", termType: "DRUG" },
  clarithromycine: { canonicalName: "Clarithromycine", termType: "DRUG" },
  clarithromycin: { canonicalName: "Clarithromycine", termType: "DRUG" },
  zeclar: { canonicalName: "Clarithromycine", termType: "DRUG" },
  cotrimoxazole: { canonicalName: "Triméthoprime/Sulfaméthoxazole", termType: "DRUG" },
  bactrim: { canonicalName: "Triméthoprime/Sulfaméthoxazole", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // IEC (Inhibiteurs de l'enzyme de conversion)
  // ──────────────────────────────────────────────────────────────────────────
  ramipril: { canonicalName: "Ramipril", termType: "DRUG" },
  triatec: { canonicalName: "Ramipril", termType: "DRUG" },
  enalapril: { canonicalName: "Énalapril", termType: "DRUG" },
  renitec: { canonicalName: "Énalapril", termType: "DRUG" },
  lisinopril: { canonicalName: "Lisinopril", termType: "DRUG" },
  zestril: { canonicalName: "Lisinopril", termType: "DRUG" },
  perindopril: { canonicalName: "Périndopril", termType: "DRUG" },
  coversyl: { canonicalName: "Périndopril", termType: "DRUG" },
  captopril: { canonicalName: "Captopril", termType: "DRUG" },
  lopril: { canonicalName: "Captopril", termType: "DRUG" },
  benazepril: { canonicalName: "Bénaprile", termType: "DRUG" },
  quinapril: { canonicalName: "Quinapril", termType: "DRUG" },
  acuitel: { canonicalName: "Quinapril", termType: "DRUG" },
  fosinopril: { canonicalName: "Fosinopril", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Sartans (ARA II)
  // ──────────────────────────────────────────────────────────────────────────
  losartan: { canonicalName: "Losartan", termType: "DRUG" },
  cozaar: { canonicalName: "Losartan", termType: "DRUG" },
  valsartan: { canonicalName: "Valsartan", termType: "DRUG" },
  nisis: { canonicalName: "Valsartan", termType: "DRUG" },
  tareg: { canonicalName: "Valsartan", termType: "DRUG" },
  irbesartan: { canonicalName: "Irbésartan", termType: "DRUG" },
  approvel: { canonicalName: "Irbésartan", termType: "DRUG" },
  candesartan: { canonicalName: "Candésartan", termType: "DRUG" },
  atacand: { canonicalName: "Candésartan", termType: "DRUG" },
  olmesartan: { canonicalName: "Olmésartan", termType: "DRUG" },
  olmetec: { canonicalName: "Olmésartan", termType: "DRUG" },
  telmisartan: { canonicalName: "Telmisartan", termType: "DRUG" },
  micardis: { canonicalName: "Telmisartan", termType: "DRUG" },
  eprosartan: { canonicalName: "Éprosartan", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // ISRS
  // ──────────────────────────────────────────────────────────────────────────
  fluoxetine: { canonicalName: "Fluoxétine", termType: "DRUG" },
  prozac: { canonicalName: "Fluoxétine", termType: "DRUG" },
  sertraline: { canonicalName: "Sertraline", termType: "DRUG" },
  zoloft: { canonicalName: "Sertraline", termType: "DRUG" },
  escitalopram: { canonicalName: "Escitalopram", termType: "DRUG" },
  seroplex: { canonicalName: "Escitalopram", termType: "DRUG" },
  lexapro: { canonicalName: "Escitalopram", termType: "DRUG" },
  paroxetine: { canonicalName: "Paroxétine", termType: "DRUG" },
  deroxat: { canonicalName: "Paroxétine", termType: "DRUG" },
  paxil: { canonicalName: "Paroxétine", termType: "DRUG" },
  citalopram: { canonicalName: "Citalopram", termType: "DRUG" },
  seropram: { canonicalName: "Citalopram", termType: "DRUG" },
  celexa: { canonicalName: "Citalopram", termType: "DRUG" },
  fluvoxamine: { canonicalName: "Fluvoxamine", termType: "DRUG" },
  floxyfral: { canonicalName: "Fluvoxamine", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // IRSN
  // ──────────────────────────────────────────────────────────────────────────
  venlafaxine: { canonicalName: "Venlafaxine", termType: "DRUG" },
  effexor: { canonicalName: "Venlafaxine", termType: "DRUG" },
  duloxetine: { canonicalName: "Duloxétine", termType: "DRUG" },
  cymbalta: { canonicalName: "Duloxétine", termType: "DRUG" },
  milnacipran: { canonicalName: "Milnacipran", termType: "DRUG" },
  ixel: { canonicalName: "Milnacipran", termType: "DRUG" },
  desvenlafaxine: { canonicalName: "Désvenlafaxine", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Immunosuppresseurs
  // ──────────────────────────────────────────────────────────────────────────
  ciclosporine: { canonicalName: "Ciclosporine", termType: "DRUG" },
  cyclosporine: { canonicalName: "Ciclosporine", termType: "DRUG" },
  sandimmun: { canonicalName: "Ciclosporine", termType: "DRUG" },
  neoral: { canonicalName: "Ciclosporine", termType: "DRUG" },
  tacrolimus: { canonicalName: "Tacrolimus", termType: "DRUG" },
  prograf: { canonicalName: "Tacrolimus", termType: "DRUG" },
  advagraf: { canonicalName: "Tacrolimus", termType: "DRUG" },
  azathioprine: { canonicalName: "Azathioprine", termType: "DRUG" },
  imurel: { canonicalName: "Azathioprine", termType: "DRUG" },
  methotrexate: { canonicalName: "Méthotrexate", termType: "DRUG" },
  novatrex: { canonicalName: "Méthotrexate", termType: "DRUG" },
  imeth: { canonicalName: "Méthotrexate", termType: "DRUG" },
  mycophenolate: { canonicalName: "Mycophénolate", termType: "DRUG" },
  cellcept: { canonicalName: "Mycophénolate", termType: "DRUG" },
  myfortic: { canonicalName: "Mycophénolate", termType: "DRUG" },
  sirolimus: { canonicalName: "Sirolimus", termType: "DRUG" },
  rapamune: { canonicalName: "Sirolimus", termType: "DRUG" },
  everolimus: { canonicalName: "Évérolimus", termType: "DRUG" },
  certican: { canonicalName: "Évérolimus", termType: "DRUG" },

  // ──────────────────────────────────────────────────────────────────────────
  // Minéraux
  // ──────────────────────────────────────────────────────────────────────────
  mg: { canonicalName: "Magnésium", termType: "NUTRIENT" },
  magnesium: { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "oxyde-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "citrate-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "bisglycinate-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "magnesium-bisglycinate": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "magnesium-citrate": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "magnesium-malate": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "magnesium-glycerophosphate": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "chlorure-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "malate-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "glycinate-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "threonate-de-magnesium": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  // Formes composées françaises courantes (naturopathie)
  "magnesium-marin": { canonicalName: "Magnésium", termType: "NUTRIENT" },
  "magnesium-marin-300mg": { canonicalName: "Magnésium", termType: "NUTRIENT" },

  zn: { canonicalName: "Zinc", termType: "NUTRIENT" },
  "sulfate-de-zinc": { canonicalName: "Zinc", termType: "NUTRIENT" },
  "gluconate-de-zinc": { canonicalName: "Zinc", termType: "NUTRIENT" },
  "bisglycinate-de-zinc": { canonicalName: "Zinc", termType: "NUTRIENT" },
  "picolinate-de-zinc": { canonicalName: "Zinc", termType: "NUTRIENT" },
  "oxyde-de-zinc": { canonicalName: "Zinc", termType: "NUTRIENT" },

  iron: { canonicalName: "Fer", termType: "NUTRIENT" },
  "sulfate-ferreux": { canonicalName: "Fer", termType: "NUTRIENT" },
  "fer-ferreux": { canonicalName: "Fer", termType: "NUTRIENT" },
  "gluconate-ferreux": { canonicalName: "Fer", termType: "NUTRIENT" },
  "bisglycinate-de-fer": { canonicalName: "Fer", termType: "NUTRIENT" },
  "fumarate-ferreux": { canonicalName: "Fer", termType: "NUTRIENT" },

  iodine: { canonicalName: "Iode", termType: "NUTRIENT" },
  "iodure-de-potassium": { canonicalName: "Iode", termType: "NUTRIENT" },
  "iodure-de-sodium": { canonicalName: "Iode", termType: "NUTRIENT" },

  selenium: { canonicalName: "Sélénium", termType: "NUTRIENT" },
  // "se" retiré — collision avec préposition française "se" → faux positifs certains
  selenomethionine: { canonicalName: "Sélénium", termType: "NUTRIENT" },
  "selenite-de-sodium": { canonicalName: "Sélénium", termType: "NUTRIENT" },

  chromium: { canonicalName: "Chrome", termType: "NUTRIENT" },
  // "cr" retiré — collision avec "créatinine" (Cr) dans les bilans biologiques → faux positifs certains
  "picolinate-de-chrome": { canonicalName: "Chrome", termType: "NUTRIENT" },

  silicon: { canonicalName: "Silicium", termType: "NUTRIENT" },
  silice: { canonicalName: "Silicium", termType: "NUTRIENT" },
  "dioxyde-de-silicium": { canonicalName: "Silicium", termType: "NUTRIENT" },
  "silicium-organique": { canonicalName: "Silicium", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Vitamines
  // ──────────────────────────────────────────────────────────────────────────
  "vit-d": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vit-d3": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vit-d2": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vitamine-d3": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vitamine-d2": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vitamin-d": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  "vitamin-d3": { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  cholecalciferol: { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  ergocalciferol: { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  d3: { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  d2: { canonicalName: "Vitamine D", termType: "NUTRIENT" },
  vitd: { canonicalName: "Vitamine D", termType: "NUTRIENT" },

  b12: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  "vit-b12": { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  cyanocobalamine: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  cobalamine: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  methylcobalamine: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  adenosylcobalamine: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },
  hydroxycobalamine: { canonicalName: "Vitamine B12", termType: "NUTRIENT" },

  b6: { canonicalName: "Vitamine B6", termType: "NUTRIENT" },
  "vit-b6": { canonicalName: "Vitamine B6", termType: "NUTRIENT" },
  pyridoxine: { canonicalName: "Vitamine B6", termType: "NUTRIENT" },
  "pyridoxal-5-phosphate": { canonicalName: "Vitamine B6", termType: "NUTRIENT" },
  p5p: { canonicalName: "Vitamine B6", termType: "NUTRIENT" },

  "acide-ascorbique": { canonicalName: "Vitamine C", termType: "NUTRIENT" },
  "ascorbate-de-sodium": { canonicalName: "Vitamine C", termType: "NUTRIENT" },
  "ascorbate-de-calcium": { canonicalName: "Vitamine C", termType: "NUTRIENT" },

  // NOTE : "acide-folique" et "folacine" pointaient vers "Folate" (singulier).
  // Corrigé : terme canonique = "Folates" (pluriel, conforme au seed V1).
  "acide-folique": { canonicalName: "Folates", termType: "NUTRIENT" },
  folacine: { canonicalName: "Folates", termType: "NUTRIENT" },
  folate: { canonicalName: "Folates", termType: "NUTRIENT" },
  methylfolate: { canonicalName: "Folates", termType: "NUTRIENT" },
  "5-mthf": { canonicalName: "Folates", termType: "NUTRIENT" },
  "l-methylfolate": { canonicalName: "Folates", termType: "NUTRIENT" },
  b9: { canonicalName: "Folates", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Acides gras
  // ──────────────────────────────────────────────────────────────────────────
  // NOTE : "omega-3", "dha", "epa" pointaient vers "Oméga 3" (SUPPLEMENT).
  // Corrigé : canonicalName = "Oméga-3" (tiret, conforme au seed V1), termType = NUTRIENT.
  "omega-3": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "acides-gras-omega-3": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "omega-3-epa-dha": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "omega-3-epadha": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "omega-3-epa": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "omega-3-dha": { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  dha: { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  epa: { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  ala: { canonicalName: "Oméga-3", termType: "NUTRIENT" },
  "huile-de-poisson": { canonicalName: "Oméga-3", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Sommeil
  // ──────────────────────────────────────────────────────────────────────────
  melatonin: { canonicalName: "Mélatonine", termType: "SUPPLEMENT" },

  "griffonia-simplicifolia": { canonicalName: "Griffonia", termType: "SUPPLEMENT" },
  "5-htp": { canonicalName: "Griffonia", termType: "SUPPLEMENT" },
  "5-hydroxytryptophane": { canonicalName: "Griffonia", termType: "SUPPLEMENT" },
  "l-5-htp": { canonicalName: "Griffonia", termType: "SUPPLEMENT" },

  theanine: { canonicalName: "L-Théanine", termType: "SUPPLEMENT" },
  "l-theanine": { canonicalName: "L-Théanine", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Adaptogènes
  // ──────────────────────────────────────────────────────────────────────────
  "withania-somnifera": { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },
  "ginseng-indien": { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },
  "winter-cherry": { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },
  // Fautes de frappe courantes
  ashwaganda: { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },
  "ashwaganda-ksm-66": { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },
  "ashwagandha-ksm-66": { canonicalName: "Ashwagandha", termType: "SUPPLEMENT" },

  "panax-ginseng": { canonicalName: "Ginseng", termType: "SUPPLEMENT" },
  "ginseng-coreen": { canonicalName: "Ginseng", termType: "SUPPLEMENT" },
  "ginseng-asiatique": { canonicalName: "Ginseng", termType: "SUPPLEMENT" },
  "asian-ginseng": { canonicalName: "Ginseng", termType: "SUPPLEMENT" },
  "korean-ginseng": { canonicalName: "Ginseng", termType: "SUPPLEMENT" },

  "rhodiola-rosea": { canonicalName: "Rhodiola", termType: "SUPPLEMENT" },
  "orpin-rose": { canonicalName: "Rhodiola", termType: "SUPPLEMENT" },
  "golden-root": { canonicalName: "Rhodiola", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Antioxydants
  // ──────────────────────────────────────────────────────────────────────────
  curcumin: { canonicalName: "Curcumine", termType: "SUPPLEMENT" },
  curcuma: { canonicalName: "Curcumine", termType: "SUPPLEMENT" },
  "extrait-de-curcuma": { canonicalName: "Curcumine", termType: "SUPPLEMENT" },
  "curcuma-longa": { canonicalName: "Curcumine", termType: "SUPPLEMENT" },

  coq10: { canonicalName: "Coenzyme Q10", termType: "SUPPLEMENT" },
  ubiquinol: { canonicalName: "Coenzyme Q10", termType: "SUPPLEMENT" },
  ubiquinone: { canonicalName: "Coenzyme Q10", termType: "SUPPLEMENT" },
  q10: { canonicalName: "Coenzyme Q10", termType: "SUPPLEMENT" },

  // N-Acétylcystéine — précurseur glutathion, antioxydant, hépatoprotecteur
  nac: { canonicalName: "N-Acétylcystéine", termType: "SUPPLEMENT" },
  acetylcysteine: { canonicalName: "N-Acétylcystéine", termType: "SUPPLEMENT" },
  "n-acetyl-cysteine": { canonicalName: "N-Acétylcystéine", termType: "SUPPLEMENT" },
  "n-acetyl-l-cysteine": { canonicalName: "N-Acétylcystéine", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Foie
  // ──────────────────────────────────────────────────────────────────────────
  "milk-thistle": { canonicalName: "Chardon-marie", termType: "SUPPLEMENT" },
  "silybum-marianum": { canonicalName: "Chardon-marie", termType: "SUPPLEMENT" },
  silymarine: { canonicalName: "Chardon-marie", termType: "SUPPLEMENT" },
  silibinine: { canonicalName: "Chardon-marie", termType: "SUPPLEMENT" },

  "desmodium-adscendens": { canonicalName: "Desmodium", termType: "SUPPLEMENT" },
  "desmodium-ascendens": { canonicalName: "Desmodium", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Immunité
  // ──────────────────────────────────────────────────────────────────────────
  echinacea: { canonicalName: "Échinacée", termType: "SUPPLEMENT" },
  echinacee: { canonicalName: "Échinacée", termType: "SUPPLEMENT" },
  "echinacea-purpurea": { canonicalName: "Échinacée", termType: "SUPPLEMENT" },
  "echinacea-angustifolia": { canonicalName: "Échinacée", termType: "SUPPLEMENT" },
  "echinacea-pallida": { canonicalName: "Échinacée", termType: "SUPPLEMENT" },

  "royal-jelly": { canonicalName: "Gelée royale", termType: "SUPPLEMENT" },

  // Plantes immunosuppresseur-critiques (interactions médicament documentées)
  astragale: { canonicalName: "Astragale", termType: "SUPPLEMENT" },
  astragalus: { canonicalName: "Astragale", termType: "SUPPLEMENT" },
  "astragalus-membranaceus": { canonicalName: "Astragale", termType: "SUPPLEMENT" },
  "astragale-membraneux": { canonicalName: "Astragale", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Intestin
  // ──────────────────────────────────────────────────────────────────────────
  probiotics: { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  lactobacillus: { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  lactobacille: { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  bifidobacterium: { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  saccharomyces: { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  "flore-intestinale": { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  "flore-lactique": { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },
  "flore-bacterienne": { canonicalName: "Probiotiques", termType: "SUPPLEMENT" },

  glutamine: { canonicalName: "L-Glutamine", termType: "SUPPLEMENT" },
  "glutamine-poudre": { canonicalName: "L-Glutamine", termType: "SUPPLEMENT" },
  "l-glutamine-poudre": { canonicalName: "L-Glutamine", termType: "SUPPLEMENT" },

  // Acides aminés sérotoninergiques (interactions ISRS documentées)
  tryptophane: { canonicalName: "L-Tryptophane", termType: "SUPPLEMENT" },
  "l-tryptophane": { canonicalName: "L-Tryptophane", termType: "SUPPLEMENT" },
  tryptophan: { canonicalName: "L-Tryptophane", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Peau & articulations
  // ──────────────────────────────────────────────────────────────────────────
  collagen: { canonicalName: "Collagène", termType: "SUPPLEMENT" },
  "collagene-marin": { canonicalName: "Collagène", termType: "SUPPLEMENT" },
  "collagene-bovin": { canonicalName: "Collagène", termType: "SUPPLEMENT" },
  "hydrolysat-de-collagene": { canonicalName: "Collagène", termType: "SUPPLEMENT" },
  "peptides-de-collagene": { canonicalName: "Collagène", termType: "SUPPLEMENT" },

  "hyaluronic-acid": { canonicalName: "Acide hyaluronique", termType: "SUPPLEMENT" },
  "hyaluronate-de-sodium": { canonicalName: "Acide hyaluronique", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Calcium
  // ──────────────────────────────────────────────────────────────────────────
  calcium: { canonicalName: "Calcium", termType: "NUTRIENT" },
  ca: { canonicalName: "Calcium", termType: "NUTRIENT" },
  "carbonate-de-calcium": { canonicalName: "Calcium", termType: "NUTRIENT" },
  "citrate-de-calcium": { canonicalName: "Calcium", termType: "NUTRIENT" },
  "gluconate-de-calcium": { canonicalName: "Calcium", termType: "NUTRIENT" },
  "malate-de-calcium": { canonicalName: "Calcium", termType: "NUTRIENT" },
  "calcium-marin": { canonicalName: "Calcium", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Potassium
  // ──────────────────────────────────────────────────────────────────────────
  potassium: { canonicalName: "Potassium", termType: "NUTRIENT" },
  "citrate-de-potassium": { canonicalName: "Potassium", termType: "NUTRIENT" },
  "gluconate-de-potassium": { canonicalName: "Potassium", termType: "NUTRIENT" },
  "chlorure-de-potassium": { canonicalName: "Potassium", termType: "NUTRIENT" },
  "bicarbonate-de-potassium": { canonicalName: "Potassium", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Vitamine E
  // ──────────────────────────────────────────────────────────────────────────
  "vitamine-e": { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  "vitamin-e": { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  tocopherol: { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  "alpha-tocopherol": { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  "d-alpha-tocopherol": { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  "dl-alpha-tocopherol": { canonicalName: "Vitamine E", termType: "NUTRIENT" },
  "tocopherol-mixte": { canonicalName: "Vitamine E", termType: "NUTRIENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Ginkgo biloba
  // ──────────────────────────────────────────────────────────────────────────
  ginkgo: { canonicalName: "Ginkgo biloba", termType: "SUPPLEMENT" },
  "ginkgo-biloba": { canonicalName: "Ginkgo biloba", termType: "SUPPLEMENT" },
  "extrait-de-ginkgo": { canonicalName: "Ginkgo biloba", termType: "SUPPLEMENT" },
  "ginkgo-biloba-egb761": { canonicalName: "Ginkgo biloba", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Nattokinase
  // ──────────────────────────────────────────────────────────────────────────
  nattokinase: { canonicalName: "Nattokinase", termType: "SUPPLEMENT" },
  "natto-kinase": { canonicalName: "Nattokinase", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Ail
  // ──────────────────────────────────────────────────────────────────────────
  ail: { canonicalName: "Ail", termType: "SUPPLEMENT" },
  allicine: { canonicalName: "Ail", termType: "SUPPLEMENT" },
  "ail-des-ours": { canonicalName: "Ail", termType: "SUPPLEMENT" },
  garlic: { canonicalName: "Ail", termType: "SUPPLEMENT" },
  "extrait-d-ail": { canonicalName: "Ail", termType: "SUPPLEMENT" },
  "ail-noir": { canonicalName: "Ail", termType: "SUPPLEMENT" },
  "allium-sativum": { canonicalName: "Ail", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Millepertuis (interactions médicament critiques : ISRS, immunosuppresseurs)
  // ──────────────────────────────────────────────────────────────────────────
  millepertuis: { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },
  hypericum: { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },
  "hypericum-perforatum": { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },
  "st-johns-wort": { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },
  "saint-johns-wort": { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },
  "millepertuis-perfore": { canonicalName: "Millepertuis", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Antioxydants (suite)
  // ──────────────────────────────────────────────────────────────────────────
  curcuminoide: { canonicalName: "Curcumine", termType: "SUPPLEMENT" },
  "curcuminoides": { canonicalName: "Curcumine", termType: "SUPPLEMENT" },

  // ──────────────────────────────────────────────────────────────────────────
  // Soja / isoflavones (hors top 29 mais présent en base via SEED_TERMS)
  // ──────────────────────────────────────────────────────────────────────────
  "isoflavones-de-soja": { canonicalName: "Soja", termType: "SUPPLEMENT" },
  isoflavones: { canonicalName: "Soja", termType: "SUPPLEMENT" },
};

/**
 * Résout un nom normalisé via le dictionnaire d'alias.
 * Retourne null si aucun alias n'est trouvé (le nom est déjà canonical).
 */
export function resolveAlias(normalizedKey: string): AliasEntry | null {
  return ALIAS_DICTIONARY[normalizedKey] ?? null;
}

// ---------------------------------------------------------------------------
// Seed terms
// ---------------------------------------------------------------------------

export interface SeedTerm {
  canonicalName: string;
  termType: TermType;
  drugKey?: string;
  aliases: string[];
}

/**
 * Termes initiaux à créer lors du premier import.
 * Couvrent les 3 médicaments mock + leurs objets de faits.
 */
export const SEED_TERMS: SeedTerm[] = [
  // Médicaments mock
  {
    canonicalName: "Metformine",
    termType: "DRUG",
    drugKey: "metformine",
    aliases: ["Glucophage"],
  },
  {
    canonicalName: "Oméprazole",
    termType: "DRUG",
    drugKey: "omeprazole",
    aliases: ["Mopral"],
  },
  {
    canonicalName: "Lévothyroxine",
    termType: "DRUG",
    drugKey: "levothyroxine",
    aliases: ["Levothyrox", "Euthyrox"],
  },
  {
    canonicalName: "IPP",
    termType: "DRUG",
    drugKey: undefined,
    aliases: ["Inhibiteurs de la pompe à protons"],
  },
  {
    canonicalName: "Cholestyramine",
    termType: "DRUG",
    drugKey: undefined,
    aliases: [],
  },
  {
    canonicalName: "Rifampicine",
    termType: "DRUG",
    drugKey: undefined,
    aliases: [],
  },
  // Nutriments
  {
    canonicalName: "Vitamine B12",
    termType: "NUTRIENT",
    drugKey: undefined,
    aliases: ["B12", "Cyanocobalamine", "Cobalamine"],
  },
  {
    canonicalName: "Magnésium",
    termType: "NUTRIENT",
    drugKey: undefined,
    aliases: ["Magnesium", "Mg"],
  },
  {
    canonicalName: "Calcium",
    termType: "NUTRIENT",
    drugKey: undefined,
    aliases: ["Ca", "Carbonate de calcium"],
  },
  {
    canonicalName: "Fer",
    termType: "NUTRIENT",
    drugKey: undefined,
    aliases: ["Sulfate ferreux"],
  },
  // Suppléments
  {
    canonicalName: "Soja",
    termType: "SUPPLEMENT",
    drugKey: undefined,
    aliases: ["Isoflavones de soja"],
  },
];
