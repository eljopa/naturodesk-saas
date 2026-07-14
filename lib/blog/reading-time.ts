import { estimateWordCount } from "./pipeline/quality-score";
import type { BlogArticleContent } from "./pipeline/content-types";

const WORDS_PER_MINUTE = 200;

/** Temps de lecture estimé (minutes, arrondi au supérieur, minimum 1). */
export function estimateReadingTimeMinutes(content: BlogArticleContent): number {
  return Math.max(1, Math.ceil(estimateWordCount(content) / WORDS_PER_MINUTE));
}
