/**
 * Service de parsing documentaire.
 *
 * Transforme un SourceDocumentInput (brut, sections nommées) en ParsedDocument
 * prêt pour la persistance.
 *
 * Logique de chunking : 1 section = 1 chunk.
 * C'est un chunking métier, pas un découpage par taille :
 * chaque chunk correspond à une catégorie sémantique précise (effets indésirables,
 * interactions, contre-indications, etc.).
 *
 * Prépare la structure pour BDPM réel : les parseurs BDPM rempliront les mêmes
 * SourceSection avec les mêmes sectionPaths canoniques.
 */

import { computeContentHash } from "../utils/hash";
import { classifySection } from "../utils/classify";
import type { SourceDocumentInput, ParsedDocument, ParsedChunk } from "../types";

/** Longueur minimale d'un extrait pour être conservé (évite les sections vides). */
const MIN_EXCERPT_LENGTH = 20;

/**
 * Taille maximale d'un chunk en caractères.
 * Au-delà, la section est découpée en sous-chunks par paragraphe.
 * Objectif : rester sous ~4 000 tokens OpenAI (ratio ~4 chars/token).
 */
const MAX_CHUNK_CHARS = 4_000;

/**
 * Parse un document source en document structuré prêt à persister.
 * Chaque section devient un ou plusieurs chunks :
 * - 1 chunk si la section fait ≤ MAX_CHUNK_CHARS
 * - N sous-chunks par paragraphe si la section dépasse la limite
 */
export function parseDocument(input: SourceDocumentInput): ParsedDocument {
  const contentHash = computeContentHash(input.sections);

  const chunks: ParsedChunk[] = input.sections.flatMap((section): ParsedChunk[] => {
    const kind    = classifySection(section.sectionPath);
    const excerpt = cleanText(section.text);
    const base    = {
      kind,
      sectionPath: section.sectionPath,
      metaJson: {
        drugKey: input.drugKey,
        sectionTitle: section.title,
        ...(section.meta ?? {}),
      } as Record<string, string | number | boolean | null>,
    };

    if (excerpt.length <= MAX_CHUNK_CHARS) {
      // Cas standard : 1 section = 1 chunk
      return excerpt.length >= MIN_EXCERPT_LENGTH
        ? [{ ...base, label: buildLabel(section.title, input.drugKey), excerpt }]
        : [];
    }

    // Section trop grande : découpage par paragraphe (\n\n)
    const parts = splitByParagraph(excerpt, MAX_CHUNK_CHARS);
    return parts
      .map((part, i): ParsedChunk => ({
        ...base,
        label: buildLabel(section.title, input.drugKey, parts.length > 1 ? i + 1 : undefined),
        excerpt: part,
        metaJson: {
          ...base.metaJson,
          partIndex: i + 1,
          totalParts: parts.length,
        },
      }))
      .filter((c) => c.excerpt.length >= MIN_EXCERPT_LENGTH);
  });

  return {
    drugKey: input.drugKey,
    sourceType: input.sourceType,
    docType: input.docType,
    title: input.title,
    url: input.url ?? null,
    contentHash,
    chunks,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Nettoie le texte brut : normalise les espaces et sauts de ligne. */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Construit un label lisible pour le chunk. */
function buildLabel(sectionTitle: string, drugKey: string, partIndex?: number): string {
  const suffix = partIndex !== undefined ? ` (part ${partIndex})` : "";
  return `${sectionTitle}${suffix} — ${drugKey}`;
}

/**
 * Découpe un texte long en segments ne dépassant pas maxChars,
 * en coupant uniquement sur des frontières de paragraphe (\n\n).
 * Si un paragraphe seul dépasse maxChars, il est conservé en l'état
 * (aucune coupure en milieu de phrase).
 */
function splitByParagraph(text: string, maxChars: number): string[] {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);
  const parts: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) parts.push(current.trim());
      // Si le paragraphe seul dépasse la limite, on le conserve tel quel
      current = para;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
