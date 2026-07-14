/**
 * Catalogue Editorial DNA — blocs de contenu optionnels.
 * Porté depuis data/editorial-dna.json (SelfHook), adapté au domaine business
 * naturopathie (cf. spec §5.4). Vit uniquement en code, jamais en base.
 */

import type { BlogCluster, BlogStructure, BlogTone } from "@prisma/client";
import type { BlogBlockType } from "./types";

export interface BlogBlockDefinition {
  label: string;
  promptInstruction: string;
  /** Exemple de forme JSON attendue pour ce bloc dans contentJson.blocks[]. */
  jsonSchemaExample: string;
  clusterWeights: Partial<Record<BlogCluster | "_default", number>>;
  toneWeights: Partial<Record<BlogTone, number>>;
  structureWeights: Partial<Record<BlogStructure, number>>;
}

export const BLOG_BLOCKS: Record<BlogBlockType, BlogBlockDefinition> = {
  comparisonTable: {
    label: "Tableau comparatif",
    promptInstruction:
      "Ajoute un tableau comparatif (2-3 colonnes, 3-5 lignes) qui compare des statuts juridiques, des outils de gestion ou des approches clés du sujet.",
    jsonSchemaExample:
      '{ "type": "comparisonTable", "caption": "Titre du tableau", "headers": ["Critère", "Option A", "Option B"], "rows": [["...","...","..."]] }',
    clusterWeights: { GESTION_OUTILS: 3, INSTALLATION: 2, REGLEMENTATION_JURIDIQUE: 2, DEVELOPPEMENT_ACTIVITE: 2, _default: 1 },
    toneWeights: { ANALYTIQUE: 3, PRATIQUE: 2, PEDAGOGIQUE: 2, EXPERT: 1, RETOUR_EXPERIENCE: 0, JOURNALISTIQUE: 1 },
    structureWeights: { MODULAIRE: 2, MIXTE: 2, LINEAIRE: 0 },
  },
  faq: {
    label: "FAQ",
    promptInstruction:
      "Ajoute une FAQ de 4-6 questions naturelles que se posent les naturopathes sur ce sujet, avec des réponses directes de 2-4 phrases, optimisées pour être citées par les moteurs IA (GEO).",
    jsonSchemaExample: '{ "type": "faq", "items": [{ "q": "Question naturelle ?", "a": "Réponse directe 2-4 phrases." }] }',
    clusterWeights: { _default: 3 },
    toneWeights: { PEDAGOGIQUE: 3, PRATIQUE: 2, ANALYTIQUE: 2, JOURNALISTIQUE: 1, EXPERT: 2, RETOUR_EXPERIENCE: 1 },
    structureWeights: { MODULAIRE: 2, MIXTE: 2, LINEAIRE: 1 },
  },
  checklist: {
    label: "Checklist opérationnelle",
    promptInstruction:
      "Ajoute une checklist de 8-12 items opérationnels et actionnables que le naturopathe peut cocher pour avancer concrètement sur ce sujet.",
    jsonSchemaExample: '{ "type": "checklist", "items": ["Action concrète 1", "..."] }',
    clusterWeights: { INSTALLATION: 3, GESTION_OUTILS: 3, ACQUISITION_CLIENTELE: 2, _default: 2 },
    toneWeights: { PRATIQUE: 3, PEDAGOGIQUE: 2, EXPERT: 1, ANALYTIQUE: 1, RETOUR_EXPERIENCE: 0, JOURNALISTIQUE: 0 },
    structureWeights: { MODULAIRE: 3, MIXTE: 1, LINEAIRE: 0 },
  },
  planAction: {
    label: "Plan d'action",
    promptInstruction:
      "Ajoute un plan d'action en 3-6 étapes numérotées et séquentielles pour mettre en œuvre le sujet traité, chaque étape avec un titre court et 1-2 phrases d'explication.",
    jsonSchemaExample: '{ "type": "planAction", "steps": [{ "title": "Étape", "body": "1-2 phrases" }] }',
    clusterWeights: {
      GESTION_OUTILS: 3,
      ACQUISITION_CLIENTELE: 2,
      INSTALLATION: 2,
      COMMUNICATION_VISIBILITE: 2,
      _default: 2,
    },
    toneWeights: { PRATIQUE: 3, PEDAGOGIQUE: 2, EXPERT: 1, ANALYTIQUE: 1, RETOUR_EXPERIENCE: 0, JOURNALISTIQUE: 0 },
    structureWeights: { MODULAIRE: 2, MIXTE: 2, LINEAIRE: 0 },
  },
  caseStudy: {
    label: "Étude de cas / retour d'expérience",
    promptInstruction:
      "Ajoute un exemple concret détaillé (80-150 mots) : portrait ou situation type d'un naturopathe (toujours fictif/anonymisé, jamais un cas réel identifiable) illustrant le sujet avec des données estimées réalistes. Reste sur le registre du bien-être et de la gestion de cabinet, jamais du diagnostic ou du soin médical.",
    jsonSchemaExample: '{ "type": "caseStudy", "body": "80-150 mots, cas concret et spécifique" }',
    clusterWeights: { _default: 3, ACQUISITION_CLIENTELE: 3, DEVELOPPEMENT_ACTIVITE: 2 },
    toneWeights: { PRATIQUE: 3, PEDAGOGIQUE: 2, RETOUR_EXPERIENCE: 3, ANALYTIQUE: 2, EXPERT: 1, JOURNALISTIQUE: 1 },
    structureWeights: { MIXTE: 2, LINEAIRE: 2, MODULAIRE: 1 },
  },
  keyTakeaways: {
    label: "Points clés à retenir",
    promptInstruction: "Ajoute une synthèse de 3-6 points actionnables à retenir de l'article.",
    jsonSchemaExample: '{ "type": "keyTakeaways", "items": ["Point actionnable", "..."] }',
    clusterWeights: { _default: 2 },
    toneWeights: { PEDAGOGIQUE: 2, PRATIQUE: 2, ANALYTIQUE: 2, EXPERT: 1, RETOUR_EXPERIENCE: 0, JOURNALISTIQUE: 1 },
    structureWeights: { MODULAIRE: 2, MIXTE: 2, LINEAIRE: 0 },
  },
  sources: {
    label: "Sources",
    promptInstruction:
      "Ajoute une liste de 2-4 sources ou ressources fiables citées dans l'article (nom de la source + ce qu'elle apporte : INSEE, ordres professionnels, études sectorielles...), sans URL fictive.",
    jsonSchemaExample: '{ "type": "sources", "items": [{ "label": "Nom de la source", "note": "Ce qu\'elle apporte" }] }',
    clusterWeights: { REGLEMENTATION_JURIDIQUE: 3, DEVELOPPEMENT_ACTIVITE: 2, GESTION_OUTILS: 1, _default: 1 },
    toneWeights: { EXPERT: 3, ANALYTIQUE: 2, JOURNALISTIQUE: 2, PEDAGOGIQUE: 1, PRATIQUE: 0, RETOUR_EXPERIENCE: 0 },
    structureWeights: { MIXTE: 2, MODULAIRE: 1, LINEAIRE: 1 },
  },
  timeline: {
    label: "Chronologie",
    promptInstruction:
      "Ajoute une chronologie de 3-5 étapes montrant la progression du sujet dans le temps (ex : les 6 premiers mois d'installation), avec pour chaque étape un intitulé et 1 phrase d'explication.",
    jsonSchemaExample: '{ "type": "timeline", "items": [{ "period": "Phase ou date", "body": "1 phrase" }] }',
    clusterWeights: { INSTALLATION: 3, DEVELOPPEMENT_ACTIVITE: 2, _default: 1 },
    toneWeights: { JOURNALISTIQUE: 3, ANALYTIQUE: 2, RETOUR_EXPERIENCE: 2, EXPERT: 1, PEDAGOGIQUE: 1, PRATIQUE: 0 },
    structureWeights: { LINEAIRE: 2, MIXTE: 2, MODULAIRE: 1 },
  },
  quote: {
    label: "Citation / mise en avant",
    promptInstruction:
      "Ajoute une phrase de mise en avant (30-50 mots) qui résume l'idée la plus forte de l'article, formulée comme une citation autonome et percutante.",
    jsonSchemaExample: '{ "type": "quote", "text": "30-50 mots, idée forte formulée comme une citation" }',
    clusterWeights: { _default: 1 },
    toneWeights: { RETOUR_EXPERIENCE: 3, JOURNALISTIQUE: 3, ANALYTIQUE: 1, EXPERT: 1, PEDAGOGIQUE: 1, PRATIQUE: 0 },
    structureWeights: { LINEAIRE: 2, MIXTE: 2, MODULAIRE: 0 },
  },
  expertFocus: {
    label: "Focus réglementaire / déontologique",
    promptInstruction:
      "Ajoute un encadré 'focus expert' (60-100 mots) qui apporte une nuance réglementaire, déontologique ou une limite du métier que les naturopathes débutants négligent souvent.",
    jsonSchemaExample: '{ "type": "expertFocus", "body": "60-100 mots, nuance réglementaire ou déontologique" }',
    clusterWeights: { REGLEMENTATION_JURIDIQUE: 3, INSTALLATION: 2, GESTION_OUTILS: 1, _default: 1 },
    toneWeights: { EXPERT: 3, ANALYTIQUE: 2, JOURNALISTIQUE: 1, PEDAGOGIQUE: 1, PRATIQUE: 0, RETOUR_EXPERIENCE: 0 },
    structureWeights: { MIXTE: 2, MODULAIRE: 1, LINEAIRE: 1 },
  },
  commonMistakes: {
    label: "Erreurs fréquentes",
    promptInstruction:
      "Ajoute une liste de 3-5 erreurs fréquentes commises par les naturopathes sur ce sujet, chacune avec un intitulé court et 1 phrase expliquant pourquoi c'est une erreur.",
    jsonSchemaExample: '{ "type": "commonMistakes", "items": [{ "title": "Erreur", "body": "1 phrase" }] }',
    clusterWeights: { INSTALLATION: 2, ACQUISITION_CLIENTELE: 2, GESTION_OUTILS: 2, _default: 2 },
    toneWeights: { PRATIQUE: 3, EXPERT: 2, PEDAGOGIQUE: 2, ANALYTIQUE: 1, JOURNALISTIQUE: 0, RETOUR_EXPERIENCE: 0 },
    structureWeights: { MODULAIRE: 2, MIXTE: 1, LINEAIRE: 0 },
  },
};
