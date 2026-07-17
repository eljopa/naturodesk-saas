import { getTranslations } from "next-intl/server";
import { CtaBanner } from "@/components/marketing/cta-banner";

export async function FinalCtaSection() {
  const t = await getTranslations("marketing.home.finalCta");

  return (
    <CtaBanner
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
      ctaPrimary={{ label: t("ctaPrimary"), href: "/login" }}
      ctaSecondary={{ label: t("ctaSecondary"), href: "/#cabinet" }}
    />
  );
}
