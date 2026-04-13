import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit — Admin NaturoDesk",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string; action?: string; target?: string }>;
}

const ACTION_VARIANT: Record<string, "error" | "warning" | "success" | "neutral" | "info" | "default"> = {
  "user.suspend": "error",
  "user.reactivate": "success",
  "subscription.update": "info",
  "ticket.reply": "default",
  "ticket.update": "warning",
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const actionFilter = sp.action?.trim() || null;
  const targetFilter = sp.target?.trim() || null;

  const where = {
    ...(actionFilter ? { action: { contains: actionFilter, mode: "insensitive" as const } } : {}),
    ...(targetFilter ? { targetType: targetFilter } : {}),
  };

  const [total, logs] = await Promise.all([
    db.adminAuditLog.count({ where }),
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (actionFilter) params.set("action", actionFilter);
    if (targetFilter) params.set("target", targetFilter);
    const s = params.toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };

  const targetTypes = ["User", "SupportTicket"];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Journal d&apos;audit
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {total} entrée{total !== 1 ? "s" : ""} · page {page}/{Math.max(1, totalPages)}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={buildHref(1)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
            !targetFilter
              ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          Tout
        </Link>
        {targetTypes.map((type) => {
          const params = new URLSearchParams();
          if (actionFilter) params.set("action", actionFilter);
          params.set("target", type);
          return (
            <Link
              key={type}
              href={`/admin/audit?${params.toString()}`}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                targetFilter === type
                  ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {type}
            </Link>
          );
        })}
      </div>

      <Card>
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucune entrée d&apos;audit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Cible
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Admin
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Détails
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <Badge variant={ACTION_VARIANT[log.action] ?? "default"}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {log.targetType ? (
                        <span>
                          <span className="text-xs font-medium text-slate-500">
                            {log.targetType}
                          </span>
                          {log.targetId && (
                            <span className="text-xs text-slate-400 ml-1 font-mono">
                              {log.targetId.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800">{log.admin.name}</p>
                      <p className="text-xs text-slate-400">{log.admin.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-xs truncate">
                      {log.metaJson
                        ? JSON.stringify(log.metaJson).slice(0, 80)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.createdAt.toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref(page - 1)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref(page + 1)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
