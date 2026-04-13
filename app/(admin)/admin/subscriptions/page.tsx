import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Abonnements — Admin NaturoDesk",
};

type PlanFilter = "all" | "FREE" | "PRO";
type StatusFilter = "all" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";

interface PageProps {
  searchParams: Promise<{ plan?: string; status?: string }>;
}

const PLAN_VARIANT: Record<string, "default" | "info"> = {
  FREE: "default",
  PRO: "info",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral" | "info"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "neutral",
  SUSPENDED: "error",
};

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const validPlans = ["FREE", "PRO"] as const;
  const validStatuses = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"] as const;

  const planFilter = (validPlans as readonly string[]).includes(sp.plan ?? "")
    ? (sp.plan as PlanFilter)
    : "all";
  const statusFilter = (validStatuses as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as StatusFilter)
    : "all";

  const subscriptions = await db.subscription.findMany({
    where: {
      ...(planFilter !== "all" ? { plan: planFilter } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { id: true, name: true, email: true, cabinetName: true, isActive: true },
      },
    },
  });

  // Users without subscription (FREE by default)
  const usersWithoutSub = await db.user.count({
    where: { role: "PRACTITIONER", deletedAt: null, subscription: null },
  });

  const planFilterHref = (p: PlanFilter) => {
    const params = new URLSearchParams();
    if (p !== "all") params.set("plan", p);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const s = params.toString();
    return `/admin/subscriptions${s ? `?${s}` : ""}`;
  };

  const statusFilterHref = (s: StatusFilter) => {
    const params = new URLSearchParams();
    if (planFilter !== "all") params.set("plan", planFilter);
    if (s !== "all") params.set("status", s);
    const str = params.toString();
    return `/admin/subscriptions${str ? `?${str}` : ""}`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Abonnements
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {subscriptions.length} abonnement{subscriptions.length !== 1 ? "s" : ""} explicites
          {usersWithoutSub > 0 && ` · ${usersWithoutSub} praticien${usersWithoutSub > 1 ? "s" : ""} sans abonnement (FREE implicite)`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "FREE", "PRO"] as PlanFilter[]).map((p) => (
          <Link
            key={p}
            href={planFilterHref(p)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              planFilter === p
                ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {p === "all" ? "Tous les plans" : p}
          </Link>
        ))}
        <div className="w-px h-5 bg-slate-200 self-center mx-1" />
        {(["all", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"] as StatusFilter[]).map((s) => (
          <Link
            key={s}
            href={statusFilterHref(s)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              statusFilter === s
                ? "border-slate-700 bg-slate-800 text-white font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {s === "all" ? "Tous les statuts" : s}
          </Link>
        ))}
      </div>

      <Card>
        {subscriptions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucun abonnement trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Praticien
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Fin de période
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Créé le
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{sub.user.name}</p>
                        <p className="text-xs text-slate-500">{sub.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PLAN_VARIANT[sub.plan] ?? "default"}>
                        {sub.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[sub.status] ?? "neutral"}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {sub.currentPeriodEnd
                        ? sub.currentPeriodEnd.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {sub.createdAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${sub.user.id}`}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        Gérer →
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
