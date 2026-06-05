"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/#cabinet",  tKey: "cabinet" },
  { href: "/#activite", tKey: "activite" },
  { href: "/#moteur",   tKey: "moteur" },
  { href: "/tarifs",    tKey: "pricing" },
] as const;

export function MarketingNav() {
  const t = useTranslations("marketing.nav");
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: "rgba(250,247,240,.88)",
          backdropFilter: "saturate(140%) blur(14px)",
          borderBottom: scrolled ? "1px solid var(--nd-line)" : "1px solid transparent",
          boxShadow: scrolled ? "0 6px 24px -18px rgba(61,74,51,.35)" : "none",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-8 flex items-center gap-7 h-[78px]">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image
              src="/images/logo-nav.png"
              alt="NaturoDesk"
              width={148}
              height={34}
              className="h-[34px] w-auto"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 ml-3">
            {NAV_LINKS.map(({ href, tKey }) => (
              <Link
                key={tKey}
                href={href}
                className="text-[15px] font-semibold transition-colors duration-150"
                style={{ color: "var(--nd-ink)", opacity: 0.82 }}
                onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "1"; (e.target as HTMLElement).style.color = "var(--nd-sage-deep)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "0.82"; (e.target as HTMLElement).style.color = "var(--nd-ink)"; }}
              >
                {t(tKey)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3.5 ml-auto">
            <Link
              href="/login"
              className="inline-flex items-center px-5 py-[13px] rounded-full text-[15px] font-bold transition-all duration-200"
              style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}
            >
              {t("login")}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-5 py-[13px] rounded-full text-[15px] font-bold text-white transition-all duration-200"
              style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)" }}
            >
              {t("cta")}
            </Link>
          </div>

          <button
            className="md:hidden ml-auto p-2 rounded-lg"
            style={{ color: "var(--nd-forest)" }}
            onClick={() => setOpen(o => !o)}
            aria-label={open ? t("closeMenu") : t("openMenu")}
          >
            {open
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            }
          </button>
        </div>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-x-0 top-[78px] z-49 border-b py-5 px-6 flex flex-col gap-1"
          style={{ background: "var(--nd-cream)", borderColor: "var(--nd-line)", boxShadow: "0 14px 40px -18px rgba(61,74,51,.22)" }}
        >
          {NAV_LINKS.map(({ href, tKey }) => (
            <Link
              key={tKey}
              href={href}
              onClick={() => setOpen(false)}
              className="py-3 px-1 text-[15px] font-bold border-b"
              style={{ color: "var(--nd-forest)", borderColor: "var(--nd-line-soft)" }}
            >
              {t(tKey)}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-4 flex justify-center items-center py-[13px] rounded-full text-[15px] font-bold text-white"
            style={{ background: "var(--nd-sage)" }}
          >
            {t("cta")}
          </Link>
        </div>
      )}
    </>
  );
}
