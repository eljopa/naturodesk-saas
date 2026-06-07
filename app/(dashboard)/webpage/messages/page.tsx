import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MessageSearch } from "@/components/messages/message-search";
import { cn } from "@/lib/utils";
import type { ContactMessageStatus } from "@prisma/client";

const PER_PAGE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("messages") };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StatusFilter = "all" | ContactMessageStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "UNREAD", "READ", "REPLIED", "ARCHIVED"];

function statusFilterKey(s: StatusFilter) {
  const map: Record<StatusFilter, string> = {
    all: "filterAll",
    UNREAD: "filterUnread",
    READ: "filterRead",
    REPLIED: "filterReplied",
    ARCHIVED: "filterArchived",
  } as const;
  return map[s];
}

function statusBadgeVariant(status: ContactMessageStatus) {
  const map: Record<ContactMessageStatus, "error" | "neutral" | "success" | "info"> = {
    UNREAD: "error",
    READ: "neutral",
    REPLIED: "success",
    ARCHIVED: "info",
  };
  return map[status];
}

function statusLabelKey(status: ContactMessageStatus): string {
  const map: Record<ContactMessageStatus, string> = {
    UNREAD: "statusUnread",
    READ: "statusRead",
    REPLIED: "statusReplied",
    ARCHIVED: "statusArchived",
  };
  return map[status];
}

function relativeDate(date: Date, locale: string): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes > 0 ? minutes : 1} min`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}j`;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface MessagesPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const [user, t, locale] = await Promise.all([
    requireUser(),
    getTranslations("messages"),
    getLocale(),
  ]);

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const rawStatus = params.status?.toUpperCase() ?? "all";
  const statusFilter: StatusFilter = (
    STATUS_FILTERS.includes(rawStatus as StatusFilter) ? rawStatus : "all"
  ) as StatusFilter;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Base where clause
  const baseWhere = {
    userId: user.id,
    ...(statusFilter !== "all" ? { status: statusFilter as ContactMessageStatus } : {}),
    ...(query
      ? {
          OR: [
            { senderName: { contains: query, mode: "insensitive" as const } },
            { senderEmail: { contains: query, mode: "insensitive" as const } },
            { message: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [messages, total, statusCounts] = await Promise.all([
    db.contactMessage.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        senderName: true,
        senderEmail: true,
        message: true,
        status: true,
        createdAt: true,
      },
    }),
    db.contactMessage.count({ where: baseWhere }),
    // Compteurs par statut pour les tabs
    db.contactMessage.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { status: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count.status])
  ) as Partial<Record<ContactMessageStatus, number>>;
  const totalAll = Object.values(countByStatus).reduce((a, b) => a + (b ?? 0), 0);

  function buildHref(p: number, overrideStatus?: StatusFilter): string {
    const qs = new URLSearchParams();
    const s = overrideStatus ?? statusFilter;
    if (s !== "all") qs.set("status", s.toLowerCase());
    if (query) qs.set("q", query);
    if (p > 1) qs.set("page", String(p));
    const str = qs.toString();
    return str ? `/webpage/messages?${str}` : "/webpage/messages";
  }

  const isEmpty = total === 0;
  const isSearch = query.length > 0;

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {/* Tabs statuts + recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((sf) => {
            const count = sf === "all" ? totalAll : (countByStatus[sf as ContactMessageStatus] ?? 0);
            const isActive = statusFilter === sf;
            return (
              <Link
                key={sf}
                href={buildHref(1, sf)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                  isActive
                    ? "bg-teal-50 border-teal-300 text-teal-700 font-medium"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {t(statusFilterKey(sf) as Parameters<typeof t>[0])}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                      isActive
                        ? sf === "UNREAD"
                          ? "bg-teal-600 text-white"
                          : "bg-teal-100 text-teal-700"
                        : sf === "UNREAD"
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="sm:ml-auto">
          <MessageSearch />
        </div>
      </div>

      {/* Liste */}
      <Card>
        {isEmpty ? (
          <EmptyState
            icon={<Inbox className="w-5 h-5" />}
            title={isSearch ? t("emptySearchTitle") : t("emptyTitle")}
            description={isSearch ? t("emptySearchDescription") : t("emptyDescription")}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <li key={msg.id}>
                  <Link
                    href={`/webpage/messages/${msg.id}`}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    {/* Indicateur non lu */}
                    <div className="mt-1.5 shrink-0">
                      {msg.status === "UNREAD" ? (
                        <span className="block w-2 h-2 rounded-full bg-teal-500" />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium truncate",
                            msg.status === "UNREAD"
                              ? "text-slate-900"
                              : "text-slate-600"
                          )}
                        >
                          {msg.senderName}
                        </span>
                        <span className="text-xs text-slate-400 truncate hidden sm:block">
                          {msg.senderEmail}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {msg.message.slice(0, 140)}
                        {msg.message.length > 140 ? "…" : ""}
                      </p>
                    </div>

                    {/* Méta droite */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs text-slate-400 tabular-nums">
                        {relativeDate(msg.createdAt, locale)}
                      </span>
                      <Badge variant={statusBadgeVariant(msg.status)}>
                        {t(statusLabelKey(msg.status) as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-4">
              <Pagination
                page={page}
                total={total}
                perPage={PER_PAGE}
                buildHref={(p) => buildHref(p)}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
