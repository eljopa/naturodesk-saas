import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.blog.meta");
  return { title: t("title"), description: t("description") };
}

const CATEGORIES = ["all", "practice", "software", "naturopathy", "business"] as const;

export default async function BlogPage() {
  const t = await getTranslations("marketing.blog");

  return (
    <>
      {/* Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
        </div>
      </section>

      {/* Category filter */}
      <section className="border-b border-slate-200 bg-white sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 py-3 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors data-[active=true]:bg-teal-700 data-[active=true]:text-white"
              data-active={cat === "all"}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Articles grid — empty state */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <p className="text-2xl font-semibold text-slate-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-slate-500">{t("emptyDescription")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
