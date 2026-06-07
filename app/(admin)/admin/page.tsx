import type { Metadata } from "next";
import Link from "next/link";
import { Users, ClipboardList, Calendar, Ticket, AlertCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Admin — NaturoDesk",
};

function StatCard({
  title,
  value,
  sub,
  icon,
  href,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <CardContent className="pt-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-teal-50 text-teal-600">{icon}</div>
      </div>
    </CardContent>
  );
  if (href) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <Link href={href}>{inner}</Link>
      </Card>
    );
  }
  return <Card>{inner}</Card>;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    _newUsersThisMonth,
    totalPatients,
    totalConsultations,
    totalAppointments,
    openTickets,
    recentUsers,
    recentAuditLogs,
    suspendedUsers,
  ] = await Promise.all([
    db.user.count({ where: { role: "PRACTITIONER", deletedAt: null } }),
    db.user.count({ where: { role: "PRACTITIONER", deletedAt: null, isActive: true } }),
    db.user.count({
      where: { role: "PRACTITIONER", deletedAt: null, createdAt: { gte: startOfMonth } },
    }),
    db.patient.count({ where: { isArchived: false } }),
    db.consultation.count(),
    db.appointment.count(),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.user.findMany({
      where: { role: "PRACTITIONER", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        subscription: { select: { plan: true, status: true } },
      },
    }),
    db.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { admin: { select: { name: true } } },
    }),
    db.user.count({
      where: { role: "PRACTITIONER", deletedAt: null, isActive: false },
    }),
  ]);

  const newUsersLast30d = await db.user.count({
    where: { role: "PRACTITIONER", deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Tableau de bord admin
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vue d&apos;ensemble de la plateforme NaturoDesk
        </p>
      </div>

      {/* Alerts */}
      {(openTickets > 0 || suspendedUsers > 0) && (
        <div className="mb-6 space-y-2">
          {openTickets > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">{openTickets}</span> ticket{openTickets > 1 ? "s" : ""} de support ouvert{openTickets > 1 ? "s" : ""} en attente.{" "}
                <Link href="/admin/support" className="underline hover:no-underline">
                  Voir les tickets
                </Link>
              </p>
            </div>
          )}
          {suspendedUsers > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-medium">{suspendedUsers}</span> compte{suspendedUsers > 1 ? "s" : ""} suspendu{suspendedUsers > 1 ? "s" : ""}.{" "}
                <Link href="/admin/users?filter=suspended" className="underline hover:no-underline">
                  Voir les comptes
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Praticiens"
          value={totalUsers}
          sub={`${activeUsers} actifs · ${newUsersLast30d} ce mois`}
          icon={<Users className="w-5 h-5" />}
          href="/admin/users"
        />
        <StatCard
          title="Patients"
          value={totalPatients}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Bilans"
          value={totalConsultations}
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatCard
          title="Rendez-vous"
          value={totalAppointments}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inscriptions récentes</CardTitle>
              <Link
                href="/admin/users"
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Voir tout →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun utilisateur.</p>
            ) : (
              <ul className="divide-y divide-slate-100 -mx-6">
                {recentUsers.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {u.subscription && (
                          <Badge variant="info">{u.subscription.plan}</Badge>
                        )}
                        {!u.isActive && (
                          <Badge variant="error">Suspendu</Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent audit log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activité récente</CardTitle>
              <Link
                href="/admin/audit"
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Voir tout →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune activité enregistrée.</p>
            ) : (
              <ul className="divide-y divide-slate-100 -mx-6">
                {recentAuditLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 px-6 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        par {log.admin.name}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0 mt-0.5">
                      {log.createdAt.toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support tickets summary */}
      {openTickets > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-slate-500" />
                <CardTitle>Tickets support ouverts</CardTitle>
              </div>
              <Link
                href="/admin/support"
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Gérer →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{openTickets}</span> ticket{openTickets > 1 ? "s" : ""} en attente de traitement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
