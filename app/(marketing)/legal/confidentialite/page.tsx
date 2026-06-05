import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.privacy.meta");
  return { title: t("title"), description: t("description") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("marketing.legal.privacy");

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("title")}</h1>
      <p className="text-sm text-slate-500 mb-10">
        {t("lastUpdated", { date: "1er juin 2026" })}
      </p>
      <div className="space-y-4 text-slate-700 leading-relaxed">
        <p>
          Le contenu de cette page sera rédigé prochainement. Pour toute question
          relative à vos données personnelles, contactez-nous à{" "}
          <a href="mailto:privacy@naturodesk.fr" className="text-teal-700 underline">
            privacy@naturodesk.fr
          </a>.
        </p>
      </div>
    </div>
  );
}
