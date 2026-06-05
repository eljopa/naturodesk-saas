import { getTranslations } from "next-intl/server";

function Stars() {
  return (
    <div className="flex gap-1 mb-4" style={{ color: "var(--nd-copper)" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
        </svg>
      ))}
    </div>
  );
}

export async function TestimonialsSection() {
  const t = await getTranslations("marketing.home.testimonials");

  const reviews = [
    { quote: t("t1Quote"), name: t("t1Name"), role: t("t1Role") },
    { quote: t("t2Quote"), name: t("t2Name"), role: t("t2Role") },
    { quote: t("t3Quote"), name: t("t3Name"), role: t("t3Role") },
  ];

  return (
    <section className="py-[110px] px-8" style={{ background: "var(--nd-cream-deep)" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h2 className="font-serif font-medium leading-[1.1] tracking-[-0.01em]"
            style={{ fontSize: "clamp(30px,3.6vw,46px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}>
            {t("title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map(({ quote, name, role }) => (
            <figure
              key={name}
              className="rounded-2xl p-8 flex flex-col"
              style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.06)" }}
            >
              <Stars />
              <blockquote
                className="font-serif font-medium leading-[1.45] mb-6 flex-1"
                style={{ fontSize: 19, color: "var(--nd-forest)", margin: 0 }}
              >
                «&nbsp;{quote}&nbsp;»
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-auto">
                <div
                  className="w-[46px] h-[46px] rounded-full grid place-items-center flex-shrink-0 font-extrabold text-[13px]"
                  style={{ background: "linear-gradient(135deg,var(--nd-sage-tint),var(--nd-sage-soft))", color: "var(--nd-sage-deep)" }}
                >
                  {name.charAt(0)}
                </div>
                <div>
                  <div className="font-extrabold text-[14.5px]" style={{ color: "var(--nd-forest)" }}>{name}</div>
                  <div className="text-[13px]" style={{ color: "var(--nd-muted)" }}>{role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
