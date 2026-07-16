import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { AboutHeroSection } from "@/components/marketing/about/hero-section";
import { AboutContextSection } from "@/components/marketing/about/context-section";
import { AboutFrustrationsSection } from "@/components/marketing/about/frustrations-section";
import { AboutSparkQuoteSection } from "@/components/marketing/about/spark-quote-section";
import { AboutOriginSection } from "@/components/marketing/about/origin-section";
import { AboutPhilosophySection } from "@/components/marketing/about/philosophy-section";
import { AboutCtaSection } from "@/components/marketing/about/cta-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.about.meta");
  return { title: t("title"), description: t("description") };
}

export default function AboutPage() {
  return (
    <div className="nd-landing">
      <AboutHeroSection />
      <AboutContextSection />
      <AboutFrustrationsSection />
      <AboutSparkQuoteSection />
      <AboutOriginSection />
      <AboutPhilosophySection />
      <AboutCtaSection />
    </div>
  );
}
