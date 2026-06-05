import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppMockup } from "./app-mockup";

function CheckIcon({ globe }: { globe?: boolean }) {
  return (
    <span className="flex-shrink-0 w-[26px] h-[26px] rounded-[8px] grid place-items-center mt-0.5" style={{ background: "var(--nd-sage-tint)" }}>
      {globe ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]" style={{ color: "var(--nd-sage-deep)" }}>
          <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[15px] h-[15px]" style={{ color: "var(--nd-sage-deep)" }}>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

export async function PillarActivite() {
  const t = await getTranslations("marketing.home.p2");

  return (
    <section id="activite" className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-[38px] h-[38px] grid place-items-center rounded-full font-serif text-[15px] font-semibold mb-[18px]" style={{ color: "var(--nd-copper)", border: "1px solid var(--nd-copper)" }}>
              {t("num")}
            </div>
            <p className="nd-eyebrow">{t("eyebrow")}</p>
            <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5" style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
              {t("title")}
            </h2>
            <p className="mb-2" style={{ color: "var(--nd-muted)", fontSize: 18, lineHeight: 1.6 }}>{t("subtitle")}</p>

            <ul className="list-none p-0 m-0 mt-7 grid gap-4">
              {([
                { bold: t("l1Bold"), rest: t("l1Rest"), globe: true },
                { bold: t("l2Bold"), rest: t("l2Rest") },
                { bold: t("l3Bold"), rest: t("l3Rest") },
              ] as { bold: string; rest: string; globe?: boolean }[]).map((item, i) => (
                <li key={i} className="flex gap-3 items-start text-[15.5px]" style={{ color: "var(--nd-ink)" }}>
                  <CheckIcon globe={item.globe} />
                  <span><strong style={{ color: "var(--nd-forest)" }}>{item.bold}</strong>{item.rest}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center px-[26px] py-[14px] rounded-full font-bold text-white text-[15px] transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.7)" }}
              >
                {t("cta")}
              </Link>
            </div>
          </div>

          <AppMockup type="pagepro" />
        </div>
      </div>
    </section>
  );
}
