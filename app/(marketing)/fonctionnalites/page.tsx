import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { AppMockup } from "@/components/marketing/home/app-mockup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.fonctionnalites.meta");
  return { title: t("title"), description: t("description") };
}

function CheckIcon() {
  return (
    <span className="flex-shrink-0 w-[26px] h-[26px] rounded-[8px] grid place-items-center mt-0.5" style={{ background: "var(--nd-sage-tint)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[15px] h-[15px]" style={{ color: "var(--nd-sage-deep)" }}>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function FeatureCard({ id, icon, title, desc }: { id: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div id={id} className="flex items-start gap-4 p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.05)" }}>
      <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ background: "var(--nd-sage-tint)" }}>
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-[16px] mb-1" style={{ color: "var(--nd-forest)" }}>{title}</h3>
        <p className="text-[14px] leading-relaxed m-0" style={{ color: "var(--nd-muted)" }}>{desc}</p>
      </div>
    </div>
  );
}

export default async function FonctionnalitesPage() {
  const t  = await getTranslations("marketing.fonctionnalites");
  const tp = await getTranslations("marketing.home.p2");
  const tr = await getTranslations("marketing.home.p3");

  const cabinetFeatures = [
    { id: "dossiers",    icon: <UsersIcon />,  title: t("cabinet.dossiers.title"),    desc: t("cabinet.dossiers.desc") },
    { id: "bilans",      icon: <PulseIcon />,  title: t("cabinet.bilans.title"),      desc: t("cabinet.bilans.desc") },
    { id: "protocoles",  icon: <LeafIcon />,   title: t("cabinet.protocoles.title"),  desc: t("cabinet.protocoles.desc") },
    { id: "agenda",      icon: <CalIcon />,    title: t("cabinet.agenda.title"),      desc: t("cabinet.agenda.desc") },
    { id: "facturation", icon: <BillIcon />,   title: t("cabinet.facturation.title"), desc: t("cabinet.facturation.desc") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="py-20 px-8 text-center" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("hero.eyebrow")}</p>
          <h1 className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-5"
            style={{ fontSize: "clamp(36px,4.5vw,58px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("hero.title")}
          </h1>
          <p style={{ fontSize: "clamp(17px,1.3vw,20px)", color: "var(--nd-muted)", lineHeight: 1.65 }}>
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Cabinet features */}
      <section className="py-[90px] px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <p className="nd-eyebrow">{t("cabinet.eyebrow")}</p>
            <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
              style={{ fontSize: "clamp(28px,3.2vw,40px)", color: "var(--nd-forest)" }}>
              {t("cabinet.title")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {cabinetFeatures.map(f => <FeatureCard key={f.id} {...f} />)}
          </div>
          {/* Agenda mockup */}
          <div className="max-w-[780px]">
            <AppMockup type="agenda" />
          </div>
        </div>
      </section>

      {/* Analyse clinique */}
      <section id="analyse" className="py-[90px] px-8" style={{ background: "var(--nd-sage-wash)" }}>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="md:order-2">
            <p className="nd-eyebrow">{t("analyse.eyebrow")}</p>
            <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5"
              style={{ fontSize: "clamp(28px,3.2vw,40px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
              {t("analyse.title")}
            </h2>
            <p className="mb-6" style={{ color: "var(--nd-muted)", fontSize: 18, lineHeight: 1.65 }}>{t("analyse.desc")}</p>
            <div className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ background: "#fff", border: "1px solid var(--nd-sage-tint)" }}>
              <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ background: "var(--nd-sage-tint)" }}>
                <ShieldIcon />
              </span>
              <p className="text-[14.5px] m-0 leading-relaxed" style={{ color: "var(--nd-forest)" }}>
                <strong style={{ fontWeight: 800 }}>{t("analyse.disclaimer")}</strong>
              </p>
            </div>
          </div>
          <div className="md:order-1">
            <AppMockup type="moteur" />
          </div>
        </div>
      </section>

      {/* Page professionnelle */}
      <section id="page-pro" className="py-[90px] px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="nd-eyebrow">{t("pagePro.eyebrow")}</p>
            <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5"
              style={{ fontSize: "clamp(28px,3.2vw,40px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
              {t("pagePro.title")}
            </h2>
            <p className="mb-7" style={{ color: "var(--nd-muted)", fontSize: 18, lineHeight: 1.65 }}>{t("pagePro.desc")}</p>
            <ul className="list-none p-0 m-0 grid gap-3">
              {(["l1","l2","l3","l4"] as const).map(k => (
                <li key={k} className="flex gap-3 items-start text-[15.5px]" style={{ color: "var(--nd-ink)" }}>
                  <CheckIcon />
                  {t(`pagePro.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <AppMockup type="pagepro" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-[480px] mx-auto">
          <h2 className="font-serif font-medium mb-4" style={{ fontSize: "clamp(26px,3vw,36px)", color: "var(--nd-forest)" }}>
            {tp("cta")}
          </h2>
          <Link href="/login"
            className="inline-flex items-center px-8 py-4 rounded-full font-bold text-white text-[16px] transition-all duration-200 hover:opacity-90"
            style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)" }}>
            S&apos;inscrire gratuitement
          </Link>
        </div>
      </section>
    </>
  );
}

/* Icons */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;
function UsersIcon() { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function PulseIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function LeafIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function CalIcon()   { return <svg viewBox="0 0 24 24" style={ic}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function BillIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" strokeLinecap="round"/></svg>; }
function ShieldIcon(){ return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
