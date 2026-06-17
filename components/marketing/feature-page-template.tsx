import type { ReactNode } from "react";
import Link from "next/link";
import { FeatureAccordion, type FaqItem } from "./feature-accordion";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface RelatedFeature {
  label: string;
  href: string;
  icon: ReactNode;
}

export interface FeatureStep {
  title: string;
  description: string;
}

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface FeatureStat {
  value: string;
  label: string;
}

export interface FeaturePageTemplateProps {
  featureName: string;
  category: string;
  heroIcon: ReactNode;
  title: string;
  subtitle: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  presentationTitle: string;
  presentationText: string;
  presentationStats?: FeatureStat[];
  features: FeatureItem[];
  steps: FeatureStep[];
  faqs: FaqItem[];
  relatedFeatures: RelatedFeature[];
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function FeatureCard({ icon, title, description }: FeatureItem) {
  return (
    <div
      className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "#fff",
        border: "1px solid var(--nd-line-soft)",
        boxShadow: "0 2px 8px rgba(61,74,51,.05)",
      }}
    >
      <span
        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
        style={{ background: "var(--nd-sage-tint)" }}
      >
        {icon}
      </span>
      <div>
        <h3
          className="font-semibold text-[16px] mb-2"
          style={{ color: "var(--nd-forest)" }}
        >
          {title}
        </h3>
        <p
          className="text-[14px] leading-relaxed m-0"
          style={{ color: "var(--nd-muted)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function StepItem({ step, title, description }: FeatureStep & { step: number }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full grid place-items-center font-bold text-[14px] flex-shrink-0"
          style={{
            background: "var(--nd-sage)",
            color: "#fff",
            boxShadow: "0 6px 16px rgba(121,150,100,.35)",
          }}
        >
          {step}
        </div>
        <div
          className="w-px flex-1 mt-3"
          style={{ background: "var(--nd-line-soft)", minHeight: 32 }}
        />
      </div>
      <div className="pb-8">
        <h3
          className="font-semibold text-[16px] mb-1.5"
          style={{ color: "var(--nd-forest)" }}
        >
          {title}
        </h3>
        <p
          className="text-[14.5px] leading-relaxed m-0"
          style={{ color: "var(--nd-muted)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function RelatedCard({ label, href, icon }: RelatedFeature) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group"
      style={{
        background: "#fff",
        border: "1px solid var(--nd-line-soft)",
        boxShadow: "0 2px 8px rgba(61,74,51,.04)",
        textDecoration: "none",
      }}
    >
      <span
        className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
        style={{ background: "var(--nd-sage-tint)" }}
      >
        {icon}
      </span>
      <span
        className="text-[14px] font-semibold"
        style={{ color: "var(--nd-forest)" }}
      >
        {label}
      </span>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 14, height: 14, stroke: "var(--nd-sage-deep)", strokeWidth: 2 }}
      >
        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/* ── Main template ──────────────────────────────────────────────────────── */

export function FeaturePageTemplate({
  featureName,
  category,
  heroIcon,
  title,
  subtitle,
  ctaPrimary = { label: "Démarrer gratuitement", href: "/register" },
  ctaSecondary = { label: "Voir les tarifs", href: "/tarifs" },
  presentationTitle,
  presentationText,
  presentationStats,
  features,
  steps,
  faqs,
  relatedFeatures,
}: FeaturePageTemplateProps) {
  const ic = {
    width: 18,
    height: 18,
    stroke: "currentColor",
    fill: "none",
    strokeWidth: 2,
    color: "var(--nd-sage-deep)",
  } as const;

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-8"
        style={{ background: "var(--nd-cream-deep)" }}
      >
        <div className="max-w-[720px] mx-auto text-center">
          {/* Category chip */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span
              className="nd-chip nd-chip-sage text-[12px] font-extrabold uppercase tracking-[.1em]"
            >
              {category}
            </span>
          </div>

          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-6"
            style={{
              background: "var(--nd-sage-tint)",
              boxShadow: "0 10px 28px rgba(121,150,100,.25)",
            }}
          >
            {heroIcon}
          </div>

          {/* H1 */}
          <h1
            className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-5"
            style={{
              fontSize: "clamp(32px,4.5vw,54px)",
              color: "var(--nd-forest)",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            className="mb-8"
            style={{
              fontSize: "clamp(16px,1.2vw,19px)",
              color: "var(--nd-muted)",
              lineHeight: 1.7,
              maxWidth: 580,
              margin: "0 auto 32px",
            }}
          >
            {subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaPrimary.href}
              className="inline-flex items-center px-7 py-[13px] rounded-full font-bold text-white text-[15px] transition-all duration-200 hover:opacity-90"
              style={{
                background: "var(--nd-sage)",
                boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)",
              }}
            >
              {ctaPrimary.label}
            </Link>
            <Link
              href={ctaSecondary.href}
              className="inline-flex items-center px-7 py-[12px] rounded-full font-bold text-[15px] transition-all duration-200"
              style={{
                background: "transparent",
                color: "var(--nd-forest)",
                border: "1.5px solid var(--nd-line)",
              }}
            >
              {ctaSecondary.label}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Présentation ─────────────────────────────────────────────── */}
      <section className="py-[80px] px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1100px] mx-auto">
          <div
            className={`grid gap-10 items-center ${presentationStats ? "md:grid-cols-[1fr_340px]" : "max-w-[700px]"}`}
          >
            <div>
              <p className="nd-eyebrow">{featureName}</p>
              <h2
                className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5"
                style={{ fontSize: "clamp(26px,3vw,38px)", color: "var(--nd-forest)" }}
              >
                {presentationTitle}
              </h2>
              <p
                className="text-[16.5px] leading-relaxed"
                style={{ color: "var(--nd-muted)" }}
              >
                {presentationText}
              </p>
            </div>

            {presentationStats && (
              <div className="grid grid-cols-2 gap-4">
                {presentationStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-5 rounded-2xl text-center"
                    style={{
                      background: "#fff",
                      border: "1px solid var(--nd-line-soft)",
                      boxShadow: "0 2px 8px rgba(61,74,51,.05)",
                    }}
                  >
                    <div
                      className="font-serif font-medium text-[32px] mb-1"
                      style={{ color: "var(--nd-sage-deep)" }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-[12.5px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--nd-taupe)" }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Fonctionnalités ──────────────────────────────────────────── */}
      <section className="py-[80px] px-8" style={{ background: "var(--nd-sage-wash)" }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-10">
            <p className="nd-eyebrow">Fonctionnalités</p>
            <h2
              className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
              style={{ fontSize: "clamp(26px,3vw,38px)", color: "var(--nd-forest)" }}
            >
              Ce que vous pouvez faire
            </h2>
          </div>
          <div
            className={`grid gap-5 ${
              features.length <= 3
                ? "md:grid-cols-3"
                : features.length === 4
                ? "md:grid-cols-2 lg:grid-cols-4"
                : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Comment ça fonctionne ────────────────────────────────────── */}
      <section className="py-[80px] px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-[1fr_420px] gap-14 items-start">
          <div>
            <p className="nd-eyebrow">En pratique</p>
            <h2
              className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-10"
              style={{ fontSize: "clamp(26px,3vw,38px)", color: "var(--nd-forest)" }}
            >
              Comment ça fonctionne
            </h2>
            <div>
              {steps.map((step, i) => (
                <StepItem key={i} step={i + 1} {...step} />
              ))}
            </div>
          </div>

          {/* Placeholder visuel */}
          <div
            className="rounded-2xl overflow-hidden flex-shrink-0 sticky top-24"
            style={{
              background: "var(--nd-sage-tint)",
              border: "1px solid var(--nd-line-soft)",
              height: 340,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="text-center px-8">
              <div
                className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
                style={{ background: "var(--nd-sage-wash)" }}
              >
                {heroIcon}
              </div>
              <p
                className="text-[13px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--nd-sage-deep)" }}
              >
                {featureName}
              </p>
              <p
                className="text-[12px] mt-1"
                style={{ color: "var(--nd-taupe)" }}
              >
                Aperçu à venir
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-[80px] px-8" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-[720px] mx-auto">
          <div className="mb-10 text-center">
            <p className="nd-eyebrow nd-eyebrow--center">Questions fréquentes</p>
            <h2
              className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
              style={{ fontSize: "clamp(26px,3vw,38px)", color: "var(--nd-forest)" }}
            >
              Tout ce que vous voulez savoir
            </h2>
          </div>
          <FeatureAccordion items={faqs} />
        </div>
      </section>

      {/* ── 6. Fonctionnalités associées ────────────────────────────────── */}
      <section className="py-[80px] px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-8">
            <p className="nd-eyebrow">Maillage produit</p>
            <h2
              className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
              style={{ fontSize: "clamp(22px,2.5vw,32px)", color: "var(--nd-forest)" }}
            >
              Fonctionnalités associées
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {relatedFeatures.map((rf) => (
              <RelatedCard key={rf.href} {...rf} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. CTA final ────────────────────────────────────────────────── */}
      <section
        className="py-20 px-8 text-center"
        style={{ background: "var(--nd-sage-wash)" }}
      >
        <div className="max-w-[540px] mx-auto">
          <h2
            className="font-serif font-medium mb-4"
            style={{ fontSize: "clamp(24px,3vw,36px)", color: "var(--nd-forest)" }}
          >
            Prêt à simplifier votre cabinet&nbsp;?
          </h2>
          <p
            className="mb-8"
            style={{ color: "var(--nd-muted)", fontSize: 16, lineHeight: 1.65 }}
          >
            Essayez NaturoDesk gratuitement. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-[14px] rounded-full font-bold text-white text-[16px] transition-all duration-200 hover:opacity-90"
              style={{
                background: "var(--nd-sage)",
                boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)",
              }}
            >
              Démarrer gratuitement
            </Link>
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center px-8 py-[13px] rounded-full font-bold text-[16px] transition-all duration-200"
              style={{
                background: "transparent",
                color: "var(--nd-forest)",
                border: "1.5px solid var(--nd-line)",
              }}
            >
              Toutes les fonctionnalités
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
