import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function AboutCtaSection() {
  const t = await getTranslations("marketing.about.cta");

  return (
    <section className="py-[100px] px-8" style={{ background: "#fff" }}>
      <div className="max-w-[640px] mx-auto text-center">
        <h2
          className="font-serif font-medium leading-[1.15] mb-4"
          style={{ fontSize: "clamp(28px,3.4vw,38px)", color: "var(--nd-forest)", textWrap: "balance" } as React.CSSProperties}
        >
          {t("title")}
        </h2>
        <p className="mb-9" style={{ fontSize: 17, color: "var(--nd-muted)", lineHeight: 1.7 }}>
          {t("subtitle")}
        </p>
        <Link
          href="/register"
          className="inline-flex items-center px-[34px] py-[17px] rounded-full font-bold text-white text-[16px] transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.7)" }}
        >
          {t("button")}
        </Link>
      </div>
    </section>
  );
}
