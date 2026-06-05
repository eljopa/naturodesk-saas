import { getTranslations } from "next-intl/server";
import { AppMockup } from "./app-mockup";

export async function PillarMoteur() {
  const t = await getTranslations("marketing.home.p3");

  return (
    <section id="moteur" className="py-[110px] px-8" style={{ background: "var(--nd-sage-wash)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Text right */}
          <div className="md:order-2">
            <div className="w-[38px] h-[38px] grid place-items-center rounded-full font-serif text-[15px] font-semibold mb-[18px]" style={{ color: "var(--nd-copper)", border: "1px solid var(--nd-copper)" }}>
              {t("num")}
            </div>
            <p className="nd-eyebrow">{t("eyebrow")}</p>
            <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5" style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
              {t("title")}
            </h2>
            <p style={{ color: "var(--nd-muted)", fontSize: 18, lineHeight: 1.6 }}>{t("subtitle")}</p>

            {/* Decision banner */}
            <div
              className="flex items-center gap-[18px] mt-7 p-5 rounded-2xl"
              style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}
            >
              <span
                className="flex-shrink-0 w-[42px] h-[42px] rounded-[12px] grid place-items-center"
                style={{ background: "#fff", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[22px] h-[22px]" style={{ color: "var(--nd-sage-deep)" }}>
                  <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
                </svg>
              </span>
              <p className="m-0 text-[14.5px] leading-relaxed" style={{ color: "var(--nd-forest)" }}>
                <strong style={{ fontWeight: 800 }}>{t("decisionBold")}</strong>
                {t("decisionRest")}
              </p>
            </div>
          </div>

          {/* Mockup left */}
          <div className="md:order-1">
            <AppMockup type="moteur" />
          </div>
        </div>
      </div>
    </section>
  );
}
