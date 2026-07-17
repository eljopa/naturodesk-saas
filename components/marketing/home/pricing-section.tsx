import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_PRICING } from "@/lib/plans";
import type { PaidPlanKey } from "@/lib/plans";
import { PLAN_GROUPS } from "@/lib/pricing-data";
import { PricingGrid } from "./pricing-grid";
import type { PlanCardData, PlanFeatureGroup } from "./pricing-grid";

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
      ctaKey: "plan1Cta",
    },
    {
      key: "GROWTH",
      nameKey: "plan2Name",
      sloganKey: "plan2Slogan",
      descKey: "plan2Desc",
      ctaKey: "plan2Cta",
      badge: t("plan2Badge"),
      featured: true,
    },
    {
      key: "PRO",
      nameKey: "plan3Name",
      sloganKey: "plan3Slogan",
      descKey: "plan3Desc",
      ctaKey: "plan3Cta",
      note: t("plan3Note"),
    },
  ];

  const plans: PlanCardData[] = planDefs.map((def) => {
    const pricing = PLAN_PRICING[def.key];
    const groups: PlanFeatureGroup[] = PLAN_GROUPS[def.key].map((group) => ({
      title: group.heading
        ? t(`groups.${group.key}.title` as Parameters<typeof t>[0])
        : undefined,
      items: Array.from({ length: group.itemCount }, (_, i) =>
        t(`groups.${group.key}.item${i + 1}` as Parameters<typeof t>[0])
      ),
    }));

    return {
      key: def.key,
      name: t(def.nameKey as Parameters<typeof t>[0]),
      slogan: t(def.sloganKey as Parameters<typeof t>[0]),
      desc: t(def.descKey as Parameters<typeof t>[0]),
      monthlyPrice: pricing.monthlyPrice,
      yearlyMonthly: pricing.yearlyMonthly,
      yearlyTotal: pricing.yearlyTotal,
      groups,
      cta: t(def.ctaKey as Parameters<typeof t>[0]),
      badge: def.badge,
      note: def.note,
      featured: def.featured,
      ctaHrefMonthly: buildCtaHref(def.key, "MONTHLY", isLoggedIn),
      ctaHrefYearly: buildCtaHref(def.key, "YEARLY", isLoggedIn),
    };
  });

  const reassurance = [
    t("reassurance1"),
    t("reassurance2"),
    t("reassurance3"),
    t("reassurance4"),
  ];

  return (
    <section id="tarifs" className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-6 max-w-[680px] mx-auto">
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

        {/* Reassurance line */}
        <ul
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mb-12 list-none p-0"
          aria-label={t("eyebrow")}
        >
          {reassurance.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 text-[13.5px] font-semibold"
              style={{ color: "var(--nd-forest)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--nd-sage)" }}
              >
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {label}
            </li>
          ))}
        </ul>

        {/* Interactive plan grid with monthly/yearly toggle */}
        <PricingGrid
          plans={plans}
          labelMonthly={t("toggleMonthly")}
          labelYearly={t("toggleAnnual")}
          labelDiscount={t("toggleDiscountBadge")}
          labelBilledAnnually={t("billedAnnually")}
          labelPerMonth={t("perMonth")}
        />

        {/* Student offer callout */}
        <div
          className="mt-12 max-w-[820px] mx-auto rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5 text-center sm:text-left"
          style={{ background: "#F3E7DC", border: "1px solid var(--nd-line)" }}
        >
          <div>
            <p className="font-serif text-[19px] mb-1" style={{ color: "var(--nd-forest)" }}>
              {t("studentOfferTitle")}
            </p>
            <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--nd-copper-deep)" }}>
              {t("studentOfferText")}
            </p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-[14px] whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: "var(--nd-forest)", color: "#fff" }}
          >
            {t("studentOfferCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
