import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { HeroSection } from "@/components/marketing/home/hero-section";
import { TrustStrip } from "@/components/marketing/home/trust-strip";
import { PillarCabinet } from "@/components/marketing/home/pillar-cabinet";
import { PillarActivite } from "@/components/marketing/home/pillar-activite";
import { PillarMoteur } from "@/components/marketing/home/pillar-moteur";
import { WhySection } from "@/components/marketing/home/why-section";
import { TestimonialsSection } from "@/components/marketing/home/testimonials-section";
import { PricingSection } from "@/components/marketing/home/pricing-section";
import { FaqSection } from "@/components/marketing/home/faq-section";
import { FinalCtaSection } from "@/components/marketing/home/final-cta";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.home.meta");
  return { title: t("title"), description: t("description") };
}

export default function HomePage() {
  return (
    <div className="nd-landing">
      <MarketingNav />
      <main>
        <HeroSection />
        <TrustStrip />
        <PillarActivite />
        <PillarCabinet />
        <PillarMoteur />
        <WhySection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
