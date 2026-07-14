/**
 * Diversity Governor — résolveur d'axe déterministe générique.
 *
 * Porté depuis scripts/lib/diversity-governor.mjs (SelfHook). Utilisé par chaque
 * axe de l'Editorial DNA (ton, profondeur, structure, blocs, famille visuelle...) :
 * étant donné des candidats pondérés (affinité au sujet) et un historique récent
 * des valeurs choisies pour ce même axe, choisit le candidat au meilleur score
 * affinité-ajustée-de-la-récence. Pas de hasard pur — le même sujet se résout
 * toujours au même classement avant application de la pénalité de récence, donc
 * la diversité vient du sujet et de l'historique glissant, pas de la chance.
 */

import { createHash } from "crypto";

/** Flottant pseudo-aléatoire déterministe dans [0, 1), dérivé d'une chaîne — stable entre les runs. */
export function stableSeed(value: string): number {
  const hash = createHash("sha256").update(value).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

export interface PickOneOptions {
  /** Nombre d'entrées récentes de l'historique prises en compte. */
  recentWindow?: number;
  /** Force de la pénalité de récence (0-1). */
  penaltyStrength?: number;
  /** Valeurs à exclure entièrement du tirage. */
  exclude?: Set<string>;
}

/**
 * Choisit une valeur parmi des candidats pondérés, en pénalisant les valeurs
 * apparues souvent dans l'historique récent et en départageant les ex-æquo par
 * un jitter déterministe propre au sujet.
 */
export function pickOne<K extends string>(
  candidates: Partial<Record<K, number>>,
  history: string[] = [],
  seedKey = "",
  opts: PickOneOptions = {}
): K | null {
  const { recentWindow = 6, penaltyStrength = 0.6, exclude } = opts;
  const entries = (Object.entries(candidates) as [K, number | undefined][]).filter(
    ([value, weight]) => (weight ?? 0) > 0 && !(exclude && exclude.has(value))
  );
  if (entries.length === 0) return null;

  const recent = history.slice(-recentWindow);
  const freq = new Map<string, number>();
  for (const v of recent) freq.set(v, (freq.get(v) ?? 0) + 1);

  const scored = entries.map(([value, weight]) => {
    const recentShare = recentWindow > 0 ? (freq.get(value) ?? 0) / recentWindow : 0;
    const penalty = Math.max(0.05, 1 - penaltyStrength * recentShare);
    const jitter = stableSeed(`${seedKey}::${value}`) * 0.2;
    return { value, score: (weight ?? 0) * penalty + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.value;
}

export interface PickManyOptions extends PickOneOptions {
  /** Valeurs bannies d'office (ex : tout ce qui a été utilisé dans l'article précédent). */
  hardExclude?: Set<string>;
}

/**
 * Choisit jusqu'à `count` valeurs distinctes, en appliquant pickOne en boucle
 * et en excluant les valeurs déjà choisies pour cet article.
 */
export function pickMany<K extends string>(
  candidates: Partial<Record<K, number>>,
  history: string[] = [],
  seedKey = "",
  count = 1,
  opts: PickManyOptions = {}
): K[] {
  const { hardExclude, ...rest } = opts;
  const chosen: K[] = [];
  const exclude = new Set<string>(hardExclude ?? []);
  for (let i = 0; i < count; i++) {
    let value = pickOne(candidates, history, `${seedKey}::slot${i}`, { ...rest, exclude });
    if (value === null && exclude.size > 0) {
      // Tous les candidats sont hard-exclus (pool trop petit) — on relâche
      // l'exclusion dure plutôt que de renvoyer moins de valeurs que demandé.
      value = pickOne(candidates, history, `${seedKey}::slot${i}`, { ...rest, exclude: new Set() });
    }
    if (value === null) break;
    chosen.push(value);
    exclude.add(value);
  }
  return chosen;
}

/**
 * Choisit une valeur dans une petite plage ordonnée (ex : nombre d'images),
 * biaisée contre ce qui a été choisi le plus récemment.
 */
export function pickFromRange(minMax: [number, number], history: number[] = [], seedKey = ""): number {
  const [min, max] = minMax;
  const candidates: Record<string, number> = {};
  for (let v = min; v <= max; v++) candidates[String(v)] = 1;
  const picked = pickOne(candidates, history.map(String), seedKey, { recentWindow: 5, penaltyStrength: 0.7 });
  return picked === null ? min : parseInt(picked, 10);
}
