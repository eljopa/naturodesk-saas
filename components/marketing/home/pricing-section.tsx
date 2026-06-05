import { getTranslations } from "next-intl/server";
import Link from "next/link";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "var(--nd-sage)" }}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function PricingSection() {
  const t = await getTranslations("marketing.home.pricing");

  return (
    <section id="tarifs" className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-4"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("title")}
          </h2>
          <p style={{ fontSize: "clamp(18px,1.4vw,21px)", color: "var(--nd-muted)", lineHeight: 1.6 }}>{t("subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {/* Plan 1 */}
          <div className="rounded-2xl p-[34px] transition-all duration-200 hover:-translate-y-1" style={{ background: "#fff", border: "1px solid var(--nd-line)" }}>
            <h3 className="font-serif font-medium text-[23px] mb-1.5" style={{ color: "var(--nd-forest)" }}>{t("plan1Name")}</h3>
            <p className="text-[14px] mb-4" style={{ color: "var(--nd-muted)", minHeight: 40 }}>{t("plan1Desc")}</p>
            <div className="font-serif leading-none mb-6" style={{ fontSize: 46, color: "var(--nd-forest)" }}>
              {t("plan1Price")} <small className="text-[15px] font-sans" style={{ color: "var(--nd-muted)", fontWeight: 600 }}>{t("plan1Period")}</small>
            </div>
            <ul className="list-none p-0 m-0 mb-7 grid gap-3">
              {(["plan1L1","plan1L2","plan1L3"] as const).map(k => (
                <li key={k} className="flex gap-2.5 text-[14.5px]" style={{ color: "var(--nd-ink)" }}><CheckIcon />{t(k)}</li>
              ))}
            </ul>
            <Link href="/login" className="flex justify-center items-center w-full py-[14px] rounded-full font-bold text-[15px] transition-all duration-200 hover:border-[var(--nd-sage)]" style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}>
              {t("plan1Cta")}
            </Link>
          </div>

          {/* Plan 2 — featured */}
          <div className="rounded-2xl p-[34px] relative transition-all duration-200 hover:-translate-y-1" style={{ background: "#fff", border: "2px solid var(--nd-sage)", boxShadow: "0 14px 40px -18px rgba(61,74,51,.22)" }}>
            <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 inline-flex items-center px-4 py-1.5 rounded-full text-[11.5px] font-extrabold uppercase tracking-[.08em] text-white" style={{ background: "var(--nd-sage)" }}>
              {t("plan2Badge")}
            </span>
            <h3 className="font-serif font-medium text-[23px] mb-1.5" style={{ color: "var(--nd-forest)" }}>{t("plan2Name")}</h3>
            <p className="text-[14px] mb-4" style={{ color: "var(--nd-muted)", minHeight: 40 }}>{t("plan2Desc")}</p>
            <div className="font-serif leading-none mb-6" style={{ fontSize: 46, color: "var(--nd-forest)" }}>
              {t("plan2Price")} <small className="text-[15px] font-sans" style={{ color: "var(--nd-muted)", fontWeight: 600 }}>{t("plan2Period")}</small>
            </div>
            <ul className="list-none p-0 m-0 mb-7 grid gap-3">
              {(["plan2L1","plan2L2","plan2L3","plan2L4"] as const).map(k => (
                <li key={k} className="flex gap-2.5 text-[14.5px]" style={{ color: "var(--nd-ink)" }}><CheckIcon />{t(k)}</li>
              ))}
            </ul>
            <Link href="/login" className="flex justify-center items-center w-full py-[14px] rounded-full font-bold text-white text-[15px] transition-all duration-200 hover:-translate-y-0.5" style={{ background: "var(--nd-sage)" }}>
              {t("plan2Cta")}
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="rounded-2xl p-[34px] transition-all duration-200 hover:-translate-y-1" style={{ background: "#fff", border: "1px solid var(--nd-line)" }}>
            <h3 className="font-serif font-medium text-[23px] mb-1.5" style={{ color: "var(--nd-forest)" }}>{t("plan3Name")}</h3>
            <p className="text-[14px] mb-4" style={{ color: "var(--nd-muted)", minHeight: 40 }}>{t("plan3Desc")}</p>
            <div className="font-serif leading-none mb-6" style={{ fontSize: 46, color: "var(--nd-forest)" }}>
              {t("plan3Price")} <small className="text-[15px] font-sans" style={{ color: "var(--nd-muted)", fontWeight: 600 }}>{t("plan3Period")}</small>
            </div>
            <ul className="list-none p-0 m-0 mb-7 grid gap-3">
              {(["plan3L1","plan3L2","plan3L3"] as const).map(k => (
                <li key={k} className="flex gap-2.5 text-[14.5px]" style={{ color: "var(--nd-ink)" }}><CheckIcon />{t(k)}</li>
              ))}
            </ul>
            <Link href="/contact" className="flex justify-center items-center w-full py-[14px] rounded-full font-bold text-[15px] transition-all duration-200 hover:border-[var(--nd-sage)]" style={{ background: "transparent", color: "var(--nd-forest)", border: "1.5px solid var(--nd-line)" }}>
              {t("plan3Cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
