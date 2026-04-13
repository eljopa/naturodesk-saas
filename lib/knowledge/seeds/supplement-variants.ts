/**
 * Données de seed pour les variantes/formes cliniques des suppléments V1.
 *
 * Chaque entrée rattache une variante à un KnowledgeTerm parent
 * via parentNormalizedKey → KnowledgeTerm.normalizedKey.
 *
 * Périmètre V1 :
 *   Seuls les ingrédients cliniquement sensibles où la forme change
 *   significativement le profil de tolérance ou d'efficacité.
 *
 * Ce fichier est la source de vérité pour :
 *   - scripts/seed-supplement-variants.ts  (seed DB)
 *   - lib/knowledge/supplements/services/resolve-variant.ts (lookup mémoire)
 */

import type { SupplementVariantType } from "@prisma/client";

export interface SupplementVariantSeed {
  parentNormalizedKey: string;           // → KnowledgeTerm.normalizedKey
  normalizedKey:       string;           // clé unique de la variante (@unique en DB)
  label:               string;           // label lisible
  variantType:         SupplementVariantType;
  aliases:             string[];         // textes bruts reconnus → cette variante
  notes?:              string;           // contexte clinique court
}

export const SUPPLEMENT_VARIANT_SEEDS: SupplementVariantSeed[] = [

  // ──────────────────────────────────────────────────────────────────────────
  // MAGNÉSIUM — 5 formes cliniquement distinctes
  // ──────────────────────────────────────────────────────────────────────────

  {
    parentNormalizedKey: "magnesium",
    normalizedKey:       "magnesium-bisglycinate",
    label:               "Magnésium bisglycinate",
    variantType:         "CHELATE",
    aliases: [
      "magnésium bisglycinate",
      "magnesium bisglycinate",
      "bisglycinate de magnésium",
      "magnésium glycinate",
      "magnesium glycinate",
      "bisglycinate magnésium",
    ],
    notes: "Forme chélatée à haute tolérance digestive. Meilleur profil de biodisponibilité.",
  },
  {
    parentNormalizedKey: "magnesium",
    normalizedKey:       "magnesium-marin",
    label:               "Magnésium marin",
    variantType:         "MARINE",
    aliases: [
      "magnésium marin",
      "magnesium marin",
      "magnésium de mer",
      "magnesium de mer",
    ],
    notes: "Extrait d'eau de mer. Peut être moins bien toléré digestivement que le bisglycinate.",
  },
  {
    parentNormalizedKey: "magnesium",
    normalizedKey:       "magnesium-citrate",
    label:               "Magnésium citrate",
    variantType:         "CITRATE",
    aliases: [
      "magnésium citrate",
      "magnesium citrate",
      "citrate de magnésium",
    ],
  },
  {
    parentNormalizedKey: "magnesium",
    normalizedKey:       "magnesium-malate",
    label:               "Magnésium malate",
    variantType:         "MALATE",
    aliases: [
      "magnésium malate",
      "magnesium malate",
      "malate de magnésium",
    ],
  },
  {
    parentNormalizedKey: "magnesium",
    normalizedKey:       "magnesium-oxyde",
    label:               "Magnésium oxyde",
    variantType:         "OXIDE",
    aliases: [
      "oxyde de magnésium",
      "magnésium oxyde",
      "magnesium oxyde",
      "magnesium oxide",
    ],
    notes: "Faible biodisponibilité (~4 %). Effet laxatif marqué à haute dose.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VITAMINE D — D3 vs D2
  // ──────────────────────────────────────────────────────────────────────────

  {
    parentNormalizedKey: "vitamine-d",
    normalizedKey:       "vitamine-d3",
    label:               "Vitamine D3 (cholécalciférol)",
    variantType:         "D3",
    aliases: [
      "vitamine d3",
      "vitamin d3",
      "vit d3",
      "cholécalciférol",
      "cholecalciferol",
      "d3",
    ],
    notes: "Forme naturelle d'origine animale. Plus efficace que la D2 pour élever la 25-OH-D.",
  },
  {
    parentNormalizedKey: "vitamine-d",
    normalizedKey:       "vitamine-d2",
    label:               "Vitamine D2 (ergocalciférol)",
    variantType:         "D2",
    aliases: [
      "vitamine d2",
      "vitamin d2",
      "ergocalciférol",
      "ergocalciferol",
      "d2",
    ],
    notes: "Forme végétale. Efficacité moindre pour le maintien du taux sérique.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // OMÉGA-3 — EPA/DHA
  // ──────────────────────────────────────────────────────────────────────────

  {
    parentNormalizedKey: "omega-3",
    normalizedKey:       "omega-3-epa-dha",
    label:               "Oméga-3 EPA/DHA",
    variantType:         "EPA_DHA",
    aliases: [
      "oméga 3 epa dha",
      "omega 3 epa dha",
      "omega-3 epa dha",
      "epa dha",
      "dha epa",
      "acides gras epa dha",
      "epa/dha",
      "omega 3 epa/dha",
      "oméga-3 epa/dha",
    ],
    notes: "EPA : action anti-inflammatoire. DHA : développement neurologique.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FER — 3 formes aux profils de tolérance différents
  // ──────────────────────────────────────────────────────────────────────────

  {
    parentNormalizedKey: "fer",
    normalizedKey:       "fer-bisglycinate",
    label:               "Fer bisglycinate",
    variantType:         "CHELATE",
    aliases: [
      "fer bisglycinate",
      "bisglycinate de fer",
      "iron bisglycinate",
      "fer chélaté",
    ],
    notes: "Forme chélatée. Meilleure tolérance digestive que le sulfate.",
  },
  {
    parentNormalizedKey: "fer",
    normalizedKey:       "fer-sulfate",
    label:               "Sulfate ferreux",
    variantType:         "SULFATE",
    aliases: [
      "sulfate ferreux",
      "fer sulfate",
      "sulfate de fer",
      "ferrous sulfate",
    ],
    notes: "Forme classique. Moins bien tolérée (constipation, nausées fréquentes).",
  },
  {
    parentNormalizedKey: "fer",
    normalizedKey:       "fer-fumarate",
    label:               "Fumarate ferreux",
    variantType:         "FUMARATE",
    aliases: [
      "fumarate ferreux",
      "fer fumarate",
      "ferrous fumarate",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PROBIOTIQUES — multi-souches
  // ──────────────────────────────────────────────────────────────────────────

  {
    parentNormalizedKey: "probiotiques",
    normalizedKey:       "probiotiques-multi-souches",
    label:               "Probiotiques multi-souches",
    variantType:         "MULTI_STRAIN",
    aliases: [
      "probiotiques multi-souches",
      "probiotiques multisouches",
      "multi-souches",
      "multi souches",
      "probiotique multi souches",
      "probiotiques combinés",
      "multiflore",
    ],
    notes: "Association Lactobacillus + Bifidobacterium. Spectre d'action plus large qu'une souche seule.",
  },

];
