import { Star, ExternalLink } from "lucide-react";
import type { ThemeConfig } from "@/lib/webpage-themes";
import type { GoogleReview, GoogleReviewsResult } from "@/types/google-reviews";

// ---------------------------------------------------------------------------
// Section "avis Google" — page publique praticien (app/p/[slug]).
// Rendu défensif : n'importe quel état de `result` (voir types/google-reviews)
// produit un affichage propre, jamais une page cassée.
// ---------------------------------------------------------------------------

const REVIEW_TRUNCATE_AT = 260;

function isSafeExternalUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

// ---------------------------------------------------------------------------
// Étoiles — libellé accessible, jamais uniquement porté par la couleur.
// ---------------------------------------------------------------------------

function StarRating({ rating, size = 15 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`Note de ${rounded} étoile${rounded > 1 ? "s" : ""} sur 5`}
      style={{ display: "inline-flex", gap: 2 }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          width={size}
          height={size}
          style={{ flexShrink: 0 }}
          fill={i < rounded ? "#E8A33D" : "none"}
          stroke={i < rounded ? "#E8A33D" : "#C9CFC7"}
          strokeWidth={1.7}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar auteur — photo Google si disponible, sinon initiale de repli.
// Purement décoratif : le nom est déjà affiché en texte à côté.
// ---------------------------------------------------------------------------

function AuthorAvatar({ review, accentHex }: { review: GoogleReview; accentHex: string }) {
  const size = 42;
  if (isSafeExternalUrl(review.authorPhotoUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={review.authorPhotoUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${accentHex}22`, color: accentHex,
        fontWeight: 700, fontSize: 16, fontFamily: "var(--font-spectral), Georgia, serif",
      }}
    >
      {review.authorName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Carte d'avis
// ---------------------------------------------------------------------------

function ReviewCard({ review, theme }: { review: GoogleReview; theme: ThemeConfig }) {
  const isLong = review.text.length > REVIEW_TRUNCATE_AT;
  const shortText = isLong ? review.text.slice(0, REVIEW_TRUNCATE_AT).trimEnd() : review.text;
  const rest = isLong ? review.text.slice(REVIEW_TRUNCATE_AT) : "";

  const authorNameStyle: React.CSSProperties = {
    display: "block", fontWeight: 600, fontSize: "14.5px", color: "#223023",
    textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  };

  return (
    <figure
      style={{
        margin: 0,
        background: "#fff",
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: "18px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 1px 3px rgba(60,77,62,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <AuthorAvatar review={review} accentHex={theme.accentHex} />
        <div style={{ minWidth: 0 }}>
          {isSafeExternalUrl(review.authorProfileUrl) ? (
            <a
              href={review.authorProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={authorNameStyle}
            >
              {review.authorName}
            </a>
          ) : (
            <span style={authorNameStyle}>{review.authorName}</span>
          )}
          {review.relativeTime && (
            <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>{review.relativeTime}</span>
          )}
        </div>
      </div>

      <StarRating rating={review.rating} />

      <blockquote style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.65, color: "#3f4a3f" }}>
        {shortText}
        {isLong && (
          <details style={{ display: "inline" }}>
            <summary
              style={{
                display: "inline", cursor: "pointer", listStyle: "none",
                color: theme.accentDarkHex, fontWeight: 600, marginLeft: 4,
              }}
            >
              Lire la suite
            </summary>
            {rest}
          </details>
        )}
      </blockquote>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Fallback discret — Google momentanément indisponible mais un Place ID
// est bien configuré.
// ---------------------------------------------------------------------------

function UnavailableFallback({ fallbackUrl }: { fallbackUrl: string | null }) {
  return (
    <section style={{ width: "100%", background: "#FAFAF8" }}>
      <div style={{
        maxWidth: "1180px", margin: "0 auto", padding: "clamp(32px,5vw,48px) clamp(24px,5vw,56px)",
        textAlign: "center",
      }}>
        <p style={{ margin: "0 0 14px", fontSize: "14.5px", color: "#64748b" }}>
          Consultez les avis de nos clients directement sur Google.
        </p>
        {isSafeExternalUrl(fallbackUrl) && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              border: "1px solid #E6EAE2", borderRadius: "999px", padding: "10px 20px",
              textDecoration: "none", color: "#3f4a3f", fontWeight: 600, fontSize: "14px",
            }}
          >
            Voir les avis sur Google
            <ExternalLink width={15} height={15} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section principale
// ---------------------------------------------------------------------------

export function GoogleReviewsSection({
  result, theme,
}: {
  result: GoogleReviewsResult;
  theme: ThemeConfig;
}) {
  if (result.status === "not_configured") return null;
  if (result.status === "unavailable") return <UnavailableFallback fallbackUrl={result.fallbackUrl} />;

  const { data } = result;
  const hasRating = data.totalReviewCount > 0;
  const mapsUrl = isSafeExternalUrl(data.googleMapsUrl) ? data.googleMapsUrl : null;

  return (
    <section style={{ width: "100%", background: "#FAFAF8" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,8vw,88px) clamp(24px,5vw,56px)" }}>
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.labelColor }}>
              Avis Google
            </span>
            <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
          </div>
          <h2 style={{
            fontFamily: "var(--font-spectral), Georgia, serif",
            fontWeight: 500,
            fontSize: "clamp(24px,4vw,38px)",
            margin: "0 0 14px",
            color: "#1f2a20",
          }}>
            Ils nous font confiance
          </h2>
          {hasRating && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <StarRating rating={data.averageRating} size={17} />
              <span style={{ fontSize: "15px", color: "#3f4a3f", fontWeight: 600 }}>
                {data.averageRating.toFixed(1).replace(".", ",")}/5 sur Google — {data.totalReviewCount} avis
              </span>
            </div>
          )}
        </div>

        {data.reviews.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: "20px", marginBottom: "40px" }}
          >
            {data.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} theme={theme} />
            ))}
          </div>
        )}

        {mapsUrl && (
          <div style={{ textAlign: "center" }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "9px",
                background: theme.accentHex, color: "#fff", fontWeight: 600, fontSize: "14.5px",
                padding: "12px 24px", borderRadius: "999px", textDecoration: "none",
                boxShadow: `0 6px 16px ${theme.accentHex}40`,
              }}
            >
              Voir tous les avis sur Google
              <ExternalLink width={16} height={16} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
