/**
 * Rate limiter in-memory simple — suffisant pour V1 serveur unique.
 * Clé : typiquement l'IP du client + le type d'action.
 * Retourne true si la requête est autorisée, false si bloquée.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
