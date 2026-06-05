import { getTranslations } from "next-intl/server";
import { AppMockup } from "./app-mockup";

function CheckIcon() {
  return (
    <span
      className="flex-shrink-0 w-[26px] h-[26px] rounded-[8px] grid place-items-center mt-0.5"
      style={{ background: "var(--nd-sage-tint)" }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[15px] h-[15px]" style={{ color: "var(--nd-sage-deep)" }}>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

interface ListItem { bold: string; rest: string }

function FeatureList({ items }: { items: ListItem[] }) {
  return (
    <ul className="list-none p-0 m-0 mt-7 grid gap-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start text-[15.5px]" style={{ color: "var(--nd-ink)" }}>
          <CheckIcon />
          <span>
            <strong style={{ color: "var(--nd-forest)" }}>{item.bold}</strong>
            {item.rest}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function PillarCabinet() {
  const t = await getTranslations("marketing.home.p1");

  return (
    <section id="cabinet" className="py-[110px] px-8 relative" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="mb-14 max-w-[640px]">
          <div
            className="w-[38px] h-[38px] grid place-items-center rounded-full font-serif text-[15px] font-semibold mb-[18px]"
            style={{ color: "var(--nd-copper)", border: "1px solid var(--nd-copper)" }}
          >
            {t("num")}
          </div>
          <p className="nd-eyebrow">{t("eyebrow")}</p>
          <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5" style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("title")}
          </h2>
          <p style={{ color: "var(--nd-muted)", fontSize: "clamp(18px,1.4vw,21px)", lineHeight: 1.6 }}>{t("subtitle")}</p>
        </div>

        {/* Feature 1 — text left, mockup right */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <h3 className="font-serif font-medium leading-[1.25] mb-2.5 text-[23px]" style={{ color: "var(--nd-forest)" }}>{t("f1Title")}</h3>
            <p style={{ color: "var(--nd-muted)" }}>{t("f1Desc")}</p>
            <FeatureList items={[
              { bold: t("f1L1Bold"), rest: t("f1L1Rest") },
              { bold: t("f1L2Bold"), rest: t("f1L2Rest") },
              { bold: t("f1L3Bold"), rest: t("f1L3Rest") },
            ]} />
          </div>
          <AppMockup type="agenda" />
        </div>

        {/* Feature 2 — mockup left, text right */}
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="md:order-2">
            <h3 className="font-serif font-medium leading-[1.25] mb-2.5 text-[23px]" style={{ color: "var(--nd-forest)" }}>{t("f2Title")}</h3>
            <p style={{ color: "var(--nd-muted)" }}>{t("f2Desc")}</p>
            <FeatureList items={[
              { bold: t("f2L1Bold"), rest: t("f2L1Rest") },
              { bold: t("f2L2Bold"), rest: t("f2L2Rest") },
              { bold: t("f2L3Bold"), rest: t("f2L3Rest") },
            ]} />
          </div>
          <div className="md:order-1">
            <AppMockup type="fiche" />
          </div>
        </div>
      </div>
    </section>
  );
}
