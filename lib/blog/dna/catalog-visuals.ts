/**
 * Catalogue Editorial DNA — familles visuelles (16 = 10 "interface" + 6 génériques).
 * Porté depuis data/editorial-dna.json (SelfHook), adapté à NaturoDesk (cf. spec §5.5).
 *
 * Les familles "interface" montrent des mockups d'écrans NaturoDesk dans la
 * palette nd-sage/nd-cream. Les prompts sont volontairement en anglais (meilleure
 * qualité de rendu des modèles de génération d'image), le placeholder "{{keyword}}"
 * est substitué au moment de la génération (lot pipeline images).
 */

import type { BlogCluster } from "@prisma/client";
import type { BlogVisualFamilyKey, BlogImageAnchor } from "./types";

export interface BlogVisualFamilyDefinition {
  label: string;
  kind: "interface" | "generic";
  promptTemplate: string;
}

const ND_INTERFACE_STYLE =
  "Clean modern SaaS product screenshot mockup, sage-green accent color on a warm cream background, " +
  "rounded cards, soft shadows, minimal flat UI, generous white space, no visible long paragraphs of " +
  "readable text (only short 1-2 word UI labels as decorative shapes), professional and polished like " +
  "Linear or Notion product screenshots. No real logos, no fictitious personal data rendered as legible text.";

export const BLOG_VISUAL_FAMILIES: Record<BlogVisualFamilyKey, BlogVisualFamilyDefinition> = {
  "agenda-rdv": {
    label: "Agenda / prise de rendez-vous",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a weekly calendar/agenda view for booking client appointments, colored time-block cards, a small "new appointment" button. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  "dossier-patient": {
    label: "Dossier patient",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a client record screen — profile header, tags, a short history timeline, and a notes panel. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  facturation: {
    label: "Facturation",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: an invoicing screen — a list of invoice cards with status badges (paid/pending) and a totals summary panel. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  "bilan-vitalite": {
    label: "Suivi bien-être",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a wellness follow-up summary screen — simple progress bars and category tags, framed as general wellness tracking, never as a medical diagnostic report. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  "page-web-therapeute": {
    label: "Page web publique du praticien",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a public practitioner website preview inside a browser-window frame — a hero section, a short bio block, and a "book an appointment" button. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  protocoles: {
    label: "Bibliothèque de protocoles",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a library of reusable wellness protocol templates shown as a card grid, each card with a short title and a category tag. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  consultations: {
    label: "Notes de consultation",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a consultation notes screen with a structured form (objectives, recommendations sections) and a save button. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  dashboard: {
    label: "Tableau de bord général",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: an overview dashboard with KPI cards (number of clients, upcoming appointments, revenue this month) and a small activity feed. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  parametres: {
    label: "Paramètres du cabinet",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: a settings screen with toggle switches, a subscription plan card, and a simple form layout. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  mobile: {
    label: "Vue mobile",
    kind: "interface",
    promptTemplate: `${ND_INTERFACE_STYLE} SCREEN CONTEXT: the same kind of SaaS interface (agenda or dashboard) shown on a mobile phone screen, held at a slight angle, thumb visible at the edge of frame. Visually evokes the concept of "{{keyword}}" through this interface context.`,
  },
  "photo-cabinet": {
    label: "Photo éditoriale — cabinet",
    kind: "generic",
    promptTemplate:
      'Realistic editorial photograph of a calm naturopathy practice/office — wooden shelves with herbs, plants and glass jars, warm natural window light, shallow depth of field, candid unposed feel. The scene should evoke the topic "{{keyword}}" through subtle environmental cues (open notebook, laptop screen angle, appointment book) without a legible on-screen interface. Style reference: HubSpot blog, Notion team photos, wellness-brand editorial photography. No text overlays, no logos.',
  },
  "portrait-professionnel": {
    label: "Portrait professionnel",
    kind: "generic",
    promptTemplate:
      'Realistic editorial portrait of a naturopath professional (varied age, gender, ethnicity across articles) in a warm, welcoming consultation room, natural light, relaxed confident posture, business-casual attire with a soft wellness aesthetic. Subtle visual connection to "{{keyword}}" through the setting. No text overlays, no logos.',
  },
  "illustration-botanique": {
    label: "Illustration botanique moderne",
    kind: "generic",
    promptTemplate:
      'Modern flat-design vector illustration combining botanical elements (leaves, herbs, simple plant shapes) with abstract business icons (growth chart, handshake, calendar, checkmark) representing "{{keyword}}". Warm cream background, sage-green and slate accents, generous negative space, soft rounded shapes, no gradients. Style reference: Stripe illustrations, Notion illustrations.',
  },
  "ambiance-bien-etre": {
    label: "Ambiance bien-être",
    kind: "generic",
    promptTemplate:
      'Natural lifestyle photograph evoking calm and wellness — a bright plant-filled room, natural textures (linen, wood, ceramics), warm daylight, relaxed authentic mood. Subtle visual connection to "{{keyword}}" through the setting, not through any visible screen content. Airy, human, approachable — not corporate stock-photo stiffness. No text overlays, no logos.',
  },
  "iconographie-schematique": {
    label: "Iconographie schématique",
    kind: "generic",
    promptTemplate:
      'Minimal line-icon schematic illustrating "{{keyword}}" — 3 to 5 simple icons connected by thin dotted lines on a plain cream background, sage-green accent color, no gradients, no photorealism. Style reference: clean SaaS explainer graphics.',
  },
  "infographie-chiffree": {
    label: "Infographie chiffrée",
    kind: "generic",
    promptTemplate:
      'Clean minimal infographic on a warm cream background summarizing a process or comparison related to "{{keyword}}" — 3 to 5 icon-driven steps or categories connected by thin arrows, short label placeholders (1-3 word labels only, no long paragraphs), sage-green and slate palette. Style reference: professional SaaS explainer graphics, not clip-art infographics.',
  },
};

export const BLOG_VISUAL_POOLS: Record<BlogCluster | "_default", Partial<Record<BlogVisualFamilyKey, number>>> = {
  INSTALLATION: {
    "photo-cabinet": 2,
    "portrait-professionnel": 2,
    "illustration-botanique": 2,
    "iconographie-schematique": 2,
    dashboard: 1,
    "page-web-therapeute": 1,
  },
  REGLEMENTATION_JURIDIQUE: {
    "iconographie-schematique": 2,
    "infographie-chiffree": 2,
    "portrait-professionnel": 1,
    "illustration-botanique": 1,
    parametres: 1,
  },
  ACQUISITION_CLIENTELE: {
    "portrait-professionnel": 2,
    "ambiance-bien-etre": 2,
    "page-web-therapeute": 2,
    "illustration-botanique": 1,
    dashboard: 1,
    "agenda-rdv": 1,
  },
  COMMUNICATION_VISIBILITE: {
    "page-web-therapeute": 2,
    "ambiance-bien-etre": 2,
    "portrait-professionnel": 2,
    "illustration-botanique": 1,
    "infographie-chiffree": 1,
  },
  GESTION_OUTILS: {
    "agenda-rdv": 3,
    "dossier-patient": 3,
    facturation: 2,
    dashboard: 2,
    protocoles: 2,
    consultations: 2,
    mobile: 1,
    parametres: 1,
    "bilan-vitalite": 1,
  },
  DEVELOPPEMENT_ACTIVITE: {
    dashboard: 2,
    "infographie-chiffree": 2,
    facturation: 1,
    "portrait-professionnel": 1,
    "illustration-botanique": 1,
    "ambiance-bien-etre": 1,
  },
  _default: {
    "photo-cabinet": 2,
    "portrait-professionnel": 2,
    "illustration-botanique": 1,
    "ambiance-bien-etre": 1,
    "iconographie-schematique": 1,
    "infographie-chiffree": 1,
  },
};

export const IMAGE_PLACEMENT_ANCHORS: BlogImageAnchor[] = [
  "hero",
  "afterIntro",
  "midSections",
  "beforeBlocks",
  "beforeConclusion",
];
