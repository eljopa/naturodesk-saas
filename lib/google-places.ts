import type {
  GoogleBusinessReviews,
  GoogleReview,
  GoogleReviewsResult,
} from "@/types/google-reviews";

// ---------------------------------------------------------------------------
// Google Places API (New) — appel serveur exclusivement.
// La clé GOOGLE_PLACES_API_KEY ne doit jamais transiter vers le client :
// ce module n'est importé que depuis des Server Components / Server Actions.
// ---------------------------------------------------------------------------

const PLACES_API_BASE = "https://places.googleapis.com/v1/places";
const FIELD_MASK = "displayName,rating,userRatingCount,reviews,googleMapsUri";

const MIN_REVIEW_RATING = 4;
const MAX_REVIEWS_DISPLAYED = 5;
const REVALIDATE_SECONDS = 60 * 60 * 24; // ~24h — un appel Google par jour et par fiche

// ---------------------------------------------------------------------------
// Forme brute de la réponse Google (uniquement les champs demandés via le
// FieldMask ci-dessus — le reste de la ressource Place n'est pas typé ici).
// ---------------------------------------------------------------------------

interface RawGoogleReview {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
}

interface RawGooglePlace {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: RawGoogleReview[];
}

function buildFallbackMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

/**
 * Récupère et normalise les avis Google d'un établissement.
 * Ne lève jamais d'exception : toute erreur est journalisée côté serveur et
 * traduite en un statut exploitable sans planter la page appelante.
 */
export async function getGoogleBusinessReviews(
  placeId: string | null | undefined
): Promise<GoogleReviewsResult> {
  if (!placeId) return { status: "not_configured" };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("[google-places] GOOGLE_PLACES_API_KEY manquante — impossible de récupérer les avis Google");
    return { status: "unavailable", fallbackUrl: buildFallbackMapsUrl(placeId) };
  }

  let response: Response;
  try {
    response = await fetch(`${PLACES_API_BASE}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      // Revalidation ~24h — évite de solliciter Google à chaque affichage de page.
      next: { revalidate: REVALIDATE_SECONDS, tags: [`google-reviews:${placeId}`] },
    });
  } catch (err) {
    console.error("[google-places] Erreur réseau lors de l'appel à Google Places API", err);
    return { status: "unavailable", fallbackUrl: buildFallbackMapsUrl(placeId) };
  }

  if (!response.ok) {
    // Quota dépassé, clé invalide, Place ID introuvable, etc. — jamais la clé
    // ni le corps de la réponse ne sont journalisés, seulement le statut.
    console.error(`[google-places] Réponse non OK de Google Places API (HTTP ${response.status}) pour un Place ID configuré`);
    return { status: "unavailable", fallbackUrl: buildFallbackMapsUrl(placeId) };
  }

  let raw: RawGooglePlace;
  try {
    raw = await response.json();
  } catch (err) {
    console.error("[google-places] Réponse Google Places API illisible (JSON invalide)", err);
    return { status: "unavailable", fallbackUrl: buildFallbackMapsUrl(placeId) };
  }

  return { status: "ok", data: normalize(raw, placeId) };
}

// ---------------------------------------------------------------------------
// Normalisation — sélection (V1) : avis avec texte, note 4-5, dans l'ordre
// fourni par Google, limités à MAX_REVIEWS_DISPLAYED. Aucun contenu n'est
// inventé, modifié ou traduit.
// ---------------------------------------------------------------------------

// Google traduit `text` selon la langue déduite de la requête ; `originalText`
// porte le commentaire tel qu'écrit par l'auteur. On privilégie toujours ce
// dernier — jamais de traduction automatique de notre côté.
function getReviewText(r: RawGoogleReview): string {
  return r.originalText?.text?.trim() || r.text?.text?.trim() || "";
}

function normalize(raw: RawGooglePlace, placeId: string): GoogleBusinessReviews {
  const reviews: GoogleReview[] = (raw.reviews ?? [])
    .filter((r) => Boolean(getReviewText(r)))
    .filter((r) => (r.rating ?? 0) >= MIN_REVIEW_RATING)
    .slice(0, MAX_REVIEWS_DISPLAYED)
    .map((r, index) => ({
      id: r.name ?? `${placeId}-review-${index}`,
      authorName: r.authorAttribution?.displayName?.trim() || "Client Google",
      authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
      rating: r.rating ?? 0,
      text: getReviewText(r),
      relativeTime: r.relativePublishTimeDescription ?? null,
      publishTime: r.publishTime ?? null,
      authorProfileUrl: r.authorAttribution?.uri ?? null,
    }));

  return {
    businessName: raw.displayName?.text ?? "",
    averageRating: raw.rating ?? 0,
    totalReviewCount: raw.userRatingCount ?? 0,
    googleMapsUrl: raw.googleMapsUri ?? buildFallbackMapsUrl(placeId),
    reviews,
  };
}
