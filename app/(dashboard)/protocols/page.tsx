import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

const PER_PAGE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("protocols") };
}

interface ProtocolsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ProtocolsPage({ searchParams }: ProtocolsPageProps) {
  const [user, t, tCat, sp] = await Promise.all([
    requireUser(),
    getTranslations("protocols"),
    getTranslations("protocols.categories"),
    searchParams,
  ]);

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Protocols are global (not user-scoped in current schema) but access-gated via requireUser
  const [protocols, total] = await Promise.all([
    db.protocolTemplate.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.protocolTemplate.count(),
  ]);

  function buildHref(p: number): string {
    return p > 1 ? `/protocols?page=${p}` : "/protocols";
  }

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/protocols/new">
              <Plus className="w-4 h-4" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      {total === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-5 h-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button variant="secondary" size="md" asChild>
                <Link href="/protocols/new">{t("createCta")}</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {protocols.map((p) => {
              const contentJson = p.contentJson as {
                summary?: string | null;
                content?: string;
              };
              return (
                <li key={p.id}>
                  <Link
                    href={`/protocols/${p.id}/edit`}
                    className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {p.title}
                      </p>
                      {contentJson.summary && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
                          {contentJson.summary}
                        </p>
                      )}
                    </div>
                    <Badge variant="neutral">
                      {tCat(p.category as Parameters<typeof tCat>[0])}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="px-6 pb-4">
            <Pagination page={page} total={total} perPage={PER_PAGE} buildHref={buildHref} />
          </div>
        </Card>
      )}
    </div>
  );
}
