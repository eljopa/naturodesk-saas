import { getTranslations } from "next-intl/server";

export async function AboutPhilosophySection() {
  const t = await getTranslations("marketing.about.philosophy");

  const cards = [
    {
      title: t("v1Title"), desc: t("v1Body"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>,
    },
    {
      title: t("v2Title"), desc: t("v2Body"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>,
    },
    {
      title: t("v3Title"), desc: t("v3Body"),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11a3 3 0 0 0 0-6" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16 max-w-[680px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2
            className="font-serif font-medium leading-[1.1] tracking-[-0.01em] mb-5"
            style={{ fontSize: "clamp(30px,3.6vw,44px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
          >
            {t("title")}
          </h2>
          <p style={{ color: "var(--nd-muted)", fontSize: 17, lineHeight: 1.75 }}>{t("body")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map(({ title, desc, icon }) => (
            <div
              key={title}
              className="rounded-2xl p-7"
              style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
            >
              <div
                className="w-12 h-12 rounded-[13px] grid place-items-center mb-[18px]"
                style={{ background: "var(--nd-sage-tint)" }}
              >
                <span className="w-[23px] h-[23px]" style={{ color: "var(--nd-sage-deep)" }}>{icon}</span>
              </div>
              <h3 className="font-serif font-medium text-[20px] leading-[1.25] mb-2.5" style={{ color: "var(--nd-forest)" }}>{title}</h3>
              <p className="m-0 text-[15px]" style={{ color: "var(--nd-muted)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
