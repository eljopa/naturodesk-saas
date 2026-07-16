import { getTranslations } from "next-intl/server";
import { PortraitPlaceholder } from "./portrait-placeholder";

export async function AboutOriginSection() {
  const t = await getTranslations("marketing.about.origin");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <section className="py-[100px] px-8" style={{ background: "#fff" }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="max-w-[720px] mb-14">
          <p className="nd-eyebrow">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.15] tracking-[-0.01em] mb-5"
            style={{ fontSize: "clamp(28px,3.2vw,38px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
          <p style={{ color: "var(--nd-muted)", fontSize: 17, lineHeight: 1.75 }}>{t("body")}</p>
        </div>

        {/* Discreet timeline */}
        <div className="relative grid md:grid-cols-4 gap-8 mb-16">
          <div
            className="hidden md:block absolute pointer-events-none"
            style={{ top: 19, left: "12.5%", right: "12.5%", height: 1, background: "var(--nd-line)" }}
          />
          {steps.map(({ title, body }, i) => (
            <div key={title} className="relative">
              <div
                className="w-10 h-10 grid place-items-center rounded-full font-serif text-[14px] font-semibold mb-4 relative"
                style={{ color: "var(--nd-copper)", border: "1px solid var(--nd-copper)", background: "#fff" }}
              >
                {i + 1}
              </div>
              <h3 className="font-serif font-medium mb-2" style={{ fontSize: 17, color: "var(--nd-forest)" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "var(--nd-muted)", lineHeight: 1.65 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Duo portrait */}
        <div
          className="rounded-[24px] p-8 md:p-10 grid sm:grid-cols-2 gap-8"
          style={{ background: "var(--nd-cream)", border: "1px solid var(--nd-line-soft)" }}
        >
          <div className="flex items-center gap-4">
            <PortraitPlaceholder initials="É" size={72} />
            <div>
              <div className="font-serif font-medium" style={{ fontSize: 17, color: "var(--nd-forest)" }}>{t("founderName")}</div>
              <div style={{ fontSize: 13.5, color: "var(--nd-muted)", fontWeight: 600 }}>{t("founderRole")}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <PortraitPlaceholder initials="ND" size={72} />
            <div>
              <div className="font-serif font-medium" style={{ fontSize: 17, color: "var(--nd-forest)" }}>{t("partnerName")}</div>
              <div style={{ fontSize: 13.5, color: "var(--nd-muted)", fontWeight: 600 }}>{t("partnerRole")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
