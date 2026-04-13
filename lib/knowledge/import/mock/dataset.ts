/**
 * Dataset mock local — 3 médicaments représentatifs.
 *
 * Ces documents simulent la structure qu'on obtiendra après parsing des fichiers BDPM réels.
 * Chaque section correspond à un sectionPath BDPM canonique (ex. : "4.8" = effets indésirables).
 *
 * Priorité choisie selon le guide sources :
 * - Metformine  → déplétion B12 + interactions produits de contraste
 * - Oméprazole  → déplétion Mg + B12, interaction clopidogrel
 * - Lévothyroxine → interactions absorption (calcium, fer, soja)
 *
 * Ces trois molécules couvrent les cas les plus utiles pour un naturopathe :
 * déplétions, vigilances, interactions suppléments/aliments.
 */

import type { SourceDocumentInput } from "../types";

export const MOCK_DATASET: SourceDocumentInput[] = [
  // ---------------------------------------------------------------------------
  // 1. Metformine — diabète de type 2, déplétion B12
  // ---------------------------------------------------------------------------
  {
    drugKey: "metformine",
    sourceType: "BDPM",
    docType: "NOTICE",
    title: "Metformine 500 mg, comprimé pelliculé — Notice BDPM",
    url: "https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=60001361",
    sections: [
      {
        sectionPath: "1",
        title: "Composition",
        text: "Substance active : Metformine chlorhydrate 500 mg par comprimé. Excipients : povidone K30, stéarate de magnésium, hypromellose, macrogol 400, dioxyde de titane (E171).",
        meta: { substanceName: "Metformine chlorhydrate", dosage: "500 mg" },
      },
      {
        sectionPath: "4.1",
        title: "Indications thérapeutiques",
        text: "Traitement du diabète de type 2, particulièrement chez les patients en surpoids, lorsque le régime alimentaire et l'exercice physique seuls ne suffisent pas à obtenir un contrôle glycémique satisfaisant. Chez l'adulte, la metformine peut être utilisée en monothérapie ou en association à d'autres antidiabétiques oraux ou à l'insuline.",
        meta: { indication: "Diabète de type 2" },
      },
      {
        sectionPath: "4.3",
        title: "Contre-indications",
        text: "Insuffisance rénale sévère : débit de filtration glomérulaire (DFG) inférieur à 30 mL/min/1,73 m². Insuffisance hépatique. Intoxication aiguë à l'alcool, alcoolisme. Acidocétose diabétique et précoma diabétique. Toute condition pouvant conduire à une déshydratation (diarrhée sévère, vomissements) ou une hypoxie tissulaire.",
        meta: { severity: "absolue" },
      },
      {
        sectionPath: "4.5",
        title: "Interactions médicamenteuses",
        text: "Produits de contraste iodés : en cas d'examens radiologiques avec injection de produits de contraste iodés, la metformine doit être arrêtée avant l'examen et ne pas être reprise avant 48 heures, après contrôle de la fonction rénale, en raison du risque d'acidose lactique. Alcool : potentialisation du risque d'acidose lactique par l'alcool. Déconseillé. Diurétiques, en particulier les diurétiques de l'anse : peuvent altérer la fonction rénale et augmenter le risque d'acidose lactique.",
        meta: { interactionTargets: "produits de contraste, alcool, diurétiques" },
      },
      {
        sectionPath: "4.8",
        title: "Effets indésirables",
        text: "Très fréquents (> 1/10) : troubles gastro-intestinaux (nausées, vomissements, diarrhée, douleurs abdominales, perte d'appétit). Surviennent surtout en début de traitement ; prise au cours des repas diminue ces effets. Fréquents (1/100 à 1/10) : troubles du goût (goût métallique). Déficit en vitamine B12 (cyanocobalamine) : réduction de l'absorption intestinale de la vitamine B12 lors des traitements prolongés — surveillance annuelle recommandée. Très rares (< 1/10 000) : acidose lactique — urgence médicale, risque fatal en cas d'accumulation.",
        meta: { depletionRisk: "vitamine B12", depletionFrequency: "fréquent" },
      },
      {
        sectionPath: "4.4",
        title: "Mises en garde et précautions d'emploi",
        text: "Surveiller régulièrement la fonction rénale (DFG) avant et pendant le traitement. Arrêter la metformine en cas de chirurgie majeure, de jeûne prolongé ou d'affection intercurrente sévère. Risque d'hypovitaminose B12 lors de traitement prolongé : dosage annuel de la vitamine B12 sérique recommandé, surtout en cas d'anémie ou de signes neuropathiques. Éducation du patient sur les symptômes d'acidose lactique (faiblesse, myalgies, difficultés respiratoires).",
        meta: { monitoringNeeded: "DFG, vitamine B12" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Oméprazole — IPP, déplétions magnésium + B12, interaction clopidogrel
  // ---------------------------------------------------------------------------
  {
    drugKey: "omeprazole",
    sourceType: "BDPM",
    docType: "NOTICE",
    title: "Oméprazole 20 mg, gélule gastro-résistante — Notice BDPM",
    url: "https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=61268470",
    sections: [
      {
        sectionPath: "1",
        title: "Composition",
        text: "Substance active : Oméprazole 20 mg par gélule. Excipients : sucre, mannitol, cellulose microcristalline, acide tartrique, sodium laurylsulfate, hypromellose, phtalate d'hypromellose, gélatine, dioxyde de titane.",
        meta: { substanceName: "Oméprazole", dosage: "20 mg" },
      },
      {
        sectionPath: "4.1",
        title: "Indications thérapeutiques",
        text: "Ulcère duodénal. Ulcère gastrique. Œsophagite par reflux gastro-œsophagien (RGO). Éradication d'Helicobacter pylori en association à des antibiotiques. Syndrome de Zollinger-Ellison. Prévention des ulcères gastroduodénaux chez les patients traités par AINS.",
        meta: { indication: "Pathologies gastro-intestinales acido-dépendantes" },
      },
      {
        sectionPath: "4.3",
        title: "Contre-indications",
        text: "Hypersensibilité à l'oméprazole, aux benzimidazoles substitués ou à l'un des excipients. Association avec la rilpivirine (réduction significative des concentrations plasmatiques de rilpivirine). Association avec le nelfinavir.",
        meta: { severity: "absolue", interactionContraindicated: "rilpivirine, nelfinavir" },
      },
      {
        sectionPath: "4.5",
        title: "Interactions médicamenteuses",
        text: "Clopidogrel : l'oméprazole réduit l'activation du clopidogrel via l'inhibition du CYP2C19, diminuant ainsi son effet antiplaquettaire. Association déconseillée. Méthotrexate : les IPP peuvent augmenter les concentrations plasmatiques du méthotrexate, risque de toxicité accrue. Kétoconazole, itraconazole, erlotinib : réduction de l'absorption par augmentation du pH gastrique. Tacrolimus : augmentation possible des concentrations de tacrolimus.",
        meta: { interactionTargets: "clopidogrel, méthotrexate, antifongiques azolés" },
      },
      {
        sectionPath: "4.8",
        title: "Effets indésirables",
        text: "Fréquents (1/100 à 1/10) : céphalées, diarrhée, nausées, vomissements, flatulences, constipation, douleur abdominale. Peu fréquents (1/1 000 à 1/100) : insomnie, vertiges, rash cutané. Rares (1/10 000 à 1/1 000) : hyponatrémie. Très rares (< 1/10 000) : hypomagnésémie — peut survenir après au moins 3 mois de traitement, généralement après 1 an ; manifestations : tétanie, convulsions, arythmie, fatigue, spasmes. Déficit en vitamine B12 (cyanocobalamine) lors de traitements prolongés : réduction de l'absorption gastrique de la B12 par diminution de la sécrétion d'acide chlorhydrique.",
        meta: {
          depletionRisk: "magnésium, vitamine B12",
          depletionLatency: "3 mois minimum pour magnésium",
        },
      },
      {
        sectionPath: "4.4",
        title: "Mises en garde et précautions d'emploi",
        text: "Traitement prolongé (> 1 an) : surveiller la magnésémie avant et pendant le traitement. Doser la vitamine B12 chez les patients sous traitement prolongé ou présentant des signes de déficit (fatigue, paresthésies, troubles cognitifs). Exclure une pathologie maligne avant traitement d'un ulcère gastrique (masquage possible des symptômes). Risque de fractures osseuses en cas d'utilisation prolongée à forte dose.",
        meta: { monitoringNeeded: "magnésémie, vitamine B12, densité osseuse" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Lévothyroxine — interactions absorption (calcium, fer, soja, IPP)
  // ---------------------------------------------------------------------------
  {
    drugKey: "levothyroxine",
    sourceType: "BDPM",
    docType: "NOTICE",
    title: "Lévothyroxine sodique 100 µg, comprimé — Notice BDPM",
    url: "https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=68022493",
    sections: [
      {
        sectionPath: "1",
        title: "Composition",
        text: "Substance active : Lévothyroxine sodique 100 microgrammes par comprimé. Excipients : lactose monohydraté, amidon de maïs, gélatine, croscarmellose sodique, stéarate de magnésium.",
        meta: { substanceName: "Lévothyroxine sodique", dosage: "100 µg" },
      },
      {
        sectionPath: "4.1",
        title: "Indications thérapeutiques",
        text: "Traitement substitutif de l'hypothyroïdie. Traitement supplémentaire aux médicaments thyréostatiques dans l'hyperthyroïdie. Prévention des récidives après chirurgie thyroïdienne dans le goitre euthyroïdien. Traitement freinateur dans le cancer thyroïdien différencié après thyroïdectomie totale.",
        meta: { indication: "Pathologies thyroïdiennes" },
      },
      {
        sectionPath: "4.3",
        title: "Contre-indications",
        text: "Hyperthyroïdie non traitée ou insuffisamment traitée. Infarctus du myocarde aigu. Myocardite aiguë. Pancardite aiguë. Hypersensibilité à l'un des composants.",
        meta: { severity: "absolue" },
      },
      {
        sectionPath: "4.5",
        title: "Interactions médicamenteuses",
        text: "Calcium (carbonate, citrate, suppléments) : réduction significative de l'absorption de la lévothyroxine. Respecter un intervalle d'au moins 2 heures entre les prises. Fer (sulfate ferreux, suppléments) : chélation de la lévothyroxine dans le tube digestif, réduction de l'absorption. Intervalle minimal de 2 heures recommandé. Inhibiteurs de la pompe à protons (IPP), antiacides (hydroxyde d'aluminium, de magnésium) : réduction de l'absorption de la lévothyroxine par élévation du pH gastrique. Soja (isoflavones, aliments à base de soja) : peut diminuer l'absorption de la lévothyroxine ; éviter la consommation de soja dans les 2 heures entourant la prise. Cholestyramine, colestipol : réduction importante de l'absorption par chélation. Rifampicine, phénobarbital, carbamazépine : accélèrent le métabolisme de la lévothyroxine, adaptation posologique possible.",
        meta: {
          interactionTargets: "calcium, fer, IPP, soja, cholestyramine, rifampicine",
          interactionMechanism: "réduction absorption digestive",
        },
      },
      {
        sectionPath: "4.8",
        title: "Effets indésirables",
        text: "En cas de surdosage ou de dose inadaptée : tachycardie, palpitations, arythmies, angor. Insomnie, agitation, anxiété, irritabilité, céphalées. Perte de poids, hypersudation, intolérance à la chaleur. Tremblement des mains. Ces symptômes disparaissent généralement après réduction de la dose ou interruption temporaire du traitement.",
        meta: { note: "Effets liés au surdosage, pas à une toxicité propre" },
      },
      {
        sectionPath: "4.4",
        title: "Mises en garde et précautions d'emploi",
        text: "Toujours prendre la lévothyroxine à jeun, 30 à 60 minutes avant le petit-déjeuner, avec un grand verre d'eau, sans autre médicament ni aliment. Surveillance de la TSH : dosage recommandé 4 à 8 semaines après tout changement de traitement, puis 1 à 2 fois par an. Adaptation posologique chez la femme enceinte (besoins augmentés de 25 à 50 %) : surveillance TSH mensuelle pendant la grossesse. Patients cardiaques : initiation à dose faible, augmentation progressive. Éviter de changer de spécialité sans avis médical (bioéquivalence stricte de la lévothyroxine).",
        meta: { monitoringNeeded: "TSH, T4 libre", criticalTiming: "à jeun, 30 min avant repas" },
      },
    ],
  },
];
