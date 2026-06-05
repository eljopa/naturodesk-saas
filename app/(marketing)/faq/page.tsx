import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.faq.meta");
  return { title: t("title"), description: t("description") };
}

export default async function FaqPage() {
  const t = await getTranslations("marketing.faq");

  const sections = [
    {
      title: t("sections.general"),
      items: [
        { question: t("general.q1"), answer: t("general.a1") },
        { question: t("general.q2"), answer: t("general.a2") },
        { question: t("general.q3"), answer: t("general.a3") },
      ],
    },
    {
      title: t("sections.pricing"),
      items: [
        { question: t("pricing.q1"), answer: t("pricing.a1") },
        { question: t("pricing.q2"), answer: t("pricing.a2") },
        { question: t("pricing.q3"), answer: t("pricing.a3") },
      ],
    },
    {
      title: t("sections.data"),
      items: [
        { question: t("data.q1"), answer: t("data.a1") },
        { question: t("data.q2"), answer: t("data.a2") },
        { question: t("data.q3"), answer: t("data.a3") },
      ],
    },
    {
      title: t("sections.features"),
      items: [
        { question: t("features.q1"), answer: t("features.a1") },
        { question: t("features.q2"), answer: t("features.a2") },
        { question: t("features.q3"), answer: t("features.a3") },
      ],
    },
  ];

  return (
    <>
      {/* Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <FaqAccordion sections={sections} />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-50 border-t border-slate-200 py-12 px-4 text-center">
        <p className="text-slate-700 font-medium">{t("stillQuestion")}</p>
        <Link
          href="/contact"
          className="mt-2 inline-block text-teal-700 font-semibold hover:text-teal-800 underline underline-offset-2"
        >
          {t("contactLink")}
        </Link>
      </section>
    </>
  );
}
