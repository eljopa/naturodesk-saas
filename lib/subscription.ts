import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isPlanAtLeast } from "@/lib/plans";
import type { PlanKey } from "@/lib/plans";

export async function getUserSubscription(userId: string) {
  return db.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      billingInterval: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
    },
  });
}

// Redirect to settings upgrade page if user doesn't have the required plan.
// Usage: await requirePlan(user.id, "GROWTH") at the top of a Server Component or Action.
export async function requirePlan(userId: string, minPlan: PlanKey): Promise<void> {
  const sub = await getUserSubscription(userId);
  const plan = (sub?.plan ?? "FREE") as PlanKey;
  const isActive = !sub || sub.status === "ACTIVE" || sub.status === "TRIALING";

  if (!isActive || !isPlanAtLeast(plan, minPlan)) {
    redirect(`/settings?upgrade=${minPlan}&interval=MONTHLY`);
  }
}
