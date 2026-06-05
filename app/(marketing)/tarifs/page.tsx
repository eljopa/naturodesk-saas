import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/pricing-toggle";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.pricing.meta");
  return { title: t("title"), description: t("description") };
}

export default async function PricingPage() {
  const t = await getTranslations("marketing.pricing");

  const faqSection = [
    {
      title: t("faqTitle"),
      items: [
        { question: t("faq.q1"), answer: t("faq.a1") },
        { question: t("faq.q2"), answer: t("faq.a2") },
        { question: t("faq.q3"), answer: t("faq.a3") },
        { question: t("faq.q4"), answer: t("faq.a4") },
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

      {/* Plans */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-t border-slate-200 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <FaqAccordion sections={faqSection} />
        </div>
      </section>
    </>
  );
}
