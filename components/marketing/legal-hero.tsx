import type { ReactNode } from "react";

interface LegalHeroProps {
  icon: ReactNode;
  title: string;
  lastUpdated?: string;
}

/** En-tête partagé des pages légales (CGU, confidentialité, cookies, mentions). */
export function LegalHero({ icon, title, lastUpdated }: LegalHeroProps) {
  return (
    <section className="py-16 px-8 text-center" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5" style={{ background: "var(--nd-sage-tint)" }}>
          {icon}
        </div>
        <h1
          className="font-serif font-medium leading-[1.1] tracking-[-0.02em]"
          style={{ fontSize: "clamp(28px,4vw,42px)", color: "var(--nd-forest)" }}
        >
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-sm mt-3" style={{ color: "var(--nd-taupe)" }}>
            {lastUpdated}
          </p>
        )}
      </div>
    </section>
  );
}
