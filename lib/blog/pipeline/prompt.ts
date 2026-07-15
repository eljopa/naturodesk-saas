/**
 * Construction du prompt système + utilisateur pour la génération de texte FR.
 * Porté depuis la fonction generateContent() de scripts/blog-auto-publish.mjs
 * (SelfHook), adapté à la charte éditoriale business-naturopathie (spec §5).
 *
 * Module pur — aucun accès réseau ni base de données, uniquement de la
 * composition de texte à partir du sujet, du plan DNA et des candidats de
 * maillage interne déjà résolus par l'appelant.
 */

import { buildPromptFragments, type EditorialDna } from "../dna/compose";

export interface PromptTopicInput {
  keyword: string;
  secondaryKeywords: string[];
  cluster: string;
  contentType: string;
  naturodeskContext: string;
}

export interface LinkCandidate {
  slug: string;
  title: string;
}

/**
 * Mots par section, selon la profondeur. La longueur totale visée (dna.wordTarget)
 * ne peut être atteinte que si le contenu des sections — le plus gros contributeur
 * au décompte — est dimensionné en conséquence ; une fourchette fixe (ex: 120-200
 * mots quelle que soit la profondeur) ne suffit mathématiquement jamais à atteindre
 * 1400+ mots avec 4-5 sections, et le modèle a systématiquement sous-produit dans
 * ce cas (observé ~900 mots au lieu de 1400 visés sur plusieurs générations réelles).
 */
export const SECTION_WORD_RANGE: Record<EditorialDna["depth"], [number, number]> = {
  COURTE: [100, 170],
  MOYENNE: [170, 240],
  LONGUE: [260, 360],
  APPROFONDIE: [300, 420],
};

export function buildSystemPrompt(dna: EditorialDna): string {
  const { toneInstruction, structureInstruction, blockInstructions } = buildPromptFragments(dna);
  const blocksPromptList = blockInstructions.map((b, i) => `${i + 1}. [${b.type}] ${b.instruction}`).join("\n");
  const [sectionMin, sectionMax] = SECTION_WORD_RANGE[dna.depth];

  return `Tu es un rédacteur pour le blog business de NaturoDesk, un SaaS de gestion de cabinet pour naturopathes (agenda, dossiers patients, facturation, page web professionnelle, bilans de vitalité).
Le blog s'adresse aux naturopathes qui veulent lancer ou développer leur activité — pas à leurs patients. Aucun contenu clinique/thérapeutique : uniquement du business, de l'organisation, de la réglementation du métier et de la gestion de cabinet.

RÈGLES ABSOLUES DE LANGAGE :
- Interdit : "garanti", "résultats garantis", "infaillible", "en 2 semaines", "doublez vos revenus"
- Interdit (réglementaire — la naturopathie n'est pas une profession médicale réglementée en France) : affirmer "guérir"/"soigner un patient"/"traiter une maladie"/"poser un diagnostic"/"remède miracle" — y compris dans les exemples fictifs. Le mot "diagnostic" reste autorisé au sens équipement/matériel (ex : "matériel de diagnostic").
- Obligatoire : "peut contribuer à", "dans certains cas", "observé généralement", "selon la situation"
- Chaque affirmation chiffrée doit être présentée comme une estimation
- Tout exemple ou témoignage de naturopathe est TOUJOURS fictif/anonymisé, jamais un cas réel identifiable

VOIX DE CET ARTICLE (à respecter pour tout le texte) :
${toneInstruction}

STRUCTURE DE CET ARTICLE :
${structureInstruction}
- quickAnswer : 40-80 mots MAXIMUM, répond directement au mot-clé, commence par le sujet. Pensé pour être cité par les IA génératives (ChatGPT, Perplexity, AI Overviews).
- definition : 1-2 phrases. Format obligatoire : "[Terme principal] est..." ou "On appelle [terme]...". Citable directement par un moteur IA.
- intro : 150-200 mots. Accroche → problématique du naturopathe → ce que l'article apporte.
- sections : ${dna.sectionRange[0]}-${dna.sectionRange[1]} sections H2, ${sectionMin}-${sectionMax} mots CHACUNE (développe pleinement : arguments, exemples, nuances — ne reste pas superficiel). Au moins un titre H2 formulé comme une question (ex : "Comment fixer ses tarifs de consultation ?").
- Chaque section peut avoir une liste ("list") si cela sert le propos — en structure linéaire/narrative, plusieurs sections peuvent rester en texte continu sans liste.
- naturodeskContext : 80-120 mots. Explique concrètement comment NaturoDesk aide sur ce sujet précis. Mention explicite obligatoire du mot "NaturoDesk". Jamais un ton publicitaire appuyé — reste factuel et utile.
- longueur totale visée : ${dna.wordTarget[0]}-${dna.wordTarget[1]} mots — CONTRAINTE DURE, pas une suggestion. C'est presque exclusivement la longueur des sections qui permet de l'atteindre : ne les raccourcis jamais en dessous de ${sectionMin} mots.
- conclusion : 80-120 mots

BLOCS ADDITIONNELS DE CET ARTICLE — exactement ces ${blockInstructions.length} bloc(s), dans cet ordre, aucun autre :
${blocksPromptList}

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises de code.`;
}

export function buildUserPrompt(topic: PromptTopicInput, dna: EditorialDna, linkCandidates: LinkCandidate[]): string {
  const { blockInstructions } = buildPromptFragments(dna);
  const blocksSchemaExample = blockInstructions.map((b) => `      ${b.schema}`).join(",\n");
  const [sectionMin, sectionMax] = SECTION_WORD_RANGE[dna.depth];
  const linksLine =
    linkCandidates.length > 0
      ? linkCandidates.map((l) => `${l.title} (${l.slug})`).join(", ")
      : "aucun article lié disponible pour l'instant";

  return `Génère un article de blog business pour naturopathes sur le sujet :

Sujet : ${topic.keyword}
Mots-clés secondaires : ${topic.secondaryKeywords.join(", ") || "aucun"}
Cluster : ${topic.cluster}
Type : ${topic.contentType}
Contexte NaturoDesk : ${topic.naturodeskContext}
Articles liés à mentionner naturellement si pertinent : ${linksLine}

STRUCTURE JSON EXACTE :
{
  "title": "Titre, mot-clé en début, max 70 caractères",
  "metaTitle": "Meta title max 60 caractères",
  "metaDescription": "140-165 caractères, bénéfice clair pour le naturopathe",
  "quickAnswer": "40-80 MOTS MAX. Réponse directe commençant par le mot-clé.",
  "definition": "[Terme principal] est... (1-2 phrases, format définition, citable par une IA)",
  "intro": "150-200 mots. Accroche → problème du naturopathe → ce que l'article apporte.",
  "sections": [
    { "title": "H2 question ou variante du mot-clé", "body": "${sectionMin}-${sectionMax} mots — développé, pas superficiel.", "list": ["item 1 (optionnel selon la structure)", "item 2"] }
  ],
  "naturodeskContext": "80-120 mots. Doit citer littéralement 'NaturoDesk'.",
  "blocks": [
${blocksSchemaExample}
  ],
  "conclusion": "80-120 mots. Synthèse + perspective."
}

${dna.sectionRange[0]}-${dna.sectionRange[1]} sections, ${sectionMin}-${sectionMax} mots chacune. Longueur totale visée : ${dna.wordTarget[0]}-${dna.wordTarget[1]} mots — vérifie mentalement cette somme avant de répondre, et étoffe les sections si tu es en dessous.
Le tableau "blocks" doit contenir EXACTEMENT ${blockInstructions.length} objet(s), dans l'ordre indiqué ci-dessus (${dna.blocks.join(" → ")}), chacun avec son champ "type" et les champs de son schéma.`;
}
