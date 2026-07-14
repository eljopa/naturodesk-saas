import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLUSTER_MESSAGE_KEY } from "@/lib/blog/cluster-labels";
import { BlogGenerateNowButton } from "@/components/admin/blog-generate-now-button";
import { BlogTopicRowActions } from "@/components/admin/blog-topic-row-actions";
import {
  deleteTopicAction,
  publishArticleAction,
  regenerateArticleImagesAction,
  unpublishArticleAction,
} from "@/lib/actions/admin/blog";
import type { BlogArticleStatus, BlogTopicStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Blog — Admin NaturoDesk",
};

type StatusFilter = "all" | BlogTopicStatus;

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const TOPIC_STATUSES: BlogTopicStatus[] = ["REVIEW_REQUIRED", "PLANNED", "GENERATING", "GENERATED", "PUBLISHED", "FAILED"];

const TOPIC_STATUS_VARIANT: Record<BlogTopicStatus, "error" | "warning" | "success" | "neutral" | "info" | "default"> = {
  PLANNED: "neutral",
  GENERATING: "info",
  GENERATED: "info",
  REVIEW_REQUIRED: "warning",
  PUBLISHED: "success",
  FAILED: "error",
};

const ARTICLE_STATUS_VARIANT: Record<BlogArticleStatus, "error" | "warning" | "success" | "neutral" | "info" | "default"> = {
  DRAFT: "neutral",
  REVIEW_REQUIRED: "warning",
  PUBLISHED: "success",
  UNPUBLISHED: "neutral",
  FAILED: "error",
};

function localeBadge(article: { locale: string; status: BlogArticleStatus; qualityScore: number } | undefined) {
  if (!article) {
    return <Badge variant="neutral">— </Badge>;
  }
  return (
    <Badge variant={ARTICLE_STATUS_VARIANT[article.status]}>
      {article.locale.toUpperCase()} · {article.status} · {article.qualityScore}/100
    </Badge>
  );
}

export default async function AdminBlogPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const statusFilter = (TOPIC_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as StatusFilter) : "all";

  const topics = await db.blogTopic.findMany({
    where: statusFilter !== "all" ? { status: statusFilter } : {},
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      articles: {
        select: { id: true, locale: true, status: true, qualityScore: true },
      },
    },
  });

  const buildHref = (s: StatusFilter) => `/admin/blog${s !== "all" ? `?status=${s}` : ""}`;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Blog</h1>
          <p className="text-sm text-slate-500 mt-1">
            {topics.length} sujet{topics.length !== 1 ? "s" : ""}
          </p>
        </div>
        <BlogGenerateNowButton />
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", ...TOPIC_STATUSES] as StatusFilter[]).map((s) => (
          <Link
            key={s}
            href={buildHref(s)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              statusFilter === s
                ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {s === "all" ? "Tous" : s}
          </Link>
        ))}
      </div>

      <Card>
        {topics.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucun sujet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sujet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Cluster
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">FR</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">EN</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topics.map((topic) => {
                  const frArticle = topic.articles.find((a) => a.locale === "fr");
                  const enArticle = topic.articles.find((a) => a.locale === "en");

                  const frAction = frArticle
                    ? frArticle.status === "PUBLISHED"
                      ? { label: "Dépublier FR", action: unpublishArticleAction.bind(null, frArticle.id) }
                      : { label: "Publier FR", action: publishArticleAction.bind(null, frArticle.id) }
                    : undefined;

                  const enAction = enArticle
                    ? enArticle.status === "PUBLISHED"
                      ? { label: "Dépublier EN", action: unpublishArticleAction.bind(null, enArticle.id) }
                      : { label: "Publier EN", action: publishArticleAction.bind(null, enArticle.id) }
                    : undefined;

                  return (
                    <tr key={topic.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900 max-w-xs truncate">{topic.keyword}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{topic.slug}</p>
                        {topic.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={topic.errorMessage}>
                            {topic.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs">
                        {CLUSTER_MESSAGE_KEY[topic.cluster]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TOPIC_STATUS_VARIANT[topic.status]}>{topic.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{localeBadge(frArticle)}</td>
                      <td className="px-4 py-3">{localeBadge(enArticle)}</td>
                      <td className="px-4 py-3">
                        <BlogTopicRowActions
                          frAction={frAction}
                          enAction={enAction}
                          regenerateAction={regenerateArticleImagesAction.bind(null, topic.id)}
                          deleteAction={deleteTopicAction.bind(null, topic.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
