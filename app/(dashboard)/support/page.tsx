import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { NewTicketForm } from "@/components/support/new-ticket-form";
import { cn } from "@/lib/utils";
import type { SupportTicketStatus } from "@prisma/client";

const PER_PAGE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("support") };
}

type StatusFilter = "all" | SupportTicketStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function statusFilterKey(s: StatusFilter): string {
  const map: Record<StatusFilter, string> = {
    all: "filterAll",
    OPEN: "statusOpen",
    IN_PROGRESS: "statusInProgress",
    RESOLVED: "statusResolved",
    CLOSED: "statusClosed",
  };
  return map[s];
}

function statusBadgeVariant(status: SupportTicketStatus) {
  const map: Record<SupportTicketStatus, "error" | "info" | "success" | "neutral"> = {
    OPEN: "error",
    IN_PROGRESS: "info",
    RESOLVED: "success",
    CLOSED: "neutral",
  };
  return map[status];
}

interface SupportPageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const [user, t, locale] = await Promise.all([requireUser(), getTranslations("support"), getLocale()]);

  const params = await searchParams;
  const rawStatus = params.status?.toUpperCase() ?? "all";
  const statusFilter: StatusFilter = (
    STATUS_FILTERS.includes(rawStatus as StatusFilter) ? rawStatus : "all"
  ) as StatusFilter;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const baseWhere = {
    userId: user.id,
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
  };

  const [tickets, total, statusCounts] = await Promise.all([
    db.supportTicket.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        _count: { select: { replies: true } },
      },
    }),
    db.supportTicket.count({ where: baseWhere }),
    db.supportTicket.groupBy({ by: ["status"], where: { userId: user.id }, _count: { status: true } }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count.status])
  ) as Partial<Record<SupportTicketStatus, number>>;
  const totalAll = Object.values(countByStatus).reduce((a, b) => a + (b ?? 0), 0);

  function buildHref(p: number, overrideStatus?: StatusFilter): string {
    const qs = new URLSearchParams();
    const s = overrideStatus ?? statusFilter;
    if (s !== "all") qs.set("status", s.toLowerCase());
    if (p > 1) qs.set("page", String(p));
    const str = qs.toString();
    return str ? `/support?${str}` : "/support";
  }

  const isEmpty = total === 0;

  return (
    <div>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <NewTicketForm />

      <div className="flex flex-wrap gap-1.5 mb-6">
        {STATUS_FILTERS.map((sf) => {
          const count = sf === "all" ? totalAll : (countByStatus[sf as SupportTicketStatus] ?? 0);
          const isActive = statusFilter === sf;
          return (
            <Link
              key={sf}
              href={buildHref(1, sf)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                isActive
                  ? "bg-nd-sage-tint border-nd-sage text-nd-sage-deep font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {t(statusFilterKey(sf) as Parameters<typeof t>[0])}
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                    isActive ? "bg-nd-sage text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <Card>
        {isEmpty ? (
          <EmptyState icon={<LifeBuoy className="w-5 h-5" />} title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/support/${ticket.id}`}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ticket.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ticket.createdAt.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                        {ticket._count.replies > 0 && ` · ${t("repliesCount", { count: ticket._count.replies })}`}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(ticket.status)}>
                      {t(statusFilterKey(ticket.status) as Parameters<typeof t>[0])}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-4">
              <Pagination page={page} total={total} perPage={PER_PAGE} buildHref={(p) => buildHref(p)} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
