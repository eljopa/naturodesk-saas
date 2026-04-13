/**
 * Seeds des termes médicamenteux (KnowledgeTerm de type DRUG).
 *
 * Couvre les classes médicamenteuses critiques pour les interactions
 * médicament ↔ supplément (seeds V1).
 *
 * Chaque terme est identifié par :
 *   - normalizedKey : clé slug unique (buildNormalizedKey du canonicalName)
 *   - canonicalName : DCI française de référence
 *   - category      : classe pharmacologique
 *   - aliases[]     : noms commerciaux + DCI anglaise connus
 *
 * Script d'import : scripts/seed-drug-terms.ts
 */

export interface DrugTermSeed {
  canonicalName: string;
  normalizedKey: string;
  category:      string;
  aliases:       string[];
}

export const DRUG_TERM_SEEDS: DrugTermSeed[] = [

  // ── Anticoagulants AVK ───────────────────────────────────────────────────

  {
    canonicalName: "Warfarine",
    normalizedKey: "warfarine",
    category:      "anticoagulant",
    aliases:       ["Warfarin", "Coumadine", "Coumadin"],
  },
  {
    canonicalName: "Acénocoumarol",
    normalizedKey: "acenocoumarol",
    category:      "anticoagulant",
    aliases:       ["Acenocoumarin", "Sintrom", "Minisintrom"],
  },

  // ── Anticoagulants AOD ───────────────────────────────────────────────────

  {
    canonicalName: "Apixaban",
    normalizedKey: "apixaban",
    category:      "anticoagulant",
    aliases:       ["Eliquis"],
  },
  {
    canonicalName: "Rivaroxaban",
    normalizedKey: "rivaroxaban",
    category:      "anticoagulant",
    aliases:       ["Xarelto"],
  },
  {
    canonicalName: "Dabigatran",
    normalizedKey: "dabigatran",
    category:      "anticoagulant",
    aliases:       ["Pradaxa"],
  },
  {
    canonicalName: "Édoxaban",
    normalizedKey: "edoxaban",
    category:      "anticoagulant",
    aliases:       ["Edoxabane", "Lixiana"],
  },

  // ── Antiagrégants plaquettaires ──────────────────────────────────────────

  {
    canonicalName: "Aspirine",
    normalizedKey: "aspirine",
    category:      "antiaggregant",
    aliases:       ["Aspirin", "Acide acétylsalicylique", "Aspégic", "Kardégic", "Aspro"],
  },
  {
    canonicalName: "Clopidogrel",
    normalizedKey: "clopidogrel",
    category:      "antiaggregant",
    aliases:       ["Plavix"],
  },
  {
    canonicalName: "Ticagrélor",
    normalizedKey: "ticagrelor",
    category:      "antiaggregant",
    aliases:       ["Ticagrelor", "Brilique"],
  },
  {
    canonicalName: "Prasugrel",
    normalizedKey: "prasugrel",
    category:      "antiaggregant",
    aliases:       ["Efient"],
  },

  // ── Fluoroquinolones ─────────────────────────────────────────────────────

  {
    canonicalName: "Ciprofloxacine",
    normalizedKey: "ciprofloxacine",
    category:      "antibiotique_quinolone",
    aliases:       ["Ciprofloxacin", "Ciflox", "Ciproxine"],
  },
  {
    canonicalName: "Lévofloxacine",
    normalizedKey: "levofloxacine",
    category:      "antibiotique_quinolone",
    aliases:       ["Levofloxacin", "Lévofloxacin", "Tavanic"],
  },
  {
    canonicalName: "Ofloxacine",
    normalizedKey: "ofloxacine",
    category:      "antibiotique_quinolone",
    aliases:       ["Ofloxacin", "Oflocet"],
  },
  {
    canonicalName: "Moxifloxacine",
    normalizedKey: "moxifloxacine",
    category:      "antibiotique_quinolone",
    aliases:       ["Moxifloxacin", "Izilox"],
  },
  {
    canonicalName: "Norfloxacine",
    normalizedKey: "norfloxacine",
    category:      "antibiotique_quinolone",
    aliases:       ["Norfloxacin"],
  },

  // ── Tétracyclines ────────────────────────────────────────────────────────

  {
    canonicalName: "Doxycycline",
    normalizedKey: "doxycycline",
    category:      "antibiotique_tetracycline",
    aliases:       ["Vibramycine", "Tolexine"],
  },
  {
    canonicalName: "Minocycline",
    normalizedKey: "minocycline",
    category:      "antibiotique_tetracycline",
    aliases:       ["Mynocine", "Mestacine"],
  },
  {
    canonicalName: "Tétracycline",
    normalizedKey: "tetracycline",
    category:      "antibiotique_tetracycline",
    aliases:       ["Tetracycline"],
  },

  // ── Antibiotiques généraux ───────────────────────────────────────────────

  {
    canonicalName: "Amoxicilline",
    normalizedKey: "amoxicilline",
    category:      "antibiotique_penicilline",
    aliases:       ["Amoxicillin", "Clamoxyl", "Amoxil"],
  },
  {
    canonicalName: "Amoxicilline/Clavulanate",
    normalizedKey: "amoxicilline-clavulanate",
    category:      "antibiotique_penicilline",
    aliases:       ["Amoxiclav", "Augmentin", "Ciblor"],
  },
  {
    canonicalName: "Métronidazole",
    normalizedKey: "metronidazole",
    category:      "antibiotique_nitroimidazole",
    aliases:       ["Metronidazol", "Flagyl"],
  },
  {
    canonicalName: "Azithromycine",
    normalizedKey: "azithromycine",
    category:      "antibiotique_macrolide",
    aliases:       ["Azithromycin", "Zithromax"],
  },
  {
    canonicalName: "Clarithromycine",
    normalizedKey: "clarithromycine",
    category:      "antibiotique_macrolide",
    aliases:       ["Clarithromycin", "Zeclar", "Naxy"],
  },
  {
    canonicalName: "Triméthoprime/Sulfaméthoxazole",
    normalizedKey: "cotrimoxazole",
    category:      "antibiotique_sulfamide",
    aliases:       ["Cotrimoxazole", "Trimethoprim", "Bactrim"],
  },

  // ── IEC (Inhibiteurs de l'enzyme de conversion) ──────────────────────────

  {
    canonicalName: "Ramipril",
    normalizedKey: "ramipril",
    category:      "iec",
    aliases:       ["Triatec"],
  },
  {
    canonicalName: "Énalapril",
    normalizedKey: "enalapril",
    category:      "iec",
    aliases:       ["Enalapril", "Renitec"],
  },
  {
    canonicalName: "Lisinopril",
    normalizedKey: "lisinopril",
    category:      "iec",
    aliases:       ["Zestril", "Prinivil"],
  },
  {
    canonicalName: "Périndopril",
    normalizedKey: "perindopril",
    category:      "iec",
    aliases:       ["Coversyl", "Acuitel"],
  },
  {
    canonicalName: "Captopril",
    normalizedKey: "captopril",
    category:      "iec",
    aliases:       ["Lopril"],
  },

  // ── Sartans (ARA II) ─────────────────────────────────────────────────────

  {
    canonicalName: "Losartan",
    normalizedKey: "losartan",
    category:      "sartan",
    aliases:       ["Cozaar"],
  },
  {
    canonicalName: "Valsartan",
    normalizedKey: "valsartan",
    category:      "sartan",
    aliases:       ["Nisis", "Tareg"],
  },
  {
    canonicalName: "Irbésartan",
    normalizedKey: "irbesartan",
    category:      "sartan",
    aliases:       ["Irbesartan", "Approvel", "Avapro"],
  },
  {
    canonicalName: "Candésartan",
    normalizedKey: "candesartan",
    category:      "sartan",
    aliases:       ["Candesartan", "Atacand"],
  },
  {
    canonicalName: "Olmésartan",
    normalizedKey: "olmesartan",
    category:      "sartan",
    aliases:       ["Olmesartan", "Olmetec"],
  },
  {
    canonicalName: "Telmisartan",
    normalizedKey: "telmisartan",
    category:      "sartan",
    aliases:       ["Micardis"],
  },

  // ── ISRS (Inhibiteurs sélectifs de la recapture de la sérotonine) ─────────

  {
    canonicalName: "Fluoxétine",
    normalizedKey: "fluoxetine",
    category:      "isrs",
    aliases:       ["Fluoxetine", "Prozac"],
  },
  {
    canonicalName: "Sertraline",
    normalizedKey: "sertraline",
    category:      "isrs",
    aliases:       ["Zoloft"],
  },
  {
    canonicalName: "Escitalopram",
    normalizedKey: "escitalopram",
    category:      "isrs",
    aliases:       ["Seroplex", "Lexapro"],
  },
  {
    canonicalName: "Paroxétine",
    normalizedKey: "paroxetine",
    category:      "isrs",
    aliases:       ["Paroxetine", "Deroxat", "Paxil"],
  },
  {
    canonicalName: "Citalopram",
    normalizedKey: "citalopram",
    category:      "isrs",
    aliases:       ["Seropram", "Celexa"],
  },
  {
    canonicalName: "Fluvoxamine",
    normalizedKey: "fluvoxamine",
    category:      "isrs",
    aliases:       ["Floxyfral"],
  },

  // ── IRSN (Inhibiteurs de la recapture de sérotonine et noradrénaline) ─────

  {
    canonicalName: "Venlafaxine",
    normalizedKey: "venlafaxine",
    category:      "irsn",
    aliases:       ["Effexor"],
  },
  {
    canonicalName: "Duloxétine",
    normalizedKey: "duloxetine",
    category:      "irsn",
    aliases:       ["Duloxetine", "Cymbalta"],
  },
  {
    canonicalName: "Milnacipran",
    normalizedKey: "milnacipran",
    category:      "irsn",
    aliases:       ["Ixel"],
  },

  // ── Immunosuppresseurs ───────────────────────────────────────────────────

  {
    canonicalName: "Ciclosporine",
    normalizedKey: "ciclosporine",
    category:      "immunosuppresseur",
    aliases:       ["Cyclosporine", "Sandimmun", "Neoral"],
  },
  {
    canonicalName: "Tacrolimus",
    normalizedKey: "tacrolimus",
    category:      "immunosuppresseur",
    aliases:       ["Prograf", "Advagraf"],
  },
  {
    canonicalName: "Azathioprine",
    normalizedKey: "azathioprine",
    category:      "immunosuppresseur",
    aliases:       ["Imurel"],
  },
  {
    canonicalName: "Méthotrexate",
    normalizedKey: "methotrexate",
    category:      "immunosuppresseur",
    aliases:       ["Methotrexate", "Novatrex", "Imeth"],
  },
  {
    canonicalName: "Mycophénolate",
    normalizedKey: "mycophenolate",
    category:      "immunosuppresseur",
    aliases:       ["Mycophenolate mofetil", "Cellcept", "Myfortic"],
  },
  {
    canonicalName: "Sirolimus",
    normalizedKey: "sirolimus",
    category:      "immunosuppresseur",
    aliases:       ["Rapamune"],
  },
  {
    canonicalName: "Évérolimus",
    normalizedKey: "everolimus",
    category:      "immunosuppresseur",
    aliases:       ["Everolimus", "Certican", "Afinitor"],
  },
];
