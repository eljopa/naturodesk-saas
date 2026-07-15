import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { LegalHero } from "@/components/marketing/legal-hero";

const LAST_UPDATED = new Date("2026-07-15");
const SECTION_COUNT = 13;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.terms.meta");
  return { title: t("title"), description: t("description") };
}

export default async function TermsPage() {
  const [t, locale] = await Promise.all([getTranslations("marketing.legal.terms"), getLocale()]);
  const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(LAST_UPDATED);

  const sections = Array.from({ length: SECTION_COUNT }, (_, i) => i + 1);

  return (
    <>
      <LegalHero
        icon={<FileText style={{ width: 24, height: 24, color: "var(--nd-sage-deep)" }} />}
        title={t("title")}
        lastUpdated={t("lastUpdated", { date: dateLabel })}
      />

      <section className="py-16 px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-[17px] leading-relaxed mb-10" style={{ color: "var(--nd-forest)" }}>
            {t("intro")}
          </p>

          <div className="space-y-8">
            {sections.map((n) => (
              <div key={n}>
                <h2 className="font-serif font-medium mb-2" style={{ fontSize: "clamp(19px,2.2vw,23px)", color: "var(--nd-forest)" }}>
                  {t(`section${n}Title` as Parameters<typeof t>[0])}
                </h2>
                <p className="text-[15.5px] leading-relaxed" style={{ color: "var(--nd-muted)" }}>
                  {t(`section${n}Content` as Parameters<typeof t>[0])}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl" style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}>
            <a href={`mailto:${t("contact")}`} className="font-semibold" style={{ color: "var(--nd-sage-deep)" }}>
              {t("contact")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
