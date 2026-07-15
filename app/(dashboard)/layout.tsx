import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Read current pathname injected by middleware (see middleware.ts x-pathname header)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // Subscription gate: all dashboard routes except /settings require an active paid plan.
  // /settings is excluded so the user can choose and pay for a plan there.
  if (!pathname.startsWith("/settings")) {
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true },
    });
    const hasActivePlan =
      !!subscription &&
      subscription.plan !== "FREE" &&
      ["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status);

    if (!hasActivePlan) {
      redirect("/settings?reason=subscription_required");
    }
  }

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
