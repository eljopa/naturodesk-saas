// ---------------------------------------------------------------------------
// Format interne — indépendant de la structure brute renvoyée par Google.
// ---------------------------------------------------------------------------

export interface GoogleReview {
  id: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  publishTime: string | null;
  authorProfileUrl: string | null;
}

export interface GoogleBusinessReviews {
  businessName: string;
  averageRating: number;
  totalReviewCount: number;
  googleMapsUrl: string;
  reviews: GoogleReview[];
}

/**
 * Résultat de la récupération des avis — distingue les trois états gérés
 * par la section d'affichage :
 * - "ok"            → données disponibles, on affiche la section complète.
 * - "unavailable"    → un Place ID est configuré mais Google est injoignable
 *                      (clé API manquante, quota dépassé, erreur réseau…) :
 *                      on affiche un fallback discret plutôt que rien.
 * - "not_configured" → aucun Place ID renseigné par le praticien : la
 *                      section ne doit pas s'afficher du tout.
 */
export type GoogleReviewsResult =
  | { status: "ok"; data: GoogleBusinessReviews }
  | { status: "unavailable"; fallbackUrl: string | null }
  | { status: "not_configured" };
