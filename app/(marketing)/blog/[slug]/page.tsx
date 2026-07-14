import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getArticleBySlug, getRelatedArticles } from "@/lib/blog/queries";
import { CLUSTER_MESSAGE_KEY } from "@/lib/blog/cluster-labels";
import { estimateReadingTimeMinutes } from "@/lib/blog/reading-time";
import { renderBlogBlock } from "@/components/blog/article-blocks";
import { QuickAnswer } from "@/components/blog/quick-answer";
import type { StoredImage } from "@/lib/blog/pipeline/persist-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const article = await getArticleBySlug(slug, locale);
  if (!article) return { title: "Article" };

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      images: article.heroImageUrl ? [article.heroImageUrl] : undefined,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
    },
  };
}

function findImage(images: StoredImage[], slot: string): StoredImage | undefined {
  return images.find((i) => i.slot === slot);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("marketing.blog");

  const article = await getArticleBySlug(slug, locale);
  if (!article) notFound();

  const related = await getRelatedArticles(
    { slug: article.slug, cluster: article.cluster, pillarSlug: article.pillarSlug, relatedSlugs: article.relatedSlugs },
    locale
  );

  const { content, images } = article;
  const readingTime = estimateReadingTimeMinutes(content);
  const dateFormatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const afterIntroImage = findImage(images, "afterIntro");
  const midSectionsImage = findImage(images, "midSections");
  const beforeBlocksImage = findImage(images, "beforeBlocks");
  const beforeConclusionImage = findImage(images, "beforeConclusion");
  const midSectionIndex = Math.floor(content.sections.length / 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    image: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    datePublished: article.publishedAt.toISOString(),
    author: { "@type": "Organization", name: "NaturoDesk" },
    publisher: { "@type": "Organization", name: "NaturoDesk" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <section className="py-16 px-8" style={{ background: "var(--nd-cream-deep)" }}>
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-[14px] font-semibold" style={{ color: "var(--nd-sage-deep)", textDecoration: "none" }}>
            {t("backToBlog")}
          </Link>
          <span className="nd-chip nd-chip-sage text-[11px] font-extrabold uppercase tracking-[.08em] mt-6 mb-4 inline-block">
            {t(`categories.${CLUSTER_MESSAGE_KEY[article.cluster]}` as Parameters<typeof t>[0])}
          </span>
          <h1
            className="font-serif font-medium leading-[1.1] tracking-[-0.02em] mb-4"
            style={{ fontSize: "clamp(28px,4vw,44px)", color: "var(--nd-forest)" }}
          >
            {article.title}
          </h1>
          <p className="text-[14px]" style={{ color: "var(--nd-taupe)" }}>
            {t("publishedOn", { date: dateFormatter.format(article.publishedAt) })} · {t("readingTime", { minutes: readingTime })}
          </p>
        </div>
      </section>

      {/* Hero image */}
      {article.heroImageUrl && (
        <div className="max-w-4xl mx-auto px-8 -mt-8 relative z-10">
          <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden" style={{ boxShadow: "0 20px 40px -20px rgba(61,74,51,.25)" }}>
            <Image src={article.heroImageUrl} alt={article.title} fill className="object-cover" priority />
          </div>
        </div>
      )}

      {/* Body */}
      <article className="py-16 px-8" style={{ background: "var(--nd-cream)" }}>
        <div className="max-w-3xl mx-auto">
          <QuickAnswer label={t("quickAnswerLabel")} text={content.quickAnswer} />

          <p className="text-[17px] leading-relaxed mb-6" style={{ color: "var(--nd-forest)" }}>
            {content.intro}
          </p>

          {afterIntroImage && (
            <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden my-8">
              <Image src={afterIntroImage.url} alt={article.title} fill className="object-cover" />
            </div>
          )}

          {content.sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-serif font-medium mt-10 mb-3" style={{ fontSize: "clamp(20px,2.5vw,26px)", color: "var(--nd-forest)" }}>
                {section.title}
              </h2>
              <p className="text-[16px] leading-relaxed" style={{ color: "var(--nd-muted)" }}>
                {section.body}
              </p>
              {section.list && section.list.length > 0 && (
                <ul className="mt-3 space-y-1.5 list-disc pl-5">
                  {section.list.map((item, j) => (
                    <li key={j} className="text-[15px]" style={{ color: "var(--nd-muted)" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {i === midSectionIndex && midSectionsImage && (
                <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden my-8">
                  <Image src={midSectionsImage.url} alt={article.title} fill className="object-cover" />
                </div>
              )}
            </div>
          ))}

          {beforeBlocksImage && (
            <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden my-8">
              <Image src={beforeBlocksImage.url} alt={article.title} fill className="object-cover" />
            </div>
          )}

          {content.blocks.map((block, i) => renderBlogBlock(block, i))}

          <div className="rounded-2xl p-6 my-8" style={{ background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)" }}>
            <p className="text-[15px] leading-relaxed m-0" style={{ color: "var(--nd-forest)" }}>
              {content.naturodeskContext}
            </p>
          </div>

          {beforeConclusionImage && (
            <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden my-8">
              <Image src={beforeConclusionImage.url} alt={article.title} fill className="object-cover" />
            </div>
          )}

          <p className="text-[16px] leading-relaxed mt-6" style={{ color: "var(--nd-forest)" }}>
            {content.conclusion}
          </p>
        </div>
      </article>

      {/* CTA */}
      <section className="py-16 px-8 text-center" style={{ background: "var(--nd-sage-wash)" }}>
        <div className="max-w-lg mx-auto">
          <h2 className="font-serif font-medium mb-3" style={{ fontSize: "clamp(22px,3vw,30px)", color: "var(--nd-forest)" }}>
            {t("ctaTitle")}
          </h2>
          <p className="mb-6" style={{ color: "var(--nd-muted)", fontSize: 15, lineHeight: 1.65 }}>
            {t("ctaText")}
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-[14px] rounded-full font-bold text-white text-[16px] transition-all duration-200 hover:opacity-90"
            style={{ background: "var(--nd-sage)", boxShadow: "0 10px 24px -10px rgba(94,115,73,.65)" }}
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="py-16 px-8" style={{ background: "var(--nd-cream)" }}>
          <div className="max-w-5xl mx-auto">
            <p className="nd-eyebrow">{t("relatedArticlesTitle")}</p>
            <div className="grid sm:grid-cols-3 gap-5 mt-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: "#fff", border: "1px solid var(--nd-line-soft)", textDecoration: "none" }}
                >
                  <div className="relative w-full aspect-[1200/630]" style={{ background: "var(--nd-sage-tint)" }}>
                    {r.heroImageUrl && <Image src={r.heroImageUrl} alt={r.title} fill className="object-cover" />}
                  </div>
                  <div className="p-4">
                    <p className="text-[14.5px] font-semibold leading-snug m-0" style={{ color: "var(--nd-forest)" }}>
                      {r.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
