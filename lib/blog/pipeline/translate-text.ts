/**
 * Adaptation anglaise d'un article déjà validé en français — spec §6 étape 6.
 * Ce n'est pas une traduction littérale : le contenu FR sert de source de
 * vérité, l'anglais est reformulé naturellement en conservant exactement la
 * même structure de blocs (mêmes types, même ordre, même nombre) et les mêmes
 * contraintes de longueur relatives. Même score qualité / validation dure que
 * la génération FR (generate-text.ts), appliqués à la version EN.
 */

import type { EditorialDna } from "../dna/compose";
import { stripPrivateFields, type BlogArticleContent } from "./content-types";
import { applyReplacements, type ReplacementLogEntry } from "./language-guardrails";
import { computeQualityScore, hardValidate, type InternalLinkCandidates, type QualityScoreResult } from "./quality-score";
import type { LinkCandidate } from "./prompt";
import { callOpenAiChat, fixAndParseJson } from "./openai-client";

function buildTranslationSystemPrompt(dna: EditorialDna): string {
  return `Tu es un rédacteur bilingue qui adapte en anglais des articles de blog business pour naturopathes, initialement écrits en français pour NaturoDesk (SaaS de gestion de cabinet).

RÈGLES D'ADAPTATION :
- Ce n'est PAS une traduction mot à mot : reformule pour que le texte sonne naturel et idiomatique en anglais, en conservant exactement le même sens et les mêmes informations que la source.
- Conserve EXACTEMENT la même liste de blocs "blocks" : mêmes types, même ordre, même nombre. N'ajoute, ne supprime et ne réordonne aucun bloc.
- Le champ "naturodeskContext" doit toujours citer littéralement "NaturoDesk" (jamais traduit ou paraphrasé).
- Longueur de chaque champ proportionnellement équivalente à la source (${dna.wordTarget[0]}-${dna.wordTarget[1]} mots au total, visé aussi en anglais).

RÈGLES ABSOLUES DE LANGAGE (identiques au français) :
- Interdit : "guaranteed", "guaranteed results", "cures", "heals", "treats the disease", "medical diagnosis", "miracle cure"
- Chaque affirmation chiffrée doit être présentée comme une estimation
- Tout exemple ou témoignage de naturopathe reste fictif/anonymisé

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises de code, avec exactement les mêmes clés que l'article source : title, metaTitle, metaDescription, quickAnswer, definition, intro, sections, naturodeskContext, blocks, conclusion.`;
}

function buildTranslationUserPrompt(frContent: BlogArticleContent, linkCandidates: LinkCandidate[]): string {
  const linksLine =
    linkCandidates.length > 0 ? linkCandidates.map((l) => `${l.title} (${l.slug})`).join(", ") : "aucun article lié disponible";

  return `Adapte cet article en anglais :

${JSON.stringify(frContent, null, 2)}

Articles liés à mentionner naturellement si pertinent : ${linksLine}

Retourne le même objet JSON, en anglais, avec exactement les mêmes clés et la même liste de blocs.`;
}

export interface TranslateArticleTextResult {
  content: BlogArticleContent;
  scoreResult: QualityScoreResult;
  hardErrors: string[];
  replacementLog: ReplacementLogEntry[];
  tokensUsed: number;
}

export async function translateArticleText(
  frContent: BlogArticleContent,
  dna: EditorialDna,
  linkCandidates: LinkCandidate[],
  linkCounts: InternalLinkCandidates
): Promise<TranslateArticleTextResult> {
  const systemPrompt = buildTranslationSystemPrompt(dna);
  const userPrompt = buildTranslationUserPrompt(frContent, linkCandidates);

  const { raw, tokensUsed } = await callOpenAiChat(systemPrompt, userPrompt);
  const parsed = fixAndParseJson(raw);
  const stripped = stripPrivateFields(parsed);
  const { content, log: replacementLog } = applyReplacements(stripped);

  const scoreResult = computeQualityScore(content, dna, linkCounts);
  const hardErrors = hardValidate(content, scoreResult.score, dna);

  return { content, scoreResult, hardErrors, replacementLog, tokensUsed };
}
