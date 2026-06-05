import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.about.meta");
  return { title: t("title"), description: t("description") };
}

export default async function AboutPage() {
  const t = await getTranslations("marketing.about");

  const values = [
    { title: t("values.v1Title"), body: t("values.v1Body") },
    { title: t("values.v2Title"), body: t("values.v2Body") },
    { title: t("values.v3Title"), body: t("values.v3Body") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-5 text-xl text-slate-600 leading-relaxed">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Mission + Story */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-14">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("mission.title")}
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg">{t("mission.body")}</p>
          </div>
          <div className="border-t border-slate-200 pt-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("story.title")}
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg">{t("story.body")}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 border-t border-b border-slate-200 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
            {t("values.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map(({ title, body }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-teal-700 text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900">{t("cta.title")}</h2>
          <p className="mt-3 text-slate-600">{t("cta.subtitle")}</p>
          <div className="mt-8">
            <Button variant="primary" size="lg" asChild>
              <Link href="/login">{t("cta.button")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
