import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Layout protégé du dashboard.
 * requireUser() redirige automatiquement vers /login si non connecté.
 * Si l'utilisateur Supabase existe mais n'a pas de profil en base,
 * rediriger ici vers /onboarding (à implémenter en phase SaaS multi-praticiens).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Fire-and-forget: track last seen at without blocking render
  void db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

  return (
    <DashboardShell userName={user.name} userEmail={user.email}>
      {children}
    </DashboardShell>
  );
}
