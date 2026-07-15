import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Spectral } from "next/font/google";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  Clock,
  CalendarDays,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTheme, HERO_IMAGES } from "@/lib/webpage-themes";
import { isScheduleConfigured, type WeekSchedule } from "@/lib/public/slots";
import { ContactForm } from "./_components/contact-form";
import { BookingWidget } from "./_components/booking-widget";

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

// ---------------------------------------------------------------------------
// Grain SVG (texture subtile sur hero + section coords)
// ---------------------------------------------------------------------------

const GRAIN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

// ---------------------------------------------------------------------------
// Metadata dynamique + OpenGraph
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const page = await db.therapistWebPage.findUnique({
    where: { slug },
    select: {
      seoTitle: true,
      seoDescription: true,
      logoUrl: true,
      isPublished: true,
      user: { select: { name: true, cabinetName: true } },
    },
  });

  if (!page?.isPublished) return {};

  const displayName = page.user.cabinetName ?? page.user.name;
  const title       = page.seoTitle ?? `${displayName} — Naturopathe`;
  const description = page.seoDescription ?? `Page professionnelle de ${displayName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(page.logoUrl ? { images: [{ url: page.logoUrl }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Schema.org JSON-LD
// ---------------------------------------------------------------------------

function SchemaLD({
  name, description, address, phone, email, url,
}: {
  name: string; description?: string | null; address?: string | null;
  phone?: string | null; email?: string | null; url: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "MedicalBusiness"],
    name, url,
    ...(description ? { description } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default async function PublicTherapistPage({ params, searchParams }: PageProps) {
  const { slug }    = await params;
  const { preview } = await searchParams;

  const page = await db.therapistWebPage.findUnique({
    where: { slug },
    select: {
      userId: true,
      isPublished: true,
      heroThemeId: true,
      heroImageId: true,
      logoUrl: true,
      bio: true,
      presentation: true,
      address: true,
      phone: true,
      contactEmail: true,
      socialLinks: true,
      seoTitle: true,
      seoDescription: true,
      contactFormEnabled: true,
      appointmentEnabled: true,
      user: { select: { name: true, cabinetName: true } },
    },
  });

  if (!page) notFound();

  if (!page.isPublished) {
    if (preview !== "1") notFound();

    const viewer = await getCurrentUser();
    const canPreview =
      viewer?.id === page.userId ||
      viewer?.role === "ADMIN" ||
      viewer?.role === "SUPER_ADMIN";

    if (!canPreview) notFound();
  }

  const [services, scheduleRow, infoSections] = await Promise.all([
    db.serviceOffering.findMany({
      where: { userId: page.userId, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, durationMinutes: true, price: true, description: true },
    }),
    db.practitionerSchedule.findUnique({
      where: { userId: page.userId },
      select: { scheduleJson: true, timezone: true },
    }),
    db.webPageInfoSection.findMany({
      where: { userId: page.userId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, description: true },
    }),
  ]);

  const theme       = getTheme(page.heroThemeId);
  const heroImg     = HERO_IMAGES.find((i) => i.id === page.heroImageId);
  const heroPhotoBg = heroImg?.gradient ?? theme.heroGradient;

  const displayName = page.user.cabinetName ?? page.user.name;
  const socialLinks = (page.socialLinks ?? {}) as Record<string, string>;
  const hasSocial   = Object.keys(socialLinks).length > 0;
  const hasContact  = page.address || page.phone || page.contactEmail;
  const hasAbout    = page.bio || page.presentation;

  const scheduleConfigured =
    scheduleRow != null &&
    isScheduleConfigured(scheduleRow.scheduleJson as WeekSchedule);

  const showBooking = page.appointmentEnabled && services.length > 0 && scheduleConfigured;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pageUrl = `${baseUrl}/p/${slug}`;

  // Gradient décoratif pour le panneau gauche "Qui suis-je"
  const decoGradient = heroImg?.gradient ?? `linear-gradient(155deg, ${theme.accentHex}cc 0%, ${theme.accentDarkHex}ee 100%)`;

  return (
    <>
      <SchemaLD
        name={displayName}
        description={page.seoDescription ?? page.bio}
        address={page.address}
        phone={page.phone}
        email={page.contactEmail}
        url={pageUrl}
      />

      {/* Bandeau aperçu */}
      {preview === "1" && !page.isPublished && (
        <div className="sticky top-0 z-50 bg-amber-400 text-amber-900 text-center text-sm py-2 font-medium">
          Aperçu — cette page n&apos;est pas encore publiée
        </div>
      )}

      <div
        className={spectral.variable}
        style={{
          minHeight: "100vh",
          background: "#FAFAF8",
          color: "#0f172a",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          WebkitFontSmoothing: "antialiased",
          lineHeight: 1.5,
        }}
      >

        {/* ═══════════════════════════════════════════════════
            1. HERO
        ════════════════════════════════════════════════════ */}
        <section style={{ position: "relative", width: "100%", height: "380px", overflow: "hidden" }}>
          {/* Photo layer */}
          <div style={{ position: "absolute", inset: 0, background: heroPhotoBg }} />
          {/* Grain texture */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.10,
            mixBlendMode: "overlay" as const, backgroundImage: GRAIN,
          }} />
          {/* Sage/thème color overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(125deg, ${theme.overlayColor} 0%, ${theme.overlayColor.replace(/[\d.]+\)$/, "0.66)")} 55%, ${theme.overlayColor.replace(/[\d.]+\)$/, "0.74)")} 100%)`,
          }} />
          {/* Content */}
          <div className="relative h-full px-6 lg:px-14 flex flex-col justify-center"
            style={{ maxWidth: "1180px", margin: "0 auto" }}>
            {/* Logo / cabinet nom en haut */}
            {page.logoUrl && (
              <div className="absolute top-8 left-6 lg:left-14 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.logoUrl}
                  alt={displayName}
                  className="h-12 w-auto rounded-xl object-contain shadow-lg"
                  style={{ background: "rgba(255,255,255,0.92)" }}
                />
              </div>
            )}
            <h1
              style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontWeight: 500,
                fontSize: "clamp(32px, 5vw, 52px)",
                lineHeight: 1.08,
                color: "#ffffff",
                margin: 0,
                maxWidth: "680px",
                textShadow: "0 2px 18px rgba(0,0,0,0.18)",
              }}
            >
              {displayName}
            </h1>
            {page.bio && (
              <p style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.92)",
                fontSize: "18px",
                fontWeight: 500,
                letterSpacing: "0.01em",
                maxWidth: "560px",
              }}>
                {page.bio}
              </p>
            )}
            {page.appointmentEnabled && (
              <div style={{ marginTop: "26px" }}>
                <a
                  href="#rdv"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "9px",
                    background: "#ffffff",
                    color: theme.accentDarkHex,
                    fontWeight: 600,
                    fontSize: "15px",
                    padding: "13px 22px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    boxShadow: "0 8px 22px rgba(0,0,0,0.20)",
                  }}
                >
                  <CalendarDays style={{ width: 18, height: 18 }} />
                  Prendre rendez-vous
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            2. QUI SUIS-JE
        ════════════════════════════════════════════════════ */}
        {(hasAbout || preview === "1") && (
          <section style={{ width: "100%", background: theme.lightBg }}>
            <div
              className="grid grid-cols-1 lg:grid-cols-[0.82fr_1fr] gap-12 lg:gap-14 items-center"
              style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,8vw,88px) clamp(24px,5vw,56px)" }}
            >
              {/* Panneau décoratif gauche */}
              <div style={{
                position: "relative",
                height: "420px",
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: `0 18px 40px ${theme.accentDarkHex}28`,
              }}>
                <div style={{ position: "absolute", inset: 0, background: decoGradient }} />
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.10,
                  mixBlendMode: "overlay" as const, backgroundImage: GRAIN,
                }} />
              </div>
              {/* Texte droite */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "22px" }}>
                  <span style={{ width: "40px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.labelColor }}>
                    Mon approche
                  </span>
                </div>
                <h2 style={{
                  fontFamily: "var(--font-spectral), Georgia, serif",
                  fontWeight: 500,
                  fontSize: "clamp(26px,4vw,38px)",
                  lineHeight: 1.12,
                  margin: "0 0 24px",
                  color: "#1f2a20",
                }}>
                  Qui suis-je
                </h2>
                {page.presentation ? (
                  <div style={{ fontSize: "17px", lineHeight: 1.8, color: "#3f4a3f", whiteSpace: "pre-wrap" }}>
                    {page.presentation}
                  </div>
                ) : page.bio ? (
                  <p style={{ margin: 0, fontSize: "17px", lineHeight: 1.8, color: "#3f4a3f" }}>
                    {page.bio}
                  </p>
                ) : (
                  <p style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "14px" }}>
                    [Aperçu — votre présentation apparaîtra ici après enregistrement]
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            3. SPÉCIALITÉS & APPROCHES (info sections)
        ════════════════════════════════════════════════════ */}
        {infoSections.length > 0 && (
          <section style={{ width: "100%", background: "#FAFAF8" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,8vw,88px) clamp(24px,5vw,56px)" }}>
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.labelColor }}>
                    Mon expertise
                  </span>
                  <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
                </div>
                <h2 style={{
                  fontFamily: "var(--font-spectral), Georgia, serif",
                  fontWeight: 500,
                  fontSize: "clamp(24px,4vw,38px)",
                  margin: 0,
                  color: "#1f2a20",
                }}>
                  Mes spécialités
                </h2>
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gap: "22px" }}
              >
                {infoSections.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: "18px",
                      padding: "28px",
                      boxShadow: "0 1px 3px rgba(60,77,62,0.06)",
                    }}
                  >
                    <div style={{
                      width: "36px",
                      height: "3px",
                      background: theme.accentHex,
                      borderRadius: "2px",
                      marginBottom: "16px",
                    }} />
                    <h3 style={{
                      fontFamily: "var(--font-spectral), Georgia, serif",
                      fontWeight: 600,
                      fontSize: "19px",
                      margin: "0 0 10px",
                      color: "#223023",
                    }}>
                      {s.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.65, color: "#64748b" }}>
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            4. MES PRESTATIONS
        ════════════════════════════════════════════════════ */}
        {services.length > 0 && (
          <section style={{ width: "100%", background: "#FAFAF8" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,8vw,88px) clamp(24px,5vw,56px)" }}>
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.labelColor }}>
                    Au cabinet
                  </span>
                  <span style={{ width: "28px", height: "2px", background: theme.labelColor, borderRadius: "2px" }} />
                </div>
                <h2 style={{
                  fontFamily: "var(--font-spectral), Georgia, serif",
                  fontWeight: 500,
                  fontSize: "clamp(24px,4vw,38px)",
                  margin: 0,
                  color: "#1f2a20",
                }}>
                  Mes prestations
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "22px" }}>
                {services.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: "18px",
                      padding: "28px 28px 24px",
                      boxShadow: "0 1px 3px rgba(60,77,62,0.06)",
                    }}
                  >
                    <h3 style={{
                      fontFamily: "var(--font-spectral), Georgia, serif",
                      fontWeight: 600,
                      fontSize: "22px",
                      margin: "0 0 8px",
                      color: "#223023",
                    }}>
                      {s.name}
                    </h3>
                    {s.description && (
                      <p style={{ margin: "0 0 22px", fontSize: "15px", lineHeight: 1.65, color: "#64748b" }}>
                        {s.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: s.description ? 0 : "22px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: theme.badgeDurBg,
                        color: theme.badgeDurText,
                        fontWeight: 600,
                        fontSize: "13px",
                        padding: "7px 13px",
                        borderRadius: "999px",
                      }}>
                        <Clock style={{ width: 14, height: 14 }} />
                        {s.durationMinutes} min
                      </span>
                      {s.price !== null && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: theme.accentHex,
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "13px",
                          padding: "7px 13px",
                          borderRadius: "999px",
                        }}>
                          {s.price.toFixed(2).replace(".", ",")} €
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            5. PRENDRE RENDEZ-VOUS
        ════════════════════════════════════════════════════ */}
        {page.appointmentEnabled && (
          <section id="rdv" style={{ width: "100%", background: "#FAFAF8" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "0 clamp(24px,5vw,56px) clamp(48px,8vw,88px)" }}>
              <div style={{
                border: `1.5px solid #CBDAC6`,
                background: "linear-gradient(180deg,#F4F8F2,#FFFFFF)",
                borderRadius: "28px",
                padding: "clamp(28px,5vw,44px) clamp(24px,5vw,48px)",
                boxShadow: "0 10px 30px rgba(60,77,62,0.07)",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "30px" }}>
                  <span style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: theme.accentHex,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 6px 16px ${theme.accentHex}52`,
                    flexShrink: 0,
                  }}>
                    <CalendarDays style={{ width: 24, height: 24, color: "#fff" }} />
                  </span>
                  <div>
                    <h2 style={{
                      fontFamily: "var(--font-spectral), Georgia, serif",
                      fontWeight: 500,
                      fontSize: "clamp(22px,3.5vw,30px)",
                      margin: 0,
                      color: "#1f2a20",
                    }}>
                      Prendre rendez-vous
                    </h2>
                    <p style={{ margin: "3px 0 0", fontSize: "14.5px", color: "#64748b" }}>
                      Réservez votre créneau en quelques clics.
                    </p>
                  </div>
                </div>

                {showBooking ? (
                  <BookingWidget
                    slug={slug}
                    services={services.map((s) => ({
                      id: s.id,
                      name: s.name,
                      durationMinutes: s.durationMinutes,
                      price: s.price,
                    }))}
                  />
                ) : (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "32px 24px",
                    background: "#F4F8F2",
                    borderRadius: "16px",
                    gap: "12px",
                  }}>
                    <CalendarDays style={{ width: 32, height: 32, color: theme.accentHex }} />
                    <p style={{ margin: 0, fontWeight: 600, color: theme.accentDarkHex, fontSize: "16px" }}>
                      La réservation en ligne sera bientôt disponible
                    </p>
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                      En attendant, contactez-moi directement.
                    </p>
                    {page.contactFormEnabled && (
                      <a
                        href="#contact"
                        style={{
                          marginTop: "8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          background: theme.accentHex,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "14px",
                          padding: "10px 20px",
                          borderRadius: "999px",
                          textDecoration: "none",
                          boxShadow: `0 6px 16px ${theme.accentHex}40`,
                        }}
                      >
                        Me contacter
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            6. COORDONNÉES (dark sage, full bleed)
        ════════════════════════════════════════════════════ */}
        {hasContact && (
          <section style={{ width: "100%", background: theme.darkBg, position: "relative" }}>
            <div style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              mixBlendMode: "overlay" as const,
              backgroundImage: GRAIN,
            }} />
            <div
              className="relative"
              style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,7vw,72px) clamp(24px,5vw,56px)" }}
            >
              <h2 style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontWeight: 500,
                fontSize: "clamp(24px,3.5vw,32px)",
                margin: "0 0 40px",
                color: "#fff",
                textAlign: "center",
              }}>
                Me trouver
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "24px" }}>
                {page.address && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: "8px" }}>
                    <span style={{
                      width: "52px", height: "52px", borderRadius: "16px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <MapPin style={{ width: 24, height: 24, color: "#fff" }} />
                    </span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "6px" }}>
                        Adresse
                      </div>
                      <div style={{ fontSize: "16px", color: "#fff", lineHeight: 1.5 }}>
                        {page.address}
                      </div>
                    </div>
                  </div>
                )}
                {page.phone && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: "8px",
                    ...(page.address && page.contactEmail ? { borderLeft: "1px solid rgba(255,255,255,0.12)", borderRight: "1px solid rgba(255,255,255,0.12)" } : {}),
                  }}>
                    <span style={{
                      width: "52px", height: "52px", borderRadius: "16px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Phone style={{ width: 24, height: 24, color: "#fff" }} />
                    </span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "6px" }}>
                        Téléphone
                      </div>
                      <a href={`tel:${page.phone.replace(/\s/g, "")}`} style={{ fontSize: "16px", color: "#fff", textDecoration: "none" }}>
                        {page.phone}
                      </a>
                    </div>
                  </div>
                )}
                {page.contactEmail && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: "8px" }}>
                    <span style={{
                      width: "52px", height: "52px", borderRadius: "16px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Mail style={{ width: 24, height: 24, color: "#fff" }} />
                    </span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "6px" }}>
                        Email
                      </div>
                      <a href={`mailto:${page.contactEmail}`} style={{ fontSize: "16px", color: "#fff", textDecoration: "none", wordBreak: "break-all" }}>
                        {page.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            7. RÉSEAUX SOCIAUX
        ════════════════════════════════════════════════════ */}
        {hasSocial && (
          <section style={{ width: "100%", background: "#FAFAF8" }}>
            <div style={{
              maxWidth: "1180px",
              margin: "0 auto",
              padding: "clamp(40px,6vw,64px) clamp(24px,5vw,56px) 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <h2 style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontWeight: 500,
                fontSize: "clamp(20px,3vw,26px)",
                margin: "0 0 28px",
                color: "#1f2a20",
              }}>
                Suivez le cabinet
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px" }}>
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    background: "#fff", border: "1px solid #E6EAE2", borderRadius: "999px",
                    padding: "11px 20px", textDecoration: "none", color: "#3f4a3f",
                    fontWeight: 600, fontSize: "14.5px",
                    boxShadow: "0 1px 3px rgba(60,77,62,0.05)",
                  }}>
                    <Instagram style={{ width: 19, height: 19 }} /> Instagram
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    background: "#fff", border: "1px solid #E6EAE2", borderRadius: "999px",
                    padding: "11px 20px", textDecoration: "none", color: "#3f4a3f",
                    fontWeight: 600, fontSize: "14.5px",
                    boxShadow: "0 1px 3px rgba(60,77,62,0.05)",
                  }}>
                    <Facebook style={{ width: 19, height: 19 }} /> Facebook
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    background: "#fff", border: "1px solid #E6EAE2", borderRadius: "999px",
                    padding: "11px 20px", textDecoration: "none", color: "#3f4a3f",
                    fontWeight: 600, fontSize: "14.5px",
                    boxShadow: "0 1px 3px rgba(60,77,62,0.05)",
                  }}>
                    <Linkedin style={{ width: 19, height: 19 }} /> LinkedIn
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    background: "#fff", border: "1px solid #E6EAE2", borderRadius: "999px",
                    padding: "11px 20px", textDecoration: "none", color: "#3f4a3f",
                    fontWeight: 600, fontSize: "14.5px",
                    boxShadow: "0 1px 3px rgba(60,77,62,0.05)",
                  }}>
                    <Globe style={{ width: 19, height: 19 }} /> Site web
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            8. ME CONTACTER
        ════════════════════════════════════════════════════ */}
        {page.contactFormEnabled && (
          <section id="contact" style={{ width: "100%", background: "#FAFAF8" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(32px,5vw,48px) clamp(24px,5vw,56px) clamp(48px,8vw,88px)" }}>
              <div style={{
                background: theme.lightBg,
                borderRadius: "28px",
                padding: "clamp(32px,5vw,56px)",
                maxWidth: "720px",
                margin: "0 auto",
              }}>
                <div style={{ textAlign: "center", marginBottom: "34px" }}>
                  <h2 style={{
                    fontFamily: "var(--font-spectral), Georgia, serif",
                    fontWeight: 500,
                    fontSize: "clamp(24px,3.5vw,32px)",
                    margin: "0 0 8px",
                    color: "#1f2a20",
                  }}>
                    Me contacter
                  </h2>
                  <p style={{ margin: 0, fontSize: "15px", color: "#64748b" }}>
                    Une question ? Écrivez-moi, je vous réponds sous 48 h.
                  </p>
                </div>
                <ContactForm slug={slug} />
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            9. FOOTER
        ════════════════════════════════════════════════════ */}
        <footer style={{ width: "100%", background: "#F4F6F2", borderTop: "1px solid #E6EAE2" }}>
          <div style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "28px clamp(24px,5vw,56px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}>
            <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>
              {displayName}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "#94a3b8" }}>
              Propulsé par{" "}
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, color: theme.accentHex }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 9-10 1 5-1 10-2 13" />
                  <path d="M11 20c0-4 2-7 5-9" />
                </svg>
                NaturoDesk
              </span>
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}
