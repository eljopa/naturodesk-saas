/**
 * Parser HTML pour les fiches ODS (NIH Office of Dietary Supplements).
 *
 * Transforme le HTML brut d'une fiche HealthProfessional en SourceDocumentInput
 * compatible avec le pipeline d'import existant (importDocument).
 *
 * Stratégie de parsing (sans dépendance DOM externe) :
 *   1. Isolation du bloc de contenu principal (<article>, <main>, ou fallback body)
 *   2. Découpe sur les headings <h2> → une section par heading
 *   3. Classification du heading via resolveOdsSectionType()
 *   4. Strip HTML + décodage entités sur le corps de chaque section
 *   5. Filtrage des sections trop courtes (<30 chars) ou non reconnues
 *
 * Les sections non classifiées (références, navigation, formulaires produits…)
 * sont silencieusement ignorées — seul le contenu cliniquement pertinent est conservé.
 */

import { resolveOdsSectionType } from "./ods-sections";
import { buildOdsUrl } from "./ods-fetcher";
import type { SourceDocumentInput, SourceSection } from "../../import/types";

/** Longueur minimale du texte d'une section pour être conservée. */
const MIN_SECTION_LENGTH = 30;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse une fiche ODS HTML en SourceDocumentInput.
 *
 * @param html           HTML brut retourné par fetchOdsFactSheet()
 * @param odsId          Slug ODS (ex: "Magnesium")
 * @param normalizedKey  normalizedKey du KnowledgeTerm (utilisé comme drugKey)
 * @param canonicalName  Nom lisible du terme (ex: "Magnésium")
 */
export function parseOdsFactSheet(
  html: string,
  odsId: string,
  normalizedKey: string,
  canonicalName: string
): SourceDocumentInput {
  const content = extractMainContent(html);
  const h2Blocks = splitOnH2(content);
  const sections: SourceSection[] = [];

  for (const { headingHtml, bodyHtml } of h2Blocks) {
    const headingText = stripHtml(headingHtml).trim();
    if (!headingText) continue;

    const sectionType = resolveOdsSectionType(headingText);
    if (!sectionType) continue; // références, navigation, sources alimentaires, etc.

    const text = stripHtml(bodyHtml).trim();
    if (text.length < MIN_SECTION_LENGTH) continue;

    sections.push({
      sectionPath: sectionType,   // ex: "INTERACTIONS" → classifySection() → "interaction"
      title: headingText,
      text,
      meta: {
        odsId,
        canonicalName,
        sourceHeading: headingText,
      },
    });
  }

  return {
    drugKey:    normalizedKey,
    sourceType: "NIH_ODS",
    docType:    "FACT_SHEET",
    title:      `${canonicalName} — NIH ODS Fact Sheet (HealthProfessional)`,
    url:        buildOdsUrl(odsId),
    sections,
  };
}

// ---------------------------------------------------------------------------
// HTML utilities (pas de dépendance externe)
// ---------------------------------------------------------------------------

/**
 * Extrait le bloc de contenu principal de la page.
 *
 * ODS utilise différentes structures selon les versions de leur CMS.
 * Ordre de priorité : <article> → <main> → <div class="*content*"> → HTML entier.
 */
function extractMainContent(html: string): string {
  // 1. <article ...>
  const article = matchFirst(html, /<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) return article;

  // 2. <main ...>
  const main = matchFirst(html, /<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main;

  // 3. <div class="...content..."> — patterns ODS connus
  const divContent = matchFirst(
    html,
    /<div[^>]*class="[^"]*(?:field--item|ods-content|page-content|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (divContent) return divContent;

  // 4. Fallback : HTML complet (acceptable, les sections hors-sujet seront filtrées)
  return html;
}

/** Retourne le premier groupe capturant, ou null. */
function matchFirst(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m?.[1] ?? null;
}

/**
 * Découpe le HTML en blocs délimités par les <h2>.
 *
 * Chaque bloc contient :
 *   headingHtml — le contenu interne du <h2> (peut contenir des tags)
 *   bodyHtml    — le HTML qui suit jusqu'au prochain <h2>
 */
function splitOnH2(html: string): Array<{ headingHtml: string; bodyHtml: string }> {
  // Sépare chaque <h2 ...>...</h2> + ce qui suit
  const parts = html.split(/(?=<h2[\s>])/i);
  const blocks: Array<{ headingHtml: string; bodyHtml: string }> = [];

  for (const part of parts) {
    // Capture <h2 ...>HEADING_CONTENT</h2>BODY
    const m = part.match(/^<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*)/i);
    if (!m) continue;

    blocks.push({
      headingHtml: m[1] ?? "",
      bodyHtml:    m[2] ?? "",
    });
  }

  return blocks;
}

/**
 * Supprime les balises HTML et décode les entités communes.
 * Normalise les espaces et retours ligne.
 *
 * Ordre des passes :
 *   1. Suppression <script> et <style> (contenu exécutable)
 *   2. Suppression des tableaux (données tabulaires non exploitables en texte brut)
 *   3. Suppression de toutes les autres balises
 *   4. Décodage entités HTML courantes
 *   5. Normalisation espaces
 */
function stripHtml(html: string): string {
  return html
    // Blocs non textuels
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Tableaux — remplacer les cellules par des espaces (préserve la lisibilité)
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    // Entités HTML — nommées courantes
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    // Fractions typographiques (tables nutritionnelles ODS)
    .replace(/&frac12;/gi, "½")
    .replace(/&frac14;/gi, "¼")
    .replace(/&frac34;/gi, "¾")
    // Entités numériques et nommées résiduelles (inclut les noms avec chiffres ex: &frac12;)
    .replace(/&#x?[0-9a-fA-F]+;/g, "")
    .replace(/&[a-zA-Z][a-zA-Z0-9]{1,9};/g, "")
    // Normalisation espaces
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
