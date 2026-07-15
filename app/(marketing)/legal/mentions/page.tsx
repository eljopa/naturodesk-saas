import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Info } from "lucide-react";
import { LegalHero } from "@/components/marketing/legal-hero";

const LAST_UPDATED = new Date("2026-07-15");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.mentions.meta");
  return { title: t("title"), description: t("description") };
}

export default async function MentionsPage() {
  const [t, locale] = await Promise.all([getTranslations("marketing.legal.mentions"), getLocale()]);
  const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(LAST_UPDATED);

  const sectionTitleStyle = { fontSize: "clamp(19px,2.2vw,23px)", color: "var(--nd-forest)" } as const;

  return (
    <>
      <LegalHero
        icon={<Info style={{ width: 24, height: 24, color: "var(--nd-sage-deep)" }} />}
        title={t("title")}
        lastUpdated={t("lastUpdated", { date: dateLabel })}
      />

      <section className="py-16 px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Éditeur */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("editorTitle")}
            </h2>
            <div className="space-y-1 text-[15.5px]" style={{ color: "var(--nd-muted)" }}>
              <p className="font-semibold" style={{ color: "var(--nd-forest)" }}>{t("company")}</p>
              <p>{t("capital")}</p>
              <p>{t("rcs")}</p>
              <p>{t("vat")}</p>
              <p>{t("address")}</p>
              <p>{t("email")}</p>
              <p>{t("director")}</p>
            </div>
          </div>

          {/* Hébergement */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("hostingTitle")}
            </h2>
            <div className="space-y-1 text-[15.5px]" style={{ color: "var(--nd-muted)" }}>
              <p>{t("hostingProvider")}</p>
              <p>{t("hostingData")}</p>
            </div>
          </div>

          {/* Données personnelles */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("dataTitle")}
            </h2>
            <div className="space-y-1 text-[15.5px]" style={{ color: "var(--nd-muted)" }}>
              <p>{t("dpo")}</p>
              <p>{t("dataLink")}</p>
            </div>
          </div>

          {/* Cookies */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("cookiesTitle")}
            </h2>
            <p className="text-[15.5px]" style={{ color: "var(--nd-muted)" }}>{t("cookiesContent")}</p>
          </div>

          {/* Crédits */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("creditsTitle")}
            </h2>
            <p className="text-[15.5px]" style={{ color: "var(--nd-muted)" }}>{t("creditsIcons")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
