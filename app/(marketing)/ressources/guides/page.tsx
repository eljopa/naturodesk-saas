import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.ressources.guides.meta");
  return { title: t("title"), description: t("description") };
}

export default async function GuidesPage() {
  const t = await getTranslations("marketing.ressources.guides");

  return (
    <>
      <section className="py-20 px-8 text-center" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-[640px] mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
          <h1 className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-4"
            style={{ fontSize: "clamp(34px,4.2vw,52px)", color: "var(--nd-forest)" }}>
            {t("title")}
          </h1>
          <p style={{ fontSize: "clamp(17px,1.3vw,20px)", color: "var(--nd-muted)", lineHeight: 1.65 }}>
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="py-20 px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-[1200px] mx-auto text-center py-16">
          <p className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-playfair),Georgia,serif", color: "var(--nd-forest)" }}>
            {t("emptyTitle")}
          </p>
          <p style={{ color: "var(--nd-muted)" }}>{t("emptyDesc")}</p>
        </div>
      </section>
    </>
  );
}
