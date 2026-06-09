import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_PRICING } from "@/lib/plans";
import type { PaidPlanKey } from "@/lib/plans";
import { PricingGrid } from "./pricing-grid";
import type { PlanCardData } from "./pricing-grid";

// Compute the CTA href for a plan/interval combination.
// Logged-in users go directly to /settings with upgrade intent.
// Anonymous users go to /register with plan params.
function buildCtaHref(
  plan: PaidPlanKey,
  interval: "MONTHLY" | "YEARLY",
  isLoggedIn: boolean
): string {
  const dest = `/settings?upgrade=${plan}&interval=${interval}`;
  if (isLoggedIn) return dest;
  return `/register?plan=${plan}&interval=${interval}`;
}

export async function PricingSection() {
  const [t, user] = await Promise.all([
    getTranslations("marketing.home.pricing"),
    getCurrentUser(),
  ]);

  const isLoggedIn = !!user;

  const planDefs: Array<{
    key: PaidPlanKey;
    nameKey: string;
    sloganKey: string;
    descKey: string;
    featureKeys: string[];
    ctaKey: string;
    badge?: string;
    note?: string;
    featured?: boolean;
  }> = [
    {
      key: "STARTER",
      nameKey: "plan1Name",
      sloganKey: "plan1Slogan",
      descKey: "plan1Desc",
      featureKeys: ["plan1L1", "plan1L2", "plan1L3", "plan1L4", "plan1L5", "plan1L6"],
      ctaKey: "plan1Cta",
    },
    {
      key: "GROWTH",
      nameKey: "plan2Name",
      sloganKey: "plan2Slogan",
      descKey: "plan2Desc",
      featureKeys: ["plan2L1", "plan2L2", "plan2L3", "plan2L4", "plan2L5"],
      ctaKey: "plan2Cta",
      badge: t("plan2Badge"),
      note: t("plan2Note"),
      featured: true,
    },
    {
      key: "PRO",
      nameKey: "plan3Name",
      sloganKey: "plan3Slogan",
      descKey: "plan3Desc",
      featureKeys: ["plan3L1", "plan3L2", "plan3L3", "plan3L4", "plan3L5"],
      ctaKey: "plan3Cta",
    },
  ];

  const plans: PlanCardData[] = planDefs.map((def) => {
    const pricing = PLAN_PRICING[def.key];
    return {
      key: def.key,
      name: t(def.nameKey as Parameters<typeof t>[0]),
      slogan: t(def.sloganKey as Parameters<typeof t>[0]),
      desc: t(def.descKey as Parameters<typeof t>[0]),
      monthlyPrice: pricing.monthlyPrice,
      yearlyMonthly: pricing.yearlyMonthly,
      yearlyTotal: pricing.yearlyTotal,
      features: def.featureKeys.map((k) => t(k as Parameters<typeof t>[0])),
      cta: t(def.ctaKey as Parameters<typeof t>[0]),
      badge: def.badge,
      note: def.note,
      featured: def.featured,
      ctaHrefMonthly: buildCtaHref(def.key, "MONTHLY", isLoggedIn),
      ctaHrefYearly: buildCtaHref(def.key, "YEARLY", isLoggedIn),
    };
  });

  return (
    <section id="tarifs" className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-5 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-4"
            style={
              {
                fontSize: "clamp(30px,3.6vw,46px)",
                color: "var(--nd-forest)",
                textWrap: "balance",
              } as React.CSSProperties
            }
          >
            {t("title")}
          </h2>
          <p
            style={{
              fontSize: "clamp(17px,1.3vw,20px)",
              color: "var(--nd-muted)",
              lineHeight: 1.6,
            }}
          >
            {t("subtitle")}
          </p>
        </div>

        {/* School banner */}
        <div
          className="max-w-[640px] mx-auto mb-12 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-[14px] font-semibold"
          style={{ background: "#F3E7DC", color: "var(--nd-copper-deep)" }}
        >
          {t("schoolBanner")}
          <Link
            href="/contact"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {t("schoolLink")}
          </Link>
        </div>

        {/* Interactive plan grid with monthly/yearly toggle */}
        <PricingGrid
          plans={plans}
          labelMonthly="Mensuel"
          labelYearly="Annuel"
          labelDiscount="-17%"
          labelBilledAnnually="Facturé annuellement"
        />
      </div>
    </section>
  );
}
