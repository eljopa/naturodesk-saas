"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/locale";
import type { Locale } from "@/i18n/request";

const NAV_LINKS = [
  { href: "/#cabinet",  tKey: "cabinet"  },
  { href: "/#activite", tKey: "activite" },
  { href: "/#moteur",   tKey: "moteur"   },
  { href: "/tarifs",    tKey: "pricing"  },
] as const;

function LangSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className="hidden md:inline-flex items-center rounded-full overflow-hidden text-[13px] font-bold"
      style={{ border: "1px solid var(--nd-line)", background: "rgba(255,255,255,.6)" }}
    >
      {(["fr", "en"] as Locale[]).map((lng) => (
        <button
          key={lng}
          onClick={() => switchTo(lng)}
          disabled={isPending}
          className="px-[13px] py-[7px] uppercase transition-colors duration-150 disabled:opacity-60"
          style={{
            background: locale === lng ? "var(--nd-forest)" : "transparent",
            color:      locale === lng ? "#fff"             : "var(--nd-muted)",
          }}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}

export function MarketingNav() {
  const t = useTranslations("marketing.nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function switchLang(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: "rgba(250,247,240,.88)",
          backdropFilter: "saturate(140%) blur(14px)",
          borderBottom: scrolled ? "1px solid var(--nd-line)" : "1px solid transparent",
          boxShadow:    scrolled ? "0 6px 24px -18px rgba(61,74,51,.35)" : "none",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-8 flex items-center gap-6 h-[78px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo-nav.png"
              alt="NaturoDesk"
              width={148}
              height={34}
              className="h-[34px] w-auto"
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-7 ml-2 flex-1">
            {NAV_LINKS.map(({ href, tKey }) => (
              <Link
                key={tKey}
                href={href}
                className="text-[15px] font-semibold transition-colors duration-150 opacity-[0.82] hover:opacity-100"
                style={{ color: "var(--nd-ink)" }}
              >
                {t(tKey)}
              </Link>
            ))}
          </nav>

          {/* Desktop right: lang + auth */}
          <div className="hidden md:flex items-center gap-3">
            <LangSwitcher />
            <Link
              href="/login"
              className="inline-flex items-center px-5 py-[11px] rounded-full text-[15px] font-bold transition-all duration-200 hover:border-[var(--nd-sage)]"
              style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}
            >
              {t("login")}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-5 py-[11px] rounded-full text-[15px] font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)" }}
            >
              {t("cta")}
            </Link>
          </div>

          {/* Mobile burger */}
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

      {/* Mobile menu */}
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

          {/* Mobile lang switch */}
          <div className="flex gap-2 mt-4">
            {(["fr", "en"] as Locale[]).map((lng) => (
              <button
                key={lng}
                onClick={() => { switchLang(lng); setOpen(false); }}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-full text-[14px] font-bold uppercase transition-colors duration-150 disabled:opacity-60"
                style={{
                  background: locale === lng ? "var(--nd-forest)" : "transparent",
                  color:      locale === lng ? "#fff"             : "var(--nd-muted)",
                  border:     "1px solid var(--nd-line)",
                }}
              >
                {lng}
              </button>
            ))}
          </div>

          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-3 flex justify-center items-center py-[13px] rounded-full text-[15px] font-bold text-white"
            style={{ background: "var(--nd-sage)" }}
          >
            {t("cta")}
          </Link>
        </div>
      )}
    </>
  );
}
