import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Support — Admin NaturoDesk",
};

type StatusFilter = "all" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type PriorityFilter = "all" | "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface PageProps {
  searchParams: Promise<{ status?: string; priority?: string; userId?: string }>;
}

const STATUS_VARIANT: Record<string, "error" | "warning" | "success" | "neutral" | "info"> = {
  OPEN: "error",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const PRIORITY_VARIANT: Record<string, "error" | "warning" | "neutral" | "default"> = {
  URGENT: "error",
  HIGH: "warning",
  NORMAL: "default",
  LOW: "neutral",
};

export default async function AdminSupportPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

  const statusFilter = (validStatuses as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as StatusFilter)
    : "all";
  const priorityFilter = (validPriorities as readonly string[]).includes(sp.priority ?? "")
    ? (sp.priority as PriorityFilter)
    : "all";
  const userIdFilter = sp.userId || null;

  const tickets = await db.supportTicket.findMany({
    where: {
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
      ...(userIdFilter ? { userId: userIdFilter } : {}),
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } },
    },
  });

  const buildHref = (s: StatusFilter, p: PriorityFilter) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (p !== "all") params.set("priority", p);
    if (userIdFilter) params.set("userId", userIdFilter);
    const str = params.toString();
    return `/admin/support${str ? `?${str}` : ""}`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Support
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          {userIdFilter ? " · filtré par utilisateur" : ""}
        </p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as StatusFilter[]).map((s) => (
          <Link
            key={s}
            href={buildHref(s, priorityFilter)}
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

      {/* Priority filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "URGENT", "HIGH", "NORMAL", "LOW"] as PriorityFilter[]).map((p) => (
          <Link
            key={p}
            href={buildHref(statusFilter, p)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              priorityFilter === p
                ? "border-slate-700 bg-slate-800 text-white font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {p === "all" ? "Toutes les priorités" : p}
          </Link>
        ))}
      </div>

      <Card>
        {tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucun ticket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Titre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Utilisateur
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Priorité
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Réponses
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Créé le
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900 max-w-xs truncate">
                        {t.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Link
                        href={`/admin/users/${t.user.id}`}
                        className="text-sm text-slate-700 hover:text-teal-600 transition-colors"
                      >
                        {t.user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_VARIANT[t.priority] ?? "default"}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status] ?? "neutral"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {t._count.replies}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                      {t.createdAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        Traiter →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
