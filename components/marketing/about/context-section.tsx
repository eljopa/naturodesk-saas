import { getTranslations } from "next-intl/server";
import { PortraitPlaceholder } from "./portrait-placeholder";

export async function AboutContextSection() {
  const t = await getTranslations("marketing.about.context");

  return (
    <section className="py-[100px] px-8" style={{ background: "#fff" }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="grid md:grid-cols-[220px_1fr] gap-14 items-start">
          <div className="flex md:justify-start justify-center">
            <PortraitPlaceholder initials="É" />
          </div>

          <div>
            <p className="nd-eyebrow">{t("eyebrow")}</p>
            <h2
              className="font-serif font-medium leading-[1.15] tracking-[-0.01em] mb-5"
              style={{ fontSize: "clamp(28px,3.2vw,38px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
            >
              {t("title")}
            </h2>
            <p className="mb-4" style={{ color: "var(--nd-muted)", fontSize: 17, lineHeight: 1.75 }}>
              {t("body1")}
            </p>
            <p className="mb-8" style={{ color: "var(--nd-muted)", fontSize: 17, lineHeight: 1.75 }}>
              {t("body2")}
            </p>

            <blockquote
              className="font-serif font-medium leading-[1.4] pl-6"
              style={{ fontSize: 22, color: "var(--nd-forest)", borderLeft: "2.5px solid var(--nd-copper)", margin: 0 }}
            >
              «&nbsp;{t("quote")}&nbsp;»
              <footer className="mt-3 not-italic font-sans" style={{ fontSize: 13.5, color: "var(--nd-muted)", fontWeight: 700 }}>
                — {t("quoteAuthor")}
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
