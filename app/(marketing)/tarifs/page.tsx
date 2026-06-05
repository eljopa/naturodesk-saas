import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/home/pricing-section";
import { FaqSection } from "@/components/marketing/home/faq-section";

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
      <FaqSection />
    </>
  );
}
