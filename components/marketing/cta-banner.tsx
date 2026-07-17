import Link from "next/link";

interface CtaBannerProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
}

export function CtaBanner({ eyebrow, title, subtitle, ctaPrimary, ctaSecondary }: CtaBannerProps) {
  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div
          className="relative overflow-hidden rounded-[34px] text-center px-16 py-[72px]"
          style={{ background: "var(--nd-forest)", color: "#EEE9DC" }}
        >
          {/* Radial glow SVG */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none" style={{ opacity: 0.9 }}>
            <defs>
              <radialGradient id="cg1" cx="20%" cy="0%" r="80%">
                <stop offset="0%" stopColor="#5E7349" stopOpacity=".7" />
                <stop offset="100%" stopColor="#3D4A33" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="cg2" cx="90%" cy="100%" r="70%">
                <stop offset="0%" stopColor="#B5895F" stopOpacity=".45" />
                <stop offset="100%" stopColor="#3D4A33" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1200" height="400" fill="url(#cg1)" />
            <rect width="1200" height="400" fill="url(#cg2)" />
          </svg>

          <div className="relative">
            {eyebrow && (
              <p className="nd-eyebrow nd-eyebrow--center mb-4" style={{ color: "var(--nd-sand)" }}>
                {eyebrow}
              </p>
            )}
            <h2
              className="font-serif font-medium leading-[1.08] mb-5 text-white"
              style={{ fontSize: "clamp(32px,4vw,52px)", textWrap: "balance" } as React.CSSProperties}
            >
              {title}
            </h2>
            <p style={{ fontSize: "clamp(18px,1.4vw,21px)", color: "rgba(238,233,220,.8)", lineHeight: 1.6, maxWidth: "52ch", margin: "0 auto 36px" }}>
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={ctaPrimary.href}
                className="inline-flex items-center px-[34px] py-[17px] rounded-full font-bold text-[16px] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
                style={{ background: "var(--nd-sand)", color: "var(--nd-forest)" }}
              >
                {ctaPrimary.label}
              </Link>
              <Link
                href={ctaSecondary.href}
                className="inline-flex items-center px-[34px] py-[17px] rounded-full font-bold text-[16px] transition-colors duration-200"
                style={{ background: "transparent", color: "#EEE9DC", border: "1.5px solid rgba(238,233,220,.4)" }}
              >
                {ctaSecondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
