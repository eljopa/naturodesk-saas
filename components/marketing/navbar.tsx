"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/locale";
import type { Locale } from "@/i18n/request";

/* ── Language switcher ─────────────────────────────── */
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
      className="hidden md:inline-flex items-center rounded-full overflow-hidden text-[13px] font-bold flex-shrink-0"
      style={{ border: "1px solid var(--nd-line)", background: "rgba(255,255,255,.6)" }}
    >
      {(["fr", "en"] as Locale[]).map(lng => (
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

/* ── Dropdown wrapper (hover desktop) ─────────────── */
function DropdownWrapper({
  label,
  children,
  panelWidth = 260,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  panelWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when focus leaves the dropdown area
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-[15px] font-semibold transition-colors duration-150 py-2"
        style={{ color: open ? "var(--nd-sage-deep)" : "var(--nd-ink)", opacity: open ? 1 : 0.82, background: "none", border: "none", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {label}
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none", stroke: "currentColor", strokeWidth: 2 }}>
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 pt-2 z-50"
          style={{ minWidth: panelWidth }}
        >
          <div
            className="rounded-2xl py-3 shadow-xl"
            style={{
              background: "#fff",
              border: "1px solid var(--nd-line)",
              boxShadow: "0 20px 50px -20px rgba(61,74,51,.28), 0 4px 16px rgba(61,74,51,.07)",
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dropdown item ─────────────────────────────────── */
function DropdownItem({
  href,
  icon,
  label,
  desc,
  soon,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  soon?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-2.5 rounded-xl mx-1.5 transition-colors duration-150 ${soon ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--nd-sage-tint)] cursor-pointer"}`}
    >
      <span
        className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 mt-0.5"
        style={{ background: "var(--nd-sage-tint)" }}
      >
        {icon}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold" style={{ color: "var(--nd-forest)" }}>{label}</span>
          {soon && (
            <span className="nd-chip" style={{ background: "#F3E7DC", color: "var(--nd-copper-deep)", fontSize: 10, padding: "2px 7px" }}>
              Bientôt
            </span>
          )}
        </div>
        <span className="text-[12.5px]" style={{ color: "var(--nd-muted)" }}>{desc}</span>
      </div>
    </div>
  );
  return soon ? <div>{inner}</div> : <Link href={href}>{inner}</Link>;
}

/* ── Nav icons (tiny inline SVGs) ──────────────────── */
const si = { width: 16, height: 16, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;
const UsersIc  = () => <svg viewBox="0 0 24 24" style={si}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>;
const PulseIc  = () => <svg viewBox="0 0 24 24" style={si}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>;
const LeafIc   = () => <svg viewBox="0 0 24 24" style={si}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>;
const CalIc    = () => <svg viewBox="0 0 24 24" style={si}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>;
const BillIc   = () => <svg viewBox="0 0 24 24" style={si}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" strokeLinecap="round"/></svg>;
const ShieldIc = () => <svg viewBox="0 0 24 24" style={si}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>;
const GlobeIc  = () => <svg viewBox="0 0 24 24" style={si}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round"/></svg>;
const BookIc   = () => <svg viewBox="0 0 24 24" style={si}><path d="M4 19V5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0 0 4h13v-4" strokeLinecap="round"/></svg>;
const MapIc    = () => <svg viewBox="0 0 24 24" style={si}><path d="M9 3 4 5v16l5-2 6 2 5-2V3l-5 2-6-2Z" strokeLinecap="round"/><path d="M9 3v16M15 5v16" strokeLinecap="round"/></svg>;
const HelpIc   = () => <svg viewBox="0 0 24 24" style={si}><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round"/></svg>;
const VideoIc  = () => <svg viewBox="0 0 24 24" style={si}><path d="m15 10 5-3v10l-5-3V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3Z" strokeLinecap="round"/></svg>;
const FlagIc   = () => <svg viewBox="0 0 24 24" style={si}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" strokeLinecap="round"/></svg>;

/* ── Main component ─────────────────────────────────── */
export function MarketingNav() {
  const t  = useTranslations("marketing.nav");
  const tp = useTranslations("marketing.nav.produitMenu");
  const tr = useTranslations("marketing.nav.ressourcesMenu");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [mobileSub, setMobileSub]     = useState<"produit" | "ressources" | null>(null);
  const [isPending, startTransition]  = useTransition();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", h, { passive: true });
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  function switchLang(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => { await setLocaleAction(next); router.refresh(); });
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: "rgba(250,247,240,.92)",
          backdropFilter: "saturate(140%) blur(14px)",
          borderBottom: scrolled ? "1px solid var(--nd-line)" : "1px solid transparent",
          boxShadow:    scrolled ? "0 6px 24px -18px rgba(61,74,51,.35)" : "none",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-8 flex items-center gap-5 h-[78px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/images/logo-nav.png" alt="NaturoDesk" width={148} height={34} className="h-[34px] w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {/* Produit dropdown — 2 colonnes pour rester compact en hauteur */}
            <DropdownWrapper label={t("produit")} panelWidth={520}>
              <div className="px-1">
                <div className="grid grid-cols-2">
                  {/* Visibilité & clinique group */}
                  <div>
                    <p className="px-4 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-[.1em]"
                      style={{ color: "var(--nd-taupe)" }}>{tp("visibiliteTitle")}</p>
                    <DropdownItem href="/fonctionnalites/page-professionnelle" icon={<GlobeIc/>}  label={tp("pagePro")}     desc={tp("pageProDesc")} />
                    <DropdownItem href="/fonctionnalites/assistance-clinique"  icon={<ShieldIc/>} label={tp("assistance")}  desc={tp("assistanceDesc")} />
                    <DropdownItem href="/fonctionnalites/protocoles"           icon={<LeafIc/>}   label={tp("protocoles")}  desc={tp("protocolesDesc")} />
                  </div>
                  {/* Cabinet group */}
                  <div className="border-l" style={{ borderColor: "var(--nd-line-soft)" }}>
                    <p className="px-4 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-[.1em]"
                      style={{ color: "var(--nd-taupe)" }}>{tp("cabinetTitle")}</p>
                    <DropdownItem href="/fonctionnalites/dossiers-patients"  icon={<UsersIc/>}  label={tp("dossiers")}    desc={tp("dossiersDesc")} />
                    <DropdownItem href="/fonctionnalites/bilans-vitalite"    icon={<PulseIc/>}  label={tp("bilans")}      desc={tp("bilansDesc")} />
                    <DropdownItem href="/fonctionnalites/agenda-rendez-vous" icon={<CalIc/>}    label={tp("agenda")}      desc={tp("agendaDesc")} />
                    <DropdownItem href="/fonctionnalites/facturation"        icon={<BillIc/>}   label={tp("facturation")} desc={tp("facturationDesc")} />
                  </div>
                </div>
                {/* Footer link */}
                <div className="mx-4 mt-2 mb-1 border-t pt-2" style={{ borderColor: "var(--nd-line-soft)" }}>
                  <Link href="/fonctionnalites"
                    className="flex items-center gap-1 text-[13px] font-semibold px-1 py-1 hover:underline"
                    style={{ color: "var(--nd-sage-deep)" }}>
                    {t("fonctionnalites")} →
                  </Link>
                </div>
              </div>
            </DropdownWrapper>

            {/* Fonctionnalités simple link */}
            <Link href="/fonctionnalites"
              className="px-3 py-2 text-[15px] font-semibold transition-colors duration-150 opacity-[0.82] hover:opacity-100"
              style={{ color: "var(--nd-ink)" }}>
              {t("fonctionnalites")}
            </Link>

            {/* Tarifs */}
            <Link href="/tarifs"
              className="px-3 py-2 text-[15px] font-semibold transition-colors duration-150 opacity-[0.82] hover:opacity-100"
              style={{ color: "var(--nd-ink)" }}>
              {t("pricing")}
            </Link>

            {/* Ressources dropdown */}
            <DropdownWrapper label={t("ressources")}>
              <div className="px-1 py-1">
                <DropdownItem href="/blog"                    icon={<BookIc/>}  label={tr("blog")}       desc={tr("blogDesc")} />
                <DropdownItem href="/ressources/guides"       icon={<MapIc/>}   label={tr("guides")}     desc={tr("guidesDesc")} />
                <DropdownItem href="/ressources/centre-aide"  icon={<HelpIc/>}  label={tr("centreAide")} desc={tr("centreAideDesc")} />
                <div className="my-1.5 mx-4 border-t" style={{ borderColor: "var(--nd-line-soft)" }} />
                <DropdownItem href="/ressources/webinaires"   icon={<VideoIc/>} label={tr("webinaires")} desc={tr("webinairesDesc")} soon />
                <DropdownItem href="/ressources/roadmap"      icon={<FlagIc/>}  label={tr("roadmap")}    desc={tr("roadmapDesc")} soon />
              </div>
            </DropdownWrapper>

            {/* À propos */}
            <Link href="/a-propos"
              className="px-3 py-2 text-[15px] font-semibold transition-colors duration-150 opacity-[0.82] hover:opacity-100"
              style={{ color: "var(--nd-ink)" }}>
              {t("about")}
            </Link>
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <LangSwitcher />
            <Link href="/login"
              className="inline-flex items-center px-5 py-[10px] rounded-full text-[15px] font-bold transition-all duration-200 hover:border-[color:var(--nd-sage)]"
              style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}>
              {t("login")}
            </Link>
            <Link href="/register"
              className="inline-flex items-center px-5 py-[10px] rounded-full text-[15px] font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)" }}>
              {t("cta")}
            </Link>
          </div>

          {/* Mobile burger */}
          <button className="md:hidden ml-auto p-2" style={{ color: "var(--nd-forest)" }}
            onClick={() => setOpen(o => !o)}
            aria-label={open ? t("closeMenu") : t("openMenu")}>
            {open
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden fixed inset-x-0 top-[78px] z-49 overflow-y-auto max-h-[calc(100vh-78px)] border-b py-4 px-5 flex flex-col gap-1"
          style={{ background: "var(--nd-cream)", borderColor: "var(--nd-line)", boxShadow: "0 14px 40px -18px rgba(61,74,51,.22)" }}
        >
          {/* Produit section */}
          <button
            className="flex justify-between items-center py-3 px-1 text-[15px] font-bold border-b w-full text-left"
            style={{ color: "var(--nd-forest)", borderColor: "var(--nd-line-soft)", background: "none", border: "none", borderBottom: "1px solid var(--nd-line-soft)", cursor: "pointer" }}
            onClick={() => setMobileSub(s => s === "produit" ? null : "produit")}
          >
            {t("produit")}
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"
              style={{ transform: mobileSub === "produit" ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
              <path d="M4 6l4 4 4-4" strokeLinecap="round"/>
            </svg>
          </button>
          {mobileSub === "produit" && (
            <div className="pl-3 pb-2 flex flex-col gap-0.5">
              {([
                ["/fonctionnalites/page-professionnelle", tp("pagePro")],
                ["/fonctionnalites/assistance-clinique",  tp("assistance")],
                ["/fonctionnalites/protocoles",           tp("protocoles")],
                ["/fonctionnalites/dossiers-patients",    tp("dossiers")],
                ["/fonctionnalites/bilans-vitalite",      tp("bilans")],
                ["/fonctionnalites/agenda-rendez-vous",   tp("agenda")],
                ["/fonctionnalites/facturation",          tp("facturation")],
              ] as [string, string][]).map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="py-2 px-1 text-[14px] font-medium" style={{ color: "var(--nd-ink)" }}>
                  {label}
                </Link>
              ))}
            </div>
          )}

          <Link href="/fonctionnalites" onClick={() => setOpen(false)}
            className="py-3 px-1 text-[15px] font-bold border-b" style={{ color: "var(--nd-forest)", borderColor: "var(--nd-line-soft)" }}>
            {t("fonctionnalites")}
          </Link>
          <Link href="/tarifs" onClick={() => setOpen(false)}
            className="py-3 px-1 text-[15px] font-bold border-b" style={{ color: "var(--nd-forest)", borderColor: "var(--nd-line-soft)" }}>
            {t("pricing")}
          </Link>

          {/* Ressources section */}
          <button
            className="flex justify-between items-center py-3 px-1 text-[15px] font-bold w-full text-left"
            style={{ color: "var(--nd-forest)", background: "none", border: "none", borderBottom: "1px solid var(--nd-line-soft)", cursor: "pointer" }}
            onClick={() => setMobileSub(s => s === "ressources" ? null : "ressources")}
          >
            {t("ressources")}
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"
              style={{ transform: mobileSub === "ressources" ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
              <path d="M4 6l4 4 4-4" strokeLinecap="round"/>
            </svg>
          </button>
          {mobileSub === "ressources" && (
            <div className="pl-3 pb-2 flex flex-col gap-0.5">
              {([
                ["/blog",                   tr("blog")],
                ["/ressources/guides",      tr("guides")],
                ["/ressources/centre-aide", tr("centreAide")],
              ] as [string, string][]).map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="py-2 px-1 text-[14px] font-medium" style={{ color: "var(--nd-ink)" }}>
                  {label}
                </Link>
              ))}
              <span className="py-2 px-1 text-[14px]" style={{ color: "var(--nd-muted)" }}>
                {tr("webinaires")} · {tr("roadmap")} — {tr("soon")}
              </span>
            </div>
          )}

          <Link href="/a-propos" onClick={() => setOpen(false)}
            className="py-3 px-1 text-[15px] font-bold border-b" style={{ color: "var(--nd-forest)", borderColor: "var(--nd-line-soft)" }}>
            {t("about")}
          </Link>

          {/* Mobile lang + CTA */}
          <div className="flex gap-2 mt-3">
            {(["fr", "en"] as Locale[]).map(lng => (
              <button key={lng} onClick={() => { switchLang(lng); setOpen(false); }}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-full text-[14px] font-bold uppercase transition-colors duration-150 disabled:opacity-60"
                style={{ background: locale === lng ? "var(--nd-forest)" : "transparent", color: locale === lng ? "#fff" : "var(--nd-muted)", border: "1px solid var(--nd-line)" }}>
                {lng}
              </button>
            ))}
          </div>
          <Link href="/register" onClick={() => setOpen(false)}
            className="mt-2 flex justify-center items-center py-[13px] rounded-full text-[15px] font-bold text-white"
            style={{ background: "var(--nd-sage)" }}>
            {t("cta")}
          </Link>
        </div>
      )}
    </>
  );
}
