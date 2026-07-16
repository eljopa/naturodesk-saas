import { getTranslations } from "next-intl/server";

export async function AboutSparkQuoteSection() {
  const t = await getTranslations("marketing.about.spark");

  return (
    <section className="relative overflow-hidden py-[110px] px-8" style={{ background: "var(--nd-forest)" }}>
      <svg className="absolute inset-0 pointer-events-none w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none" style={{ opacity: 0.9 }}>
        <defs>
          <radialGradient id="spark-glow" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#5E7349" stopOpacity=".55" />
            <stop offset="100%" stopColor="#3D4A33" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="400" fill="url(#spark-glow)" />
      </svg>

      <div className="relative max-w-[760px] mx-auto text-center">
        <p className="nd-eyebrow nd-eyebrow--center" style={{ color: "var(--nd-sand)" }}>{t("eyebrow")}</p>
        <p
          className="font-serif font-medium leading-[1.3] mb-6 text-white"
          style={{ fontSize: "clamp(26px,3.6vw,42px)", textWrap: "balance" } as React.CSSProperties}
        >
          «&nbsp;{t("quote")}&nbsp;»
        </p>
        <p style={{ fontSize: 15, color: "rgba(238,233,220,.75)", fontWeight: 600 }}>{t("caption")}</p>
      </div>
    </section>
  );
}
