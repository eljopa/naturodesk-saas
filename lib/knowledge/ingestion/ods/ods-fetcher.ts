/**
 * Fetcher HTTP pour les fiches ODS (NIH Office of Dietary Supplements).
 *
 * Construit l'URL HealthProfessional à partir du odsId,
 * effectue une requête GET avec timeout et User-Agent approprié,
 * et retourne le HTML brut.
 *
 * Respecte la politique d'accès ODS :
 * - User-Agent identifié (éducation santé, usage non commercial)
 * - Délai entre requêtes via sleepBetweenRequests()
 * - Timeout de 15 s pour éviter les blocages silencieux
 */

const ODS_BASE_URL = "https://ods.od.nih.gov/factsheets";

/**
 * User-Agent décrivant notre bot.
 * ODS n'impose pas de restrictions sur les bots identifiés,
 * mais recommande de ne pas saturer leurs serveurs.
 */
const USER_AGENT =
  "NaturoDesk-KnowledgeBot/1.0 (health professional education tool; non-commercial; contact@naturodesk.fr)";

/** Timeout par requête en millisecondes. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Délai inter-requêtes pour respecter les serveurs ODS.
 * 600 ms → max ~100 requêtes/minute, très en-dessous des seuils ODS.
 */
const RATE_LIMIT_DELAY_MS = 600;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Télécharge la fiche HealthProfessional ODS pour un ingrédient donné.
 *
 * @param odsId  Slug ODS, ex: "Magnesium", "VitaminD", "CoQ10"
 * @returns      HTML brut de la page
 * @throws       Error si le serveur répond avec un statut non-2xx ou si timeout
 */
export async function fetchOdsFactSheet(odsId: string): Promise<string> {
  const url = buildOdsUrl(odsId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `[ods-fetcher] HTTP ${response.status} ${response.statusText} — ${url}`
      );
    }

    return await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`[ods-fetcher] Timeout (>${REQUEST_TIMEOUT_MS}ms) — ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pause inter-requêtes — à appeler entre chaque fetchOdsFactSheet()
 * dans une boucle batch.
 */
export function buildOdsUrl(odsId: string): string {
  return `${ODS_BASE_URL}/${odsId}-HealthProfessional/`;
}

export async function sleepBetweenRequests(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
}
