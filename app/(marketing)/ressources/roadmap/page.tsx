import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ComingSoonNotify } from "@/components/marketing/coming-soon-notify";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.ressources.roadmap.meta");
  return { title: t("title"), description: t("description") };
}

export default async function RoadmapPage() {
  const t = await getTranslations("marketing.ressources.roadmap");

  return (
    <section className="min-h-[60vh] flex items-center py-24 px-8" style={{ background: "var(--nd-cream)" }}>
      <div className="max-w-[560px] mx-auto text-center">
        <p className="nd-eyebrow nd-eyebrow--center">{t("eyebrow")}</p>
        <h1 className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-4"
          style={{ fontSize: "clamp(34px,4.2vw,52px)", color: "var(--nd-forest)" }}>
          {t("title")}
        </h1>
        <p className="mb-10" style={{ fontSize: "clamp(17px,1.3vw,20px)", color: "var(--nd-muted)", lineHeight: 1.65 }}>
          {t("subtitle")}
        </p>
        <ComingSoonNotify />
      </div>
    </section>
  );
}
