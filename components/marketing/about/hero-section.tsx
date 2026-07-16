import { getTranslations } from "next-intl/server";

export async function AboutHeroSection() {
  const t = await getTranslations("marketing.about.hero");

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--nd-cream)" }}>
      {/* Decorative leaf SVG */}
      <svg
        className="absolute pointer-events-none"
        style={{ top: -70, right: -50, width: 440, height: 440, opacity: 0.45 }}
        viewBox="0 0 200 200" fill="none"
      >
        <path d="M100 10C40 30 20 90 30 150c50 20 120 0 140-60C150 40 120 18 100 10Z" fill="#E8EDE0" />
      </svg>
      <div className="absolute pointer-events-none" style={{ bottom: -100, left: -70, width: 300, height: 300, borderRadius: "50%", background: "#F3E7DC", opacity: 0.5, filter: "blur(2px)" }} />

      <div className="relative max-w-[820px] mx-auto px-8 py-24 text-center">
        <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
        <h1
          className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-7"
          style={{ fontSize: "clamp(36px, 5vw, 58px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
        >
          {t("title")}
        </h1>
        <p
          className="mx-auto leading-relaxed"
          style={{ fontSize: "clamp(17px,1.3vw,20px)", color: "var(--nd-muted)", maxWidth: "58ch" }}
        >
          {t("subtitle")}
        </p>
      </div>
    </section>
  );
}
