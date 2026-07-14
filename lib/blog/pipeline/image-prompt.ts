/**
 * Résolution du prompt final pour un emplacement d'image — porté depuis
 * buildVisualSlotPrompt() de scripts/lib/editorial-dna.mjs (SelfHook),
 * simplifié : NaturoDesk n'a pas de variantes de composition/couleur
 * supplémentaires (pas nécessaire au volume de publication actuel — spec §12).
 */

import { BLOG_VISUAL_FAMILIES } from "../dna/catalog-visuals";
import type { VisualSlot } from "../dna/compose";

const ANCHOR_HINT: Record<VisualSlot["anchor"], string> = {
  hero: "Primary editorial image for this article — the most recognizable, title-defining visual.",
  afterIntro: "Secondary supporting visual, placed early in the article to reinforce the topic.",
  midSections: "Mid-article illustrative visual showing methodology or process.",
  beforeBlocks: "Transitional visual introducing the structured/actionable part of the article.",
  beforeConclusion: "Closing visual — outcome or resolution framing.",
};

/** Construit le prompt final (anglais) envoyé au modèle de génération d'image pour un emplacement donné. */
export function buildImagePrompt(slot: VisualSlot, keyword: string): string {
  const family = BLOG_VISUAL_FAMILIES[slot.family];
  const subject = family.promptTemplate.replaceAll("{{keyword}}", keyword);
  const anchorHint = ANCHOR_HINT[slot.anchor] ?? "";
  return `${subject} ${anchorHint}`;
}
