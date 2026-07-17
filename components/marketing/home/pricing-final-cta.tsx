import { getTranslations } from "next-intl/server";
import { CtaBanner } from "@/components/marketing/cta-banner";

export async function PricingFinalCta() {
  const t = await getTranslations("marketing.home.pricingFinalCta");

  return (
    <CtaBanner
      title={t("title")}
      subtitle={t("text")}
      ctaPrimary={{ label: t("ctaPrimary"), href: "/register" }}
      ctaSecondary={{ label: t("ctaSecondary"), href: "/fonctionnalites" }}
    />
  );
}
