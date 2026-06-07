import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import {
  suspendUserAction,
  reactivateUserAction,
  upsertSubscriptionAction,
} from "@/lib/actions/admin/users";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return {};
  return { title: `${user.name} — Admin NaturoDesk` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      supportTickets: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, priority: true, createdAt: true },
      },
      _count: {
        select: {
          patients: true,
          appointments: true,
          invoices: true,
        },
      },
    },
  });

  if (!user || user.role !== "PRACTITIONER") notFound();

  // Consultation count (via patient relation)
  const consultationCount = await db.consultation.count({
    where: { patient: { userId: user.id } },
  });

  // Recent audit logs for this user
  const auditLogs = await db.adminAuditLog.findMany({
    where: { targetType: "User", targetId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { admin: { select: { name: true } } },
  });

  const suspendAction = suspendUserAction.bind(null, user.id);
  const reactivateAction = reactivateUserAction.bind(null, user.id);
  const updateSubscriptionAction = upsertSubscriptionAction.bind(null, user.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Utilisateurs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {user.name}
              </h1>
              {!user.isActive && <Badge variant="error">Suspendu</Badge>}
              {user.subscription && (
                <Badge variant="info">{user.subscription.plan}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            {user.cabinetName && (
              <p className="text-xs text-slate-400 mt-0.5">{user.cabinetName}</p>
            )}
          </div>

          <UserDetailActions
            isActive={user.isActive}
            suspendAction={suspendAction}
            reactivateAction={reactivateAction}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Usage stats */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisation</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Patients", value: user._count.patients },
                  { label: "Rendez-vous", value: user._count.appointments },
                  { label: "Bilans", value: consultationCount },
                  { label: "Factures", value: user._count.invoices },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Support tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tickets support</CardTitle>
                <Link
                  href={`/admin/support?userId=${user.id}`}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  Voir tout →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {user.supportTickets.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun ticket.</p>
              ) : (
                <ul className="divide-y divide-slate-100 -mx-6">
                  {user.supportTickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm text-slate-800 truncate flex-1 mr-3">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              t.priority === "URGENT" || t.priority === "HIGH"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {t.priority}
                          </Badge>
                          <Badge
                            variant={
                              t.status === "RESOLVED" || t.status === "CLOSED"
                                ? "success"
                                : t.status === "OPEN"
                                ? "error"
                                : "info"
                            }
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Audit log for this user */}
          {auditLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des actions admin</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-slate-100 -mx-6">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-slate-800">{log.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">par {log.admin.name}</p>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle>Compte</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Inscription</p>
                <p className="text-slate-800">
                  {user.createdAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {user.lastSeenAt && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Dernière activité</p>
                  <p className="text-slate-800">
                    {user.lastSeenAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Auth ID (Supabase)</p>
                <p className="text-xs text-slate-400 font-mono truncate">{user.authId}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Abonnement</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SubscriptionForm
                subscription={user.subscription}
                updateAction={updateSubscriptionAction}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
