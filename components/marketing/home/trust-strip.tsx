import { getTranslations } from "next-intl/server";

export async function TrustStrip() {
  const t = await getTranslations("marketing.home.trust");
  const tools = ["t1","t2","t3","t4","t5","t6","t7"] as const;

  return (
    <section className="py-16 px-8" style={{ background: "var(--nd-cream)", paddingTop: 8 }}>
      <div className="max-w-[1200px] mx-auto">
        <p
          className="text-center mb-6 font-bold text-[13px] tracking-[.1em] uppercase"
          style={{ color: "var(--nd-muted)" }}
        >
          {t("label")}
        </p>
        <div className="flex justify-center items-center gap-3 flex-wrap">
          {tools.map((key) => (
            <span key={key} className="nd-chip nd-chip-line px-[14px] py-[6px] text-[12px]">
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
