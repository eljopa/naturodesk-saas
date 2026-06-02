import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  Clock,
  Euro,
  CalendarDays,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isScheduleConfigured, type WeekSchedule } from "@/lib/public/slots";
import { ContactForm } from "./_components/contact-form";
import { BookingWidget } from "./_components/booking-widget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

// ---------------------------------------------------------------------------
// Hero theme map (heroThemeId 1–10)
// ---------------------------------------------------------------------------

const THEMES: Record<number, { heroGradient: string; heroText: string; accentBg: string; accentText: string }> = {
  1:  { heroGradient: "from-teal-700 to-teal-900",    heroText: "text-white", accentBg: "bg-teal-50",   accentText: "text-teal-700" },
  2:  { heroGradient: "from-green-800 to-green-950",  heroText: "text-white", accentBg: "bg-green-50",  accentText: "text-green-700" },
  3:  { heroGradient: "from-green-600 to-lime-700",   heroText: "text-white", accentBg: "bg-lime-50",   accentText: "text-lime-700" },
  4:  { heroGradient: "from-blue-700 to-sky-900",     heroText: "text-white", accentBg: "bg-sky-50",    accentText: "text-sky-700" },
  5:  { heroGradient: "from-orange-700 to-orange-900",heroText: "text-white", accentBg: "bg-orange-50", accentText: "text-orange-700" },
  6:  { heroGradient: "from-purple-700 to-purple-900",heroText: "text-white", accentBg: "bg-purple-50", accentText: "text-purple-700" },
  7:  { heroGradient: "from-slate-700 to-slate-900",  heroText: "text-white", accentBg: "bg-teal-50",   accentText: "text-teal-700" },
  8:  { heroGradient: "from-yellow-700 to-yellow-900",heroText: "text-white", accentBg: "bg-yellow-50", accentText: "text-yellow-700" },
  9:  { heroGradient: "from-rose-600 to-rose-800",    heroText: "text-white", accentBg: "bg-rose-50",   accentText: "text-rose-700" },
  10: { heroGradient: "from-indigo-800 to-indigo-950",heroText: "text-white", accentBg: "bg-amber-50",  accentText: "text-amber-700" },
};

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
    // Ne pas indexer les pages non publiées
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Schema.org JSON-LD
// ---------------------------------------------------------------------------

function SchemaLD({
  name,
  description,
  address,
  phone,
  email,
  url,
}: {
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  url: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "MedicalBusiness"],
    name,
    url,
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
      logoUrl: true,
      bio: true,
      presentation: true,
      servicesDisplay: true,
      pricingDisplay: true,
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

  // Slug inexistant → 404
  if (!page) notFound();

  // Page non publiée : seul le propriétaire connecté ou un admin peut prévisualiser
  if (!page.isPublished) {
    if (preview !== "1") notFound();

    const viewer = await getCurrentUser();
    const canPreview =
      viewer?.id === page.userId ||
      viewer?.role === "ADMIN" ||
      viewer?.role === "SUPER_ADMIN";

    if (!canPreview) notFound();
  }

  const [services, scheduleRow] = await Promise.all([
    db.serviceOffering.findMany({
      where: { userId: page.userId, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, durationMinutes: true, price: true, description: true },
    }),
    db.practitionerSchedule.findUnique({
      where: { userId: page.userId },
      select: { scheduleJson: true, timezone: true },
    }),
  ]);

  const theme       = THEMES[page.heroThemeId] ?? THEMES[1]!;
  const displayName = page.user.cabinetName ?? page.user.name;
  const socialLinks = (page.socialLinks ?? {}) as Record<string, string>;
  const hasSocial   = Object.keys(socialLinks).length > 0;
  const hasContact  = page.address || page.phone || page.contactEmail;
  const hasServices = services.length > 0 || page.servicesDisplay;
  const hasPricing  = !!page.pricingDisplay;
  const hasAbout    = page.bio || page.presentation;

  const scheduleConfigured =
    scheduleRow != null &&
    isScheduleConfigured(scheduleRow.scheduleJson as WeekSchedule);

  const showBooking =
    page.appointmentEnabled && services.length > 0 && scheduleConfigured;

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "";
  const pageUrl = `${baseUrl}/p/${slug}`;

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

      <div className="min-h-screen bg-white font-sans">
        {/* ── Hero ── */}
        <header className={`bg-gradient-to-br ${theme.heroGradient} ${theme.heroText}`}>
          <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
            {page.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.logoUrl}
                alt={displayName}
                className="h-16 w-auto mb-6 rounded-lg object-contain"
              />
            )}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{displayName}</h1>
            {page.bio && (
              <p className="mt-4 text-lg leading-relaxed opacity-90 max-w-xl">{page.bio}</p>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 space-y-16">
          {/* ── Présentation ── */}
          {hasAbout && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Qui suis-je
              </h2>
              {page.presentation ? (
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {page.presentation}
                </div>
              ) : page.bio ? (
                <p className="text-slate-600 leading-relaxed">{page.bio}</p>
              ) : null}
            </section>
          )}

          {/* ── Prestations ── */}
          {hasServices && (
            <section aria-labelledby="services-heading">
              <h2 id="services-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Mes prestations
              </h2>
              {services.length > 0 && (
                <div className="space-y-3 mb-4">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-xl border border-slate-200 p-4 ${theme.accentBg}/30`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{s.name}</p>
                          {s.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{s.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {s.durationMinutes} min
                          </span>
                          {s.price !== null && (
                            <span className="flex items-center gap-0.5 text-sm font-medium text-slate-700 mt-0.5">
                              <Euro className="w-3.5 h-3.5" />
                              {s.price.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {page.servicesDisplay && (
                <p className="text-slate-600 text-sm leading-relaxed">{page.servicesDisplay}</p>
              )}
            </section>
          )}

          {/* ── Tarifs ── */}
          {hasPricing && (
            <section aria-labelledby="pricing-heading">
              <h2 id="pricing-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Tarifs
              </h2>
              <p className="text-slate-600 leading-relaxed">{page.pricingDisplay}</p>
            </section>
          )}

          {/* ── Réservation en ligne ── */}
          {page.appointmentEnabled && (
            <section aria-labelledby="booking-heading" id="reservation">
              <h2 id="booking-heading" className="text-2xl font-semibold text-slate-900 mb-2">
                Prendre rendez-vous
              </h2>
              {showBooking ? (
                <>
                  <p className="text-slate-500 text-sm mb-6">
                    Choisissez une prestation et un créneau disponible.
                  </p>
                  <BookingWidget
                    slug={slug}
                    services={services.map((s) => ({
                      id:              s.id,
                      name:            s.name,
                      durationMinutes: s.durationMinutes,
                      price:           s.price,
                    }))}
                  />
                </>
              ) : (
                <div className={`rounded-xl ${theme.accentBg} border border-slate-200 p-6 flex items-start gap-4`}>
                  <CalendarDays className={`w-6 h-6 ${theme.accentText} shrink-0 mt-0.5`} />
                  <div>
                    <p className={`font-medium ${theme.accentText}`}>
                      La réservation en ligne sera bientôt disponible
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      En attendant, contactez-moi directement.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Coordonnées ── */}
          {hasContact && (
            <section aria-labelledby="contact-info-heading">
              <h2 id="contact-info-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Coordonnées
              </h2>
              <ul className="space-y-3">
                {page.address && (
                  <li className="flex items-start gap-3 text-slate-600">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{page.address}</span>
                  </li>
                )}
                {page.phone && (
                  <li className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                    <a href={`tel:${page.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {page.phone}
                    </a>
                  </li>
                )}
                {page.contactEmail && (
                  <li className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                    <a href={`mailto:${page.contactEmail}`} className="hover:underline break-all">
                      {page.contactEmail}
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* ── Réseaux sociaux ── */}
          {hasSocial && (
            <section aria-labelledby="social-heading">
              <h2 id="social-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Retrouvez-moi
              </h2>
              <div className="flex flex-wrap gap-3">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    <Instagram className="w-4 h-4" /> Instagram
                  </a>
                )}
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    <Facebook className="w-4 h-4" /> Facebook
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    <Globe className="w-4 h-4" /> Site web
                  </a>
                )}
              </div>
            </section>
          )}

          {/* ── Formulaire de contact ── */}
          {page.contactFormEnabled && (
            <section aria-labelledby="contact-form-heading" id="contact">
              <h2 id="contact-form-heading" className="text-2xl font-semibold text-slate-900 mb-4">
                Me contacter
              </h2>
              <ContactForm slug={slug} />
            </section>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-100 mt-16">
          <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-400">
            <p>{displayName}</p>
            <p>Propulsé par NaturoDesk</p>
          </div>
        </footer>
      </div>
    </>
  );
}
