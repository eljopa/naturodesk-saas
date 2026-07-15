import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Cookie } from "lucide-react";
import { LegalHero } from "@/components/marketing/legal-hero";

const LAST_UPDATED = new Date("2026-07-15");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.cookies.meta");
  return { title: t("title"), description: t("description") };
}

export default async function CookiesPage() {
  const [t, locale] = await Promise.all([getTranslations("marketing.legal.cookies"), getLocale()]);
  const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(LAST_UPDATED);

  const sectionTitleStyle = { fontSize: "clamp(19px,2.2vw,23px)", color: "var(--nd-forest)" } as const;
  const bodyStyle = { color: "var(--nd-muted)" } as const;

  return (
    <>
      <LegalHero
        icon={<Cookie style={{ width: 24, height: 24, color: "var(--nd-sage-deep)" }} />}
        title={t("title")}
        lastUpdated={t("lastUpdated", { date: dateLabel })}
      />

      <section className="py-16 px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Intro */}
          <div>
            <h2 className="font-serif font-medium mb-2" style={sectionTitleStyle}>
              {t("introTitle")}
            </h2>
            <p className="text-[15.5px] leading-relaxed" style={bodyStyle}>
              {t("introContent")}
            </p>
          </div>

          {/* What are cookies */}
          <div>
            <h2 className="font-serif font-medium mb-2" style={sectionTitleStyle}>
              {t("whatAreCookiesTitle")}
            </h2>
            <p className="text-[15.5px] leading-relaxed" style={bodyStyle}>
              {t("whatAreCookiesContent")}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("categoriesTitle")}
            </h2>
            <div className="rounded-2xl p-5" style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}>
              <p className="font-semibold mb-1.5" style={{ color: "var(--nd-forest)" }}>
                {t("categoryNecessaryTitle")}
              </p>
              <p className="text-[15px] leading-relaxed m-0" style={bodyStyle}>
                {t("categoryNecessaryDesc")}
              </p>
            </div>
          </div>

          {/* Table */}
          <div>
            <h2 className="font-serif font-medium mb-3" style={sectionTitleStyle}>
              {t("tableTitle")}
            </h2>
            <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--nd-line-soft)" }}>
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr style={{ background: "var(--nd-sage-tint)" }}>
                    <th className="text-left font-semibold px-4 py-3" style={{ color: "var(--nd-forest)" }}>
                      {t("tableName")}
                    </th>
                    <th className="text-left font-semibold px-4 py-3" style={{ color: "var(--nd-forest)" }}>
                      {t("tablePurpose")}
                    </th>
                    <th className="text-left font-semibold px-4 py-3" style={{ color: "var(--nd-forest)" }}>
                      {t("tableDuration")}
                    </th>
                    <th className="text-left font-semibold px-4 py-3" style={{ color: "var(--nd-forest)" }}>
                      {t("tableType")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: "1px solid var(--nd-line-soft)" }}>
                    <td className="px-4 py-3 font-mono text-[13px]" style={{ color: "var(--nd-forest)" }}>
                      NEXT_LOCALE
                    </td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieLocalePurpose")}</td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieLocaleDuration")}</td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieLocaleType")}</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid var(--nd-line-soft)", background: "var(--nd-cream-deep)" }}>
                    <td className="px-4 py-3 font-mono text-[13px]" style={{ color: "var(--nd-forest)" }}>
                      sb-*
                    </td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieAuthPurpose")}</td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieAuthDuration")}</td>
                    <td className="px-4 py-3" style={bodyStyle}>{t("cookieAuthType")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Manage */}
          <div>
            <h2 className="font-serif font-medium mb-2" style={sectionTitleStyle}>
              {t("manageTitle")}
            </h2>
            <p className="text-[15.5px] leading-relaxed" style={bodyStyle}>
              {t("manageContent")}
            </p>
          </div>

          {/* Third party */}
          <div>
            <h2 className="font-serif font-medium mb-2" style={sectionTitleStyle}>
              {t("thirdPartyTitle")}
            </h2>
            <p className="text-[15.5px] leading-relaxed mb-2" style={bodyStyle}>
              {t("thirdPartyContent")}
            </p>
            <ul className="list-disc pl-5">
              <li className="text-[15px]" style={bodyStyle}>{t("thirdPartySupabase")}</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="p-6 rounded-2xl" style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}>
            <h2 className="font-semibold mb-1.5" style={{ color: "var(--nd-forest)" }}>{t("contactTitle")}</h2>
            <p className="m-0 text-[15px]" style={{ color: "var(--nd-forest)" }}>{t("contactContent")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
