import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { BlogCluster } from "@prisma/client";
import { getPublishedArticles } from "@/lib/blog/queries";
import { ALL_BLOG_CLUSTERS, CLUSTER_MESSAGE_KEY } from "@/lib/blog/cluster-labels";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FileText } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.blog.meta");
  return { title: t("title"), description: t("description") };
}

interface BlogPageProps {
  searchParams: Promise<{ cluster?: string; page?: string }>;
}

function buildHref(cluster: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (cluster && cluster !== "all") params.set("cluster", cluster);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { cluster: clusterParam, page: pageParam } = await searchParams;
  const t = await getTranslations("marketing.blog");
  const locale = await getLocale();

  const activeCluster = ALL_BLOG_CLUSTERS.includes(clusterParam as BlogCluster) ? (clusterParam as BlogCluster) : undefined;
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const { items, total, perPage } = await getPublishedArticles(locale, { cluster: activeCluster, page });

  const dateFormatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Header */}
      <section className="py-20 px-8 text-center" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-2xl mx-auto">
          <p className="nd-eyebrow nd-eyebrow--center">Blog</p>
          <h1
            className="font-serif font-medium leading-[1.08] tracking-[-0.02em] mb-5"
            style={{ fontSize: "clamp(32px,4.5vw,54px)", color: "var(--nd-forest)" }}
          >
            {t("title")}
          </h1>
          <p style={{ fontSize: "clamp(16px,1.2vw,19px)", color: "var(--nd-muted)", lineHeight: 1.7 }}>{t("subtitle")}</p>
        </div>
      </section>

      {/* Category filter */}
      <section className="border-b sticky top-16 z-30" style={{ background: "#fff", borderColor: "var(--nd-line-soft)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2 py-3 overflow-x-auto">
          <Link href={buildHref(undefined, 1)} className="nd-chip flex-shrink-0" style={filterChipStyle(!activeCluster)}>
            {t("categories.all")}
          </Link>
          {ALL_BLOG_CLUSTERS.map((cluster) => (
            <Link
              key={cluster}
              href={buildHref(cluster, 1)}
              className="nd-chip flex-shrink-0"
              style={filterChipStyle(activeCluster === cluster)}
            >
              {t(`categories.${CLUSTER_MESSAGE_KEY[cluster]}` as Parameters<typeof t>[0])}
            </Link>
          ))}
        </div>
      </section>

      {/* Articles grid */}
      <section className="py-16 px-4" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-6xl mx-auto">
          {items.length === 0 ? (
            <EmptyState icon={<FileText className="w-6 h-6" />} title={t("emptyTitle")} description={t("emptyDescription")} />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", boxShadow: "0 2px 8px rgba(61,74,51,.05)", textDecoration: "none" }}
                  >
                    <div className="relative w-full aspect-[1200/630]" style={{ background: "var(--nd-sage-tint)" }}>
                      {article.heroImageUrl && (
                        <Image src={article.heroImageUrl} alt={article.title} fill className="object-cover" />
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <span className="nd-chip nd-chip-sage text-[11px] font-extrabold uppercase tracking-[.08em] self-start mb-3">
                        {t(`categories.${CLUSTER_MESSAGE_KEY[article.cluster]}` as Parameters<typeof t>[0])}
                      </span>
                      <h2 className="text-[17px] font-semibold leading-snug mb-2" style={{ color: "var(--nd-forest)" }}>
                        {article.title}
                      </h2>
                      <p className="text-[14px] leading-relaxed mb-4 flex-1" style={{ color: "var(--nd-muted)" }}>
                        {article.excerpt}
                      </p>
                      <p className="text-[13px]" style={{ color: "var(--nd-taupe)" }}>
                        {dateFormatter.format(article.publishedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination
                page={page}
                total={total}
                perPage={perPage}
                buildHref={(p) => buildHref(activeCluster, p)}
                className="mt-10"
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}

function filterChipStyle(active: boolean): CSSProperties {
  return active
    ? { background: "var(--nd-sage-tint)", color: "var(--nd-sage-deep)", textDecoration: "none" }
    : { background: "#fff", color: "var(--nd-muted)", border: "1px solid var(--nd-line)", textDecoration: "none" };
}
