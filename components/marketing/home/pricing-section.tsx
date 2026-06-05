import { getTranslations } from "next-intl/server";
import Link from "next/link";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "var(--nd-sage)" }}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface PlanProps {
  name: string;
  slogan: string;
  desc: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaHref: string;
  badge?: string;
  note?: string;
  featured?: boolean;
}

function PlanCard({ name, slogan, desc, price, period, features, cta, ctaHref, badge, note, featured }: PlanProps) {
  return (
    <div
      className="rounded-2xl p-[34px] relative flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "#fff",
        border: featured ? "2px solid var(--nd-sage)" : "1px solid var(--nd-line)",
        boxShadow: featured ? "0 14px 40px -18px rgba(61,74,51,.22)" : undefined,
      }}
    >
      {badge && (
        <span
          className="absolute -top-[13px] left-1/2 -translate-x-1/2 inline-flex items-center px-4 py-1.5 rounded-full text-[11.5px] font-extrabold uppercase tracking-[.08em] text-white"
          style={{ background: "var(--nd-sage)" }}
        >
          {badge}
        </span>
      )}

      <div className="mb-5">
        <h3 className="font-serif font-medium text-[24px] mb-0.5" style={{ color: "var(--nd-forest)" }}>
          {name}
        </h3>
        <p className="text-[12.5px] font-bold uppercase tracking-[.1em]" style={{ color: "var(--nd-copper)" }}>
          {slogan}
        </p>
      </div>

      <p className="text-[14px] mb-5" style={{ color: "var(--nd-muted)", minHeight: 36 }}>
        {desc}
      </p>

      <div className="font-serif leading-none mb-7" style={{ fontSize: 46, color: "var(--nd-forest)" }}>
        {price}
        <small className="text-[15px] font-sans ml-1" style={{ color: "var(--nd-muted)", fontWeight: 600 }}>
          {period}
        </small>
      </div>

      <ul className="list-none p-0 m-0 mb-8 grid gap-3 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2.5 text-[14.5px]" style={{ color: "var(--nd-ink)" }}>
            <CheckIcon />{f}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className="flex justify-center items-center w-full py-[14px] rounded-full font-bold text-[15px] transition-all duration-200"
        style={featured
          ? { background: "var(--nd-sage)", color: "#fff" }
          : { background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }
        }
      >
        {cta}
      </Link>

      {note && (
        <p className="mt-3 text-center text-[12px] leading-relaxed" style={{ color: "var(--nd-muted)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

export async function PricingSection() {
  const t = await getTranslations("marketing.home.pricing");

  const plans: PlanProps[] = [
    {
      name:     t("plan1Name"),
      slogan:   t("plan1Slogan"),
      desc:     t("plan1Desc"),
      price:    t("plan1Price"),
      period:   t("plan1Period"),
      features: [t("plan1L1"), t("plan1L2"), t("plan1L3"), t("plan1L4"), t("plan1L5"), t("plan1L6")],
      cta:      t("plan1Cta"),
      ctaHref:  "/login",
    },
    {
      name:     t("plan2Name"),
      slogan:   t("plan2Slogan"),
      desc:     t("plan2Desc"),
      price:    t("plan2Price"),
      period:   t("plan2Period"),
      features: [t("plan2L1"), t("plan2L2"), t("plan2L3"), t("plan2L4"), t("plan2L5")],
      cta:      t("plan2Cta"),
      ctaHref:  "/login",
      badge:    t("plan2Badge"),
      note:     t("plan2Note"),
      featured: true,
    },
    {
      name:     t("plan3Name"),
      slogan:   t("plan3Slogan"),
      desc:     t("plan3Desc"),
      price:    t("plan3Price"),
      period:   t("plan3Period"),
      features: [t("plan3L1"), t("plan3L2"), t("plan3L3"), t("plan3L4"), t("plan3L5")],
      cta:      t("plan3Cta"),
      ctaHref:  "/login",
    },
  ];

  return (
    <section id="tarifs" className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-5 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-4"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
          <p style={{ fontSize: "clamp(17px,1.3vw,20px)", color: "var(--nd-muted)", lineHeight: 1.6 }}>
            {t("subtitle")}
          </p>
        </div>

        {/* School banner */}
        <div
          className="max-w-[640px] mx-auto mb-12 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-[14px] font-semibold"
          style={{ background: "#F3E7DC", color: "var(--nd-copper-deep)" }}
        >
          {t("schoolBanner")}
          <Link href="/contact" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
            {t("schoolLink")}
          </Link>
        </div>

        {/* 3-plan grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <PlanCard key={plan.name} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
