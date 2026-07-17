import { getTranslations } from "next-intl/server";
import { FaqItem } from "./faq-section";

export async function PricingFaqSection() {
  const t = await getTranslations("marketing.home.pricingFaq");
  const items = (["1", "2", "3", "4", "5", "6", "7", "8"] as const).map((n) => ({
    question: t(`q${n}`),
    answer: t(`a${n}`),
  }));

  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
        </div>

        <div className="max-w-[800px] mx-auto">
          {items.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
