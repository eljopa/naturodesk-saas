import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Utilisateurs — Admin NaturoDesk",
};

type FilterKey = "all" | "active" | "suspended";
type PlanKey = "all" | "FREE" | "PRO";

interface PageProps {
  searchParams: Promise<{ filter?: string; plan?: string; q?: string }>;
}

const PLAN_BADGE: Record<string, "default" | "info" | "success"> = {
  FREE: "default",
  PRO: "info",
};

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "error" | "neutral" }> = {
  active: { label: "Actif", variant: "success" },
  suspended: { label: "Suspendu", variant: "error" },
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const filter: FilterKey =
    sp.filter === "active" || sp.filter === "suspended" ? sp.filter : "all";
  const planFilter: PlanKey =
    sp.plan === "FREE" || sp.plan === "PRO" ? sp.plan : "all";
  const search = sp.q?.trim() || "";

  const users = await db.user.findMany({
    where: {
      role: "PRACTITIONER",
      deletedAt: null,
      ...(filter === "active" ? { isActive: true } : {}),
      ...(filter === "suspended" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { cabinetName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(planFilter !== "all"
        ? { subscription: { plan: planFilter } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      subscription: { select: { plan: true, status: true } },
      _count: {
        select: { patients: true, appointments: true },
      },
    },
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "active", label: "Actifs" },
    { key: "suspended", label: "Suspendus" },
  ];

  const planFilters: { key: PlanKey; label: string }[] = [
    { key: "all", label: "Tous les plans" },
    { key: "FREE", label: "Free" },
    { key: "PRO", label: "Pro" },
  ];

  const filterHref = (f: FilterKey, p: PlanKey, q: string) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (p !== "all") params.set("plan", p);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Utilisateurs
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {users.length} praticien{users.length !== 1 ? "s" : ""}
          {filter !== "all" ? ` · filtre : ${filter}` : ""}
          {search ? ` · recherche : "${search}"` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={filterHref(f.key, planFilter, search)}
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

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {planFilters.map((p) => (
          <Link
            key={p.key}
            href={filterHref(filter, p.key, search)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              planFilter === p.key
                ? "border-slate-700 bg-slate-800 text-white font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {p.label}
          </Link>
        ))}

        {/* Search form */}
        <form method="get" action="/admin/users" className="ml-auto">
          {filter !== "all" && (
            <input type="hidden" name="filter" value={filter} />
          )}
          {planFilter !== "all" && (
            <input type="hidden" name="plan" value={planFilter} />
          )}
          <input
            name="q"
            defaultValue={search}
            placeholder="Rechercher…"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-56"
          />
        </form>
      </div>

      <Card>
        {users.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Praticien
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Cabinet
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Patients
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Inscription
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => {
                  const statusKey = u.isActive ? "active" : "suspended";
                  const statusInfo = STATUS_BADGE[statusKey]!;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {u.cabinetName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={PLAN_BADGE[u.subscription?.plan ?? "FREE"] ?? "default"}>
                          {u.subscription?.plan ?? "FREE"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                        {u._count.patients}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {u.createdAt.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Voir →
                        </Link>
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
