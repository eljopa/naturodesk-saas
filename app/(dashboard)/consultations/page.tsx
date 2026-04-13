import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ConsultationStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("consultations") };
}

type StatusFilter = "all" | "draft" | "done";

interface PageProps {
  searchParams: Promise<{ filter?: string; page?: string }>;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "neutral" | "info" }> = {
  DRAFT: { label: "statusDraft", variant: "neutral" },
  READY: { label: "statusReady", variant: "info" },
  ANALYSIS_PENDING: { label: "statusAnalysisPending", variant: "warning" },
  ANALYSIS_RUNNING: { label: "statusAnalysisRunning", variant: "warning" },
  ANALYSIS_DONE: { label: "statusAnalysisDone", variant: "success" },
  ANALYSIS_ERROR: { label: "statusAnalysisError", variant: "default" },
};

export default async function ConsultationsPage({ searchParams }: PageProps) {
  const [user, t, locale, sp] = await Promise.all([
    requireUser(),
    getTranslations("consultations"),
    getLocale(),
    searchParams,
  ]);

  const filter: StatusFilter =
    sp.filter === "draft" || sp.filter === "done" ? sp.filter : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const statusIn: ConsultationStatus[] | undefined =
    filter === "draft"
      ? ["DRAFT", "READY", "ANALYSIS_PENDING", "ANALYSIS_RUNNING"]
      : filter === "done"
      ? ["ANALYSIS_DONE", "ANALYSIS_ERROR"]
      : undefined;

  const statusWhere = statusIn ? { status: { in: statusIn } } : {};
  const baseWhere = { patient: { userId: user.id }, ...statusWhere };

  const [consultations, total] = await Promise.all([
    db.consultation.findMany({
      where: { patient: { userId: user.id }, ...statusWhere },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.consultation.count({ where: baseWhere }),
  ]);

  function buildHref(p: number): string {
    const qs = new URLSearchParams();
    if (filter !== "all") qs.set("filter", filter);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/consultations?${s}` : "/consultations";
  }

  const filters = [
    { key: "all" as const, label: t("filterAll") },
    { key: "draft" as const, label: t("filterDraft") },
    { key: "done" as const, label: t("filterDone") },
  ];

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/consultations/new">
              <Plus className="w-4 h-4" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/consultations" : `/consultations?filter=${f.key}`}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              filter === f.key
                ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {consultations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="w-5 h-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button variant="secondary" size="md" asChild>
                <Link href="/patients">{t("seePatients")}</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {consultations.map((c) => {
              const statusInfo = STATUS_BADGE[c.status] ?? STATUS_BADGE["DRAFT"]!;
              return (
                <li key={c.id}>
                  <Link
                    href={`/consultations/${c.id}`}
                    className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {c.patient.lastName} {c.patient.firstName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.createdAt.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant={statusInfo.variant}>
                      {t(statusInfo.label as Parameters<typeof t>[0])}
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
