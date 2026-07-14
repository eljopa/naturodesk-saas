/**
 * Garde-fous de langage — porté depuis LANGUAGE_CONFIG de scripts/blog-auto-publish.mjs
 * (SelfHook), complété par un garde-fou réglementaire/déontologique propre à la
 * naturopathie (spec §5.6) : la naturopathie n'étant pas une profession médicale
 * réglementée en France, tout contenu généré doit bannir le vocabulaire médical
 * ("guérit", "soigne", "traite", "diagnostic"...).
 *
 * Deux mécanismes distincts :
 *   - REPLACEMENTS : formulations marketing auto-remplacées avant validation
 *     (silencieux, non bloquant).
 *   - FORBIDDEN : termes qui bloquent la publication même après remplacement —
 *     regroupe le marketing non-corrigible automatiquement ET tout le
 *     vocabulaire médical proscrit (jamais auto-remplacé : un remplacement
 *     automatique d'un terme médical serait risqué à valider sans relecture).
 */

export const FORBIDDEN_TERMS: string[] = [
  // ── Marketing non corrigible automatiquement ────────────────────────────────
  "en 2 semaines",
  "en deux semaines",
  "forcément",
  "infaillible",
  "sans aucun doute",
  "jamais vu",
  "résultats garantis",
  "succès garanti",
  "doublez vos revenus",
  // ── Vocabulaire médical proscrit (naturopathie non réglementée en France) ───
  "guérit",
  "guérir",
  "guérison garantie",
  "soigne",
  "soigner",
  "traite",
  "traiter la maladie",
  "diagnostic",
  "diagnostique",
  "prescription médicale",
  "remède miracle",
];

interface LanguageReplacement {
  pattern: RegExp;
  neutral: string;
  label: string;
}

export const LANGUAGE_REPLACEMENTS: LanguageReplacement[] = [
  { pattern: /\btoujours cité(e?s?)\b/gi, neutral: "fréquemment cité$1", label: "toujours cité" },
  { pattern: /\bgaranti(e?s?)\b/gi, neutral: "recommandé$1", label: "garanti" },
  { pattern: /\brévolutionnaire(s?)\b/gi, neutral: "innovant$1", label: "révolutionnaire" },
  { pattern: /\bmeilleur(e?s?)\b/gi, neutral: "efficace", label: "meilleur" },
  { pattern: /\bunique(s?)\b(?!ment)/gi, neutral: "adapté$1", label: "unique" },
  { pattern: /\bimbattable(s?)\b/gi, neutral: "compétitif$1", label: "imbattable" },
  { pattern: /\bsans aucun effort\b/gi, neutral: "avec peu de friction", label: "sans aucun effort" },
  { pattern: /\bsans effort\b/gi, neutral: "de façon simplifiée", label: "sans effort" },
];

export interface ReplacementLogEntry {
  label: string;
  original: string;
  neutral: string;
  context: string;
}

/** Extrait ~radius caractères autour de l'index, avec des marqueurs d'ellipse. */
function extractContext(text: string, index: number, radius = 90): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** Parcourt toutes les feuilles textuelles d'un objet, renvoie [{field, text}]. */
export function getAllTextFields(obj: unknown, prefix = ""): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  if (!obj || typeof obj !== "object") return out;
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") {
      out.push({ field, text: val });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        const f = `${field}[${i}]`;
        if (typeof item === "string") out.push({ field: f, text: item });
        else out.push(...getAllTextFields(item, f));
      });
    } else if (val && typeof val === "object") {
      out.push(...getAllTextFields(val, field));
    }
  }
  return out;
}

function cleanText(text: string, log: ReplacementLogEntry[]): string {
  let result = text;
  for (const { pattern, neutral, label } of LANGUAGE_REPLACEMENTS) {
    pattern.lastIndex = 0;
    const matches = [...result.matchAll(pattern)];
    if (matches.length === 0) continue;
    for (const m of matches) {
      const ctx = extractContext(result, m.index ?? 0, 80);
      log.push({ label, original: m[0], neutral: m[0].replace(pattern, neutral), context: ctx });
    }
    result = result.replace(pattern, neutral);
  }
  return result;
}

function walkAndClean<T>(value: T, log: ReplacementLogEntry[]): T {
  if (typeof value === "string") return cleanText(value, log) as unknown as T;
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => walkAndClean(item, log)) as unknown as T;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walkAndClean(v, log)])
  ) as unknown as T;
}

/** Remplace automatiquement les formulations marketing dans tous les champs texte du contenu. */
export function applyReplacements<T>(content: T): { content: T; log: ReplacementLogEntry[] } {
  const log: ReplacementLogEntry[] = [];
  const cleaned = walkAndClean(content, log);
  return { content: cleaned, log };
}

export interface ForbiddenTermHit {
  term: string;
  field: string;
  context: string;
}

/** Détecte les termes interdits (marketing non-corrigible + vocabulaire médical) après nettoyage. */
export function findForbiddenTerms(content: unknown): ForbiddenTermHit[] {
  const hits: ForbiddenTermHit[] = [];
  const fields = getAllTextFields(content);
  for (const term of FORBIDDEN_TERMS) {
    for (const { field, text } of fields) {
      const idx = text.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1) {
        hits.push({ term, field, context: extractContext(text, idx, 90) });
        break; // un hit par terme suffit pour bloquer
      }
    }
  }
  return hits;
}
