/**
 * Types partagés du catalogue Editorial DNA du blog.
 * Les tons/profondeurs/structures/clusters sont des enums Prisma (BlogTone,
 * BlogDepth, BlogStructure, BlogCluster, BlogContentType) — seuls les blocs
 * de contenu et les familles visuelles vivent uniquement en code (cf. spec
 * §5.4/§5.5 : catalogue éditorial versionné, jamais en base).
 */

export type BlogBlockType =
  | "comparisonTable"
  | "faq"
  | "checklist"
  | "planAction"
  | "caseStudy"
  | "keyTakeaways"
  | "sources"
  | "timeline"
  | "quote"
  | "expertFocus"
  | "commonMistakes";

export type BlogVisualFamilyKey =
  // familles "interface" — mockups d'écrans NaturoDesk
  | "agenda-rdv"
  | "dossier-patient"
  | "facturation"
  | "bilan-vitalite"
  | "page-web-therapeute"
  | "protocoles"
  | "consultations"
  | "dashboard"
  | "parametres"
  | "mobile"
  // familles génériques
  | "photo-cabinet"
  | "portrait-professionnel"
  | "illustration-botanique"
  | "ambiance-bien-etre"
  | "iconographie-schematique"
  | "infographie-chiffree";

export type BlogImageAnchor = "hero" | "afterIntro" | "midSections" | "beforeBlocks" | "beforeConclusion";
