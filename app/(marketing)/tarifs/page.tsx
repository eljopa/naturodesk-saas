import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/home/pricing-section";
import { PricingComparisonTable } from "@/components/marketing/home/pricing-comparison-table";
import { PricingFaqSection } from "@/components/marketing/home/pricing-faq-section";
import { PricingFinalCta } from "@/components/marketing/home/pricing-final-cta";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.home.pricing");
  return {
    title: t("eyebrow"),
    description: t("subtitle"),
  };
}

export default function TarifsPage() {
  return (
    <>
      <PricingSection />
      <PricingComparisonTable />
      <PricingFaqSection />
      <PricingFinalCta />
    </>
  );
}
