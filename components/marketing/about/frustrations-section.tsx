import { getTranslations } from "next-intl/server";
import { AppMockup } from "../home/app-mockup";

function Dot() {
  return (
    <span
      className="flex-shrink-0 rounded-full mt-[9px]"
      style={{ width: 6, height: 6, background: "var(--nd-copper)" }}
    />
  );
}

export async function AboutFrustrationsSection() {
  const t = await getTranslations("marketing.about.frustrations");

  const items = [
    { label: t("item1Label"), body: t("item1Body") },
    { label: t("item2Label"), body: t("item2Body") },
    { label: t("item3Label"), body: t("item3Body") },
    { label: t("item4Label"), body: t("item4Body") },
  ];

  return (
    <section className="py-[100px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="max-w-[720px] mb-14">
          <p className="nd-eyebrow">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.15] tracking-[-0.01em] mb-5"
            style={{ fontSize: "clamp(28px,3.2vw,38px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
          <p style={{ color: "var(--nd-muted)", fontSize: 17, lineHeight: 1.75 }}>{t("intro")}</p>
        </div>

        <ul className="list-none p-0 m-0 mb-20 grid md:grid-cols-2 gap-x-10 gap-y-6 max-w-[900px]">
          {items.map(({ label, body }) => (
            <li key={label} className="flex gap-3 items-start">
              <Dot />
              <span style={{ fontSize: 15.5, color: "var(--nd-ink)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--nd-forest)" }}>{label}</strong> — {body}
              </span>
            </li>
          ))}
        </ul>

        {/* Safety highlight */}
        <div
          className="rounded-[28px] overflow-hidden"
          style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
        >
          <div className="grid md:grid-cols-2 gap-0 items-center">
            <div className="p-10 md:p-12">
              <p className="nd-eyebrow" style={{ marginBottom: 16 }}>{t("safetyLabel")}</p>
              <h3
                className="font-serif font-medium leading-[1.2] mb-5"
                style={{ fontSize: "clamp(24px,2.6vw,30px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
              >
                {t("safetyTitle")}
              </h3>
              <p className="mb-4" style={{ color: "var(--nd-muted)", fontSize: 16, lineHeight: 1.7 }}>
                {t("safetyBody1")}
              </p>
              <p className="mb-7" style={{ color: "var(--nd-muted)", fontSize: 16, lineHeight: 1.7 }}>
                {t("safetyBody2")}
              </p>
              <blockquote
                className="font-serif font-medium leading-[1.4] pl-5"
                style={{ fontSize: 19, color: "var(--nd-forest)", borderLeft: "2.5px solid var(--nd-copper)", margin: 0 }}
              >
                «&nbsp;{t("safetyQuote")}&nbsp;»
                <footer className="mt-3 not-italic font-sans" style={{ fontSize: 13, color: "var(--nd-muted)", fontWeight: 700 }}>
                  — {t("safetyQuoteAuthor")}
                </footer>
              </blockquote>
            </div>
            <div className="p-8 md:p-10 hidden md:block" style={{ background: "var(--nd-cream-deep)" }}>
              <AppMockup type="moteur" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
