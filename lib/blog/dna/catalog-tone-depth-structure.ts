/**
 * Catalogue Editorial DNA — tons, profondeurs, structures.
 * Porté depuis data/editorial-dna.json (SelfHook), adapté au domaine business
 * naturopathie (cf. spec docs/superpowers/specs/2026-07-14-blog-business-naturopathie-design.md §5.2/§5.3).
 */

import type { BlogCluster, BlogContentType, BlogDepth, BlogStructure, BlogTone } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tons
// ---------------------------------------------------------------------------

export interface BlogToneDefinition {
  label: string;
  voiceInstruction: string;
}

export const BLOG_TONES: Record<BlogTone, BlogToneDefinition> = {
  PEDAGOGIQUE: {
    label: "Pédagogique",
    voiceInstruction:
      "Ton pédagogique et clair : explique comme à quelqu'un qui découvre le sujet, du plus simple au plus complexe, avec des exemples concrets et un vocabulaire toujours défini avant d'être utilisé.",
  },
  RETOUR_EXPERIENCE: {
    label: "Retour d'expérience",
    voiceInstruction:
      "Ton retour d'expérience/narratif : fais progresser le texte comme un témoignage ou un cas vécu type de naturopathe qui illustre le sujet. Moins de listes à puces, plus de texte continu, des transitions qui racontent une progression plutôt que d'énumérer des points. Toujours un exemple fictif/anonymisé, jamais un cas réel identifiable.",
  },
  ANALYTIQUE: {
    label: "Analytique",
    voiceInstruction:
      "Ton analytique : présente des faits, compare des approches, nuance chaque affirmation ('dans certains cas', 'selon la situation'), structure le propos autour de données et de raisonnements plutôt que d'instructions pas-à-pas.",
  },
  JOURNALISTIQUE: {
    label: "Journalistique",
    voiceInstruction:
      "Ton journalistique : accroche factuelle, mise en contexte d'une tendance ou d'une évolution du métier de naturopathe, ouverture sur les enjeux avant d'entrer dans la méthode.",
  },
  PRATIQUE: {
    label: "Pratique",
    voiceInstruction:
      "Ton direct et actionnable : va à l'essentiel, privilégie les instructions concrètes et réalisables immédiatement, minimise la théorie et les digressions.",
  },
  EXPERT: {
    label: "Expert",
    voiceInstruction:
      "Ton d'expert : niveau de détail élevé sur les aspects métier/réglementaires, limites et hypothèses explicitées, vocabulaire précis, posture posée et confiante, sans emphase commerciale.",
  },
};

export const TONE_AFFINITY_BY_CLUSTER: Record<BlogCluster | "_default", Partial<Record<BlogTone, number>>> = {
  INSTALLATION: { PEDAGOGIQUE: 3, PRATIQUE: 3, ANALYTIQUE: 1, EXPERT: 2, RETOUR_EXPERIENCE: 2, JOURNALISTIQUE: 1 },
  REGLEMENTATION_JURIDIQUE: { EXPERT: 3, PEDAGOGIQUE: 2, ANALYTIQUE: 2, PRATIQUE: 1, JOURNALISTIQUE: 1, RETOUR_EXPERIENCE: 1 },
  ACQUISITION_CLIENTELE: { PRATIQUE: 3, RETOUR_EXPERIENCE: 2, PEDAGOGIQUE: 2, ANALYTIQUE: 1, JOURNALISTIQUE: 1, EXPERT: 1 },
  COMMUNICATION_VISIBILITE: { PRATIQUE: 3, JOURNALISTIQUE: 2, PEDAGOGIQUE: 2, RETOUR_EXPERIENCE: 2, ANALYTIQUE: 1, EXPERT: 1 },
  GESTION_OUTILS: { PRATIQUE: 3, ANALYTIQUE: 2, PEDAGOGIQUE: 2, EXPERT: 2, RETOUR_EXPERIENCE: 1, JOURNALISTIQUE: 1 },
  DEVELOPPEMENT_ACTIVITE: { ANALYTIQUE: 2, PRATIQUE: 2, RETOUR_EXPERIENCE: 2, EXPERT: 2, PEDAGOGIQUE: 1, JOURNALISTIQUE: 1 },
  _default: { PEDAGOGIQUE: 2, PRATIQUE: 2, ANALYTIQUE: 2, EXPERT: 1, RETOUR_EXPERIENCE: 1, JOURNALISTIQUE: 1 },
};

/** Boost additif appliqué aux tons lors d'un article de type PREUVE (contenu de preuve). */
export const PROOF_CONTENT_TONE_BOOST: Partial<Record<BlogTone, number>> = {
  ANALYTIQUE: 2,
  EXPERT: 2,
  JOURNALISTIQUE: 1,
};

// ---------------------------------------------------------------------------
// Profondeurs
// ---------------------------------------------------------------------------

export interface BlogDepthDefinition {
  label: string;
  /** [min, max] mots */
  words: [number, number];
  /** [min, max] sections H2 */
  sections: [number, number];
  maxBlocks: number;
}

export const BLOG_DEPTHS: Record<BlogDepth, BlogDepthDefinition> = {
  COURTE: { label: "Courte", words: [600, 900], sections: [2, 3], maxBlocks: 3 },
  MOYENNE: { label: "Moyenne", words: [900, 1400], sections: [3, 4], maxBlocks: 5 },
  LONGUE: { label: "Longue", words: [1400, 2000], sections: [4, 5], maxBlocks: 6 },
  APPROFONDIE: { label: "Très approfondie", words: [2000, 2800], sections: [5, 7], maxBlocks: 8 },
};

export const DEPTH_AFFINITY_BY_CONTENT_TYPE: Record<BlogContentType | "_default", Partial<Record<BlogDepth, number>>> = {
  GUIDE: { MOYENNE: 2, LONGUE: 3, APPROFONDIE: 2, COURTE: 1 },
  TUTORIEL: { MOYENNE: 3, LONGUE: 2, COURTE: 2, APPROFONDIE: 1 },
  COMPARATIF: { LONGUE: 3, APPROFONDIE: 2, MOYENNE: 2, COURTE: 0 },
  PREUVE: { APPROFONDIE: 3, LONGUE: 3, MOYENNE: 1, COURTE: 0 },
  _default: { COURTE: 2, MOYENNE: 3, LONGUE: 2, APPROFONDIE: 1 },
};

export const DEPTH_TO_IMAGE_COUNT: Record<BlogDepth, [number, number]> = {
  COURTE: [1, 1],
  MOYENNE: [1, 2],
  LONGUE: [2, 3],
  APPROFONDIE: [3, 4],
};

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

export interface BlogStructureDefinition {
  label: string;
  instruction: string;
}

export const BLOG_STRUCTURES: Record<BlogStructure, BlogStructureDefinition> = {
  LINEAIRE: {
    label: "Linéaire",
    instruction:
      "Fais progresser l'article comme un flux continu : peu de sous-listes, des transitions qui enchaînent les idées, une lecture qui se fait presque d'une traite plutôt que par blocs indépendants.",
  },
  MODULAIRE: {
    label: "Modulaire",
    instruction:
      "Structure l'article comme une succession de blocs autonomes et scannables : chaque section peut presque se lire indépendamment, avec des listes, des repères visuels et des titres explicites.",
  },
  MIXTE: {
    label: "Mixte",
    instruction:
      "Alterne entre passages narratifs continus et blocs structurés scannables : ni un flux purement continu, ni une succession de fiches.",
  },
};

export const STRUCTURE_AFFINITY_BY_TONE: Record<BlogTone, Partial<Record<BlogStructure, number>>> = {
  PEDAGOGIQUE: { MODULAIRE: 3, MIXTE: 2, LINEAIRE: 1 },
  ANALYTIQUE: { MIXTE: 3, MODULAIRE: 2, LINEAIRE: 2 },
  RETOUR_EXPERIENCE: { LINEAIRE: 3, MIXTE: 2, MODULAIRE: 0 },
  JOURNALISTIQUE: { LINEAIRE: 2, MIXTE: 3, MODULAIRE: 1 },
  PRATIQUE: { MODULAIRE: 3, MIXTE: 1, LINEAIRE: 0 },
  EXPERT: { MIXTE: 2, MODULAIRE: 2, LINEAIRE: 2 },
};
