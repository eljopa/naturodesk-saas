/**
 * Configuration du parsing HTML des fiches ODS (NIH Office of Dietary Supplements).
 *
 * Chaque fiche ODS HealthProfessional est structurée en sections nommées.
 * Ce fichier mappe les titres de section ODS vers nos types internes
 * (KnowledgeDocType / catégorie sémantique) pour guider l'extraction.
 *
 * URL pattern : https://ods.od.nih.gov/factsheets/{odsId}-HealthProfessional/
 *
 * Stratégie de matching :
 *   Pour chaque heading H2/H3 trouvé dans le HTML, on teste chaque entrée
 *   dans l'ordre. La première correspondance (includes + normalisation) gagne.
 *   Si aucune entrée ne correspond → section ignorée (non extraite).
 *
 * Couverture :
 *   - Vitamines / minéraux : sections standardisées ODS (Recommended Intakes, etc.)
 *   - Botanicals / suppléments : sections propres (Efficacy, Implications, etc.)
 */

/** Catégorie sémantique interne d'une section ODS. */
export type OdsSectionType =
  | "OVERVIEW"        // Qu'est-ce que X ? Présentation générale
  | "HEALTH_EFFECTS"  // Effets sur la santé, bénéfices, indications
  | "SAFETY"          // Risques, effets indésirables, toxicité
  | "INTERACTIONS"    // Interactions médicamenteuses / suppléments
  | "DOSAGE_NOTE";    // Apports recommandés, dosage, sources, usage

export interface OdsSectionConfig {
  /** Type sémantique cible. */
  type: OdsSectionType;
  /**
   * Fragments de texte (casse insensible, normalisés sans accents)
   * qui identifient ce type de section dans un heading ODS.
   * La vérification est : normalizedHeading.includes(fragment).
   */
  fragments: string[];
}

/**
 * Table de matching des sections ODS → type sémantique.
 *
 * L'ordre est important : la première règle qui correspond est appliquée.
 * Mettre les règles les plus spécifiques en premier.
 */
export const ODS_SECTION_CONFIGS: OdsSectionConfig[] = [
  // ── Interactions ──────────────────────────────────────────────────────────
  // Testé en premier : "interactions" peut aussi apparaître dans SAFETY.
  {
    type: "INTERACTIONS",
    fragments: [
      "interactions with medications",
      "drug interactions",
      "medication interactions",
      "interactions between",
      "interactions with",   // large — en dernier dans ce groupe
      "can i take",
      "does it interact",
    ],
  },

  // ── Safety / Risques ──────────────────────────────────────────────────────
  {
    type: "SAFETY",
    fragments: [
      "health risks",
      "risks from",
      "what if i take too much",
      "too much",
      "adverse effects",
      "side effects",
      "toxicity",
      "upper intake level",
      "tolerable upper",
      "upper level",
      "can cause harm",
      "is it safe",
      "excessive",
      "safety",             // large — en dernier dans ce groupe
    ],
  },

  // ── Dosage / Apports / Sources / Usage ───────────────────────────────────
  {
    type: "DOSAGE_NOTE",
    fragments: [
      // Vitamines / minéraux (ODS standard)
      "recommended intakes",
      "recommended intake",
      "recommended amounts",
      "recommended dietary allowance",
      "recommended dietary",
      "dietary reference intake",
      "adequate intake",
      "daily value",
      "how much",
      "getting enough",
      // Botanicals / suppléments
      "sources of",          // ex: "Sources of Probiotics", "Sources of Zinc"
      "selection and use",   // ex: "Probiotic Selection and Use"
      "dosage",
      "how to use",
      "how to take",
      // Section de clôture ODS — conseil diététique générique (peu de valeur clinique)
      // Doit apparaître AVANT le fragment "and health" pour ne pas être capturé en HEALTH_EFFECTS
      "healthful diets",     // ex: "Magnesium and Healthful Diets"
      "healthy diets",
    ],
  },

  // ── Effets sur la santé / bénéfices ───────────────────────────────────────
  {
    type: "HEALTH_EFFECTS",
    fragments: [
      // Vitamines / minéraux (ODS standard)
      "health effects",
      "health benefits",
      "uses and potential benefits",
      "potential benefits",
      "what are the effects",
      "what happens if",   // ex: "What happens if I don't get enough X?"
      "signs of",          // ex: "What are the signs of X deficiency?"
      "deficiency",
      "benefits of",
      "what does",
      "uses of",
      "clinical uses",
      "scientific evidence",
      "research on",
      // Épidémiologie / groupes à risque / statut biologique (ODS standard)
      "intakes and status",  // ex: "Magnesium Intakes and Status"
      "groups at risk",      // ex: "Groups at Risk of Magnesium Inadequacy"
      "assessing",           // ex: "Assessing magnesium status"
      "at risk of",
      // Botanicals / suppléments
      "efficacy",            // ex: "Efficacy" (Ashwagandha)
      "implications for use", // ex: "Implications for use" (Ashwagandha)
      "and health",           // ex: "Probiotics and Health", "Vitamin D and Health"
      "health outcomes",
      "clinical evidence",
      "potential uses",
    ],
  },

  // ── Vue d'ensemble ────────────────────────────────────────────────────────
  // En dernier : "What is X?" est court et peut correspondre à d'autres sections.
  {
    type: "OVERVIEW",
    fragments: [
      "what is",
      "introduction",
      "overview",
      "background",
      "key facts",
    ],
  },
];

// ---------------------------------------------------------------------------
// Utilitaire de matching
// ---------------------------------------------------------------------------

/**
 * Normalise un heading ODS pour la comparaison :
 * - minuscules
 * - suppression des accents (NFD + strip combining marks)
 * - collapse whitespace
 */
export function normalizeOdsHeading(heading: string): string {
  return heading
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Résout le type sémantique d'un heading ODS.
 * Retourne null si aucune règle ne correspond (section à ignorer).
 */
export function resolveOdsSectionType(heading: string): OdsSectionType | null {
  const normalized = normalizeOdsHeading(heading);
  for (const config of ODS_SECTION_CONFIGS) {
    for (const fragment of config.fragments) {
      if (normalized.includes(fragment)) {
        return config.type;
      }
    }
  }
  return null;
}
