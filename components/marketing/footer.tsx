import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function MarketingFooter() {
  const t = await getTranslations("marketing.footer");
  const year = new Date().getFullYear();

  const linkStyle = { color: "var(--nd-ink)" } as const;
  const linkCls = "text-[14.5px] opacity-80 hover:opacity-100 transition-opacity";

  return (
    <footer style={{ background: "var(--nd-cream-deep)", borderTop: "1px solid var(--nd-line)", padding: "64px 0 36px" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 mb-11">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <Image src="/images/logo-nav.png" alt="NaturoDesk" width={130} height={30} className="h-[30px] w-auto" />
            </Link>
            <p className="text-[14.5px] max-w-[30ch] m-0" style={{ color: "var(--nd-muted)" }}>{t("tagline")}</p>
          </div>

          {/* Produit */}
          <div>
            <ColHead>{t("groups.product")}</ColHead>
            <div className="flex flex-col gap-2.5">
              <Link href="/#cabinet" className={linkCls} style={linkStyle}>{t("links.manage")}</Link>
              <Link href="/#activite" className={linkCls} style={linkStyle}>{t("links.page")}</Link>
              <Link href="/#moteur" className={linkCls} style={linkStyle}>{t("links.engine")}</Link>
              <Link href="/tarifs" className={linkCls} style={linkStyle}>{t("links.pricing")}</Link>
            </div>
          </div>

          {/* Entreprise */}
          <div>
            <ColHead>{t("groups.company")}</ColHead>
            <div className="flex flex-col gap-2.5">
              <Link href="/a-propos" className={linkCls} style={linkStyle}>{t("links.about")}</Link>
              <Link href="/contact" className={linkCls} style={linkStyle}>{t("links.contact")}</Link>
              <Link href="/blog" className={linkCls} style={linkStyle}>{t("links.allPosts")}</Link>
              <Link href="/faq" className={linkCls} style={linkStyle}>{t("links.faq")}</Link>
            </div>
          </div>

          {/* Légal */}
          <div>
            <ColHead>{t("groups.legal")}</ColHead>
            <div className="flex flex-col gap-2.5">
              <Link href="/legal/confidentialite" className={linkCls} style={linkStyle}>{t("links.privacy")}</Link>
              <Link href="/legal/cgu" className={linkCls} style={linkStyle}>{t("links.terms")}</Link>
              <Link href="/legal/mentions" className={linkCls} style={linkStyle}>{t("links.mentions")}</Link>
              <Link href="/legal/cookies" className={linkCls} style={linkStyle}>{t("links.cookies")}</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t"
          style={{ borderColor: "var(--nd-line)", color: "var(--nd-muted)", fontSize: 13.5 }}>
          <span>© {year} NaturoDesk. {t("rights")}</span>
          <span>{t("hosted")}</span>
        </div>
      </div>
    </footer>
  );
}

function ColHead({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[13px] uppercase tracking-[.12em] font-extrabold mb-4"
      style={{ color: "var(--nd-taupe)", fontFamily: "var(--font-mulish),system-ui,sans-serif" }}>
      {children}
    </h4>
  );
}
