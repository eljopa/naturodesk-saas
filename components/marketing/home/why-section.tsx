import { getTranslations } from "next-intl/server";

export async function WhySection() {
  const t = await getTranslations("marketing.home.why");

  const cards = [
    {
      title: t("c1Title"), desc: t("c1Desc"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>,
    },
    {
      title: t("c2Title"), desc: t("c2Desc"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>,
    },
    {
      title: t("c3Title"), desc: t("c3Desc"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ];

  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map(({ title, desc, icon }) => (
            <div
              key={title}
              className="rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1"
              style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
            >
              <div
                className="w-12 h-12 rounded-[13px] grid place-items-center mb-[18px]"
                style={{ background: "var(--nd-sage-tint)" }}
              >
                <span className="w-[23px] h-[23px]" style={{ color: "var(--nd-sage-deep)" }}>{icon}</span>
              </div>
              <h3 className="font-serif font-medium text-[23px] leading-[1.25] mb-2.5" style={{ color: "var(--nd-forest)" }}>{title}</h3>
              <p className="m-0 text-[15px]" style={{ color: "var(--nd-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
