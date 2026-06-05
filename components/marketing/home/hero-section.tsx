import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppMockup } from "./app-mockup";

export async function HeroSection() {
  const t = await getTranslations("marketing.home.hero");

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--nd-cream)" }}
    >
      {/* Decorative leaf SVG */}
      <svg
        className="absolute pointer-events-none"
        style={{ top: -80, right: -60, width: 520, height: 520, opacity: 0.5 }}
        viewBox="0 0 200 200" fill="none"
      >
        <path d="M100 10C40 30 20 90 30 150c50 20 120 0 140-60C150 40 120 18 100 10Z" fill="#E8EDE0" />
      </svg>
      {/* Warm blob */}
      <div className="absolute pointer-events-none" style={{ bottom: -120, left: -80, width: 340, height: 340, borderRadius: "50%", background: "#F3E7DC", opacity: 0.55, filter: "blur(2px)" }} />

      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid md:grid-cols-[1.04fr_1fr] gap-14 items-center py-24">
          {/* Left copy */}
          <div>
            <div className="flex gap-2.5 mb-6">
              <span
                className="inline-flex items-center gap-2 px-[15px] py-[7px] rounded-full text-[13px] font-bold"
                style={{ background: "#fff", border: "1px solid var(--nd-line)", color: "var(--nd-forest)", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]" style={{ color: "var(--nd-sage)" }}>
                  <path d="M12 3v18M5 8l7-5 7 5" />
                </svg>
                {t("badge")}
              </span>
            </div>

            <h1
              className="font-serif font-medium leading-[1.04] tracking-[-0.02em] mb-6"
              style={{ fontSize: "clamp(40px, 5.4vw, 68px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
            >
              {t("headline")}
            </h1>

            <p
              className="mb-8 leading-relaxed"
              style={{ fontSize: "clamp(18px,1.4vw,21px)", color: "var(--nd-muted)", maxWidth: "52ch" }}
            >
              {t("subtitle")}
            </p>

            <div className="flex flex-wrap gap-3.5 items-center mb-5">
              <Link
                href="/login"
                className="inline-flex items-center px-[34px] py-[17px] rounded-full font-bold text-white text-[16px] transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.7)" }}
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="/#cabinet"
                className="inline-flex items-center px-[34px] py-[17px] rounded-full font-bold text-[16px] transition-all duration-200 hover:border-[var(--nd-sage)]"
                style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}
              >
                {t("ctaSecondary")}
              </Link>
            </div>

            <div className="flex items-center gap-2" style={{ color: "var(--nd-muted)", fontSize: 14, fontWeight: 600 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" style={{ color: "var(--nd-sage)" }}>
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("trust")}
            </div>
          </div>

          {/* Right: app mockup */}
          <div className="relative hidden md:block">
            <AppMockup type="agenda" />
          </div>
        </div>
      </div>
    </section>
  );
}
