import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Layout protégé du backoffice super admin.
 * requireAdmin() vérifie côté serveur que l'utilisateur a le rôle ADMIN.
 * Redirige vers /dashboard si non admin ou non connecté.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <AdminShell adminName={admin.name} role={admin.role}>
      {children}
    </AdminShell>
  );
}
