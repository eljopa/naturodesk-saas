import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const [unreadMessages] = await Promise.all([
    db.contactMessage
      .count({ where: { userId: user.id, status: "UNREAD" } })
      .catch(() => 0),
    // Fire-and-forget: track last seen at without blocking render
    db.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch(() => null),
  ]);

  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      badgeCounts={unreadMessages > 0 ? { messages: unreadMessages } : undefined}
    >
      {children}
    </DashboardShell>
  );
}
