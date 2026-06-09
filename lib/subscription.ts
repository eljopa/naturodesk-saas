import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isPlanAtLeast, getPlanFromPriceId } from "@/lib/plans";
import type { PlanKey } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

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
export async function requirePlan(userId: string, minPlan: PlanKey): Promise<void> {
  const sub = await getUserSubscription(userId);
  const plan = (sub?.plan ?? "FREE") as PlanKey;
  const isActive = !sub || sub.status === "ACTIVE" || sub.status === "TRIALING";

  if (!isActive || !isPlanAtLeast(plan, minPlan)) {
    redirect(`/settings?upgrade=${minPlan}&interval=MONTHLY`);
  }
}

// Fallback sync: called on /settings?stripe=success when subscription is still FREE.
// Queries Stripe for the most recent completed checkout session and syncs the DB.
// Handles the case where the webhook was missed (server down, timing issue).
export async function syncSubscriptionOnSuccess(userId: string, stripeCustomerId: string | null): Promise<void> {
  if (!stripeCustomerId) return;

  try {
    const sessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 5,
    });

    for (const session of sessions.data) {
      if (session.status !== "complete" || session.mode !== "subscription") continue;
      if (session.metadata?.userId !== userId) continue;

      const stripeSubscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id;

      if (!stripeSubscriptionId) continue;

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (stripeSub.status === "canceled") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subAny = stripeSub as any;

      const firstItem = subAny.items?.data?.[0] as any;
      const periodStart = (firstItem?.current_period_start ?? subAny.current_period_start)
        ? new Date((firstItem?.current_period_start ?? subAny.current_period_start) * 1000)
        : null;
      const periodEnd = (firstItem?.current_period_end ?? subAny.current_period_end)
        ? new Date((firstItem?.current_period_end ?? subAny.current_period_end) * 1000)
        : null;

      const metaPlan = session.metadata?.plan;
      const metaInterval = session.metadata?.billingInterval;

      let plan: "STARTER" | "GROWTH" | "PRO" = "STARTER";
      let billingInterval: "MONTHLY" | "YEARLY" = "MONTHLY";

      if (metaPlan && ["STARTER", "GROWTH", "PRO"].includes(metaPlan)) {
        plan = metaPlan as "STARTER" | "GROWTH" | "PRO";
      } else {
        const priceId = session.metadata?.priceId ?? firstItem?.price?.id;
        if (priceId) {
          const info = getPlanFromPriceId(priceId);
          if (info) plan = info.plan;
        }
      }

      if (metaInterval && ["MONTHLY", "YEARLY"].includes(metaInterval)) {
        billingInterval = metaInterval as "MONTHLY" | "YEARLY";
      }

      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: "ACTIVE",
          billingInterval,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan,
          status: "ACTIVE",
          billingInterval,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      console.log(`[sync] Subscription synced via fallback for userId=${userId} plan=${plan}`);
      return; // sync done on first valid session
    }
  } catch (err) {
    console.error("[sync] syncSubscriptionOnSuccess failed:", err);
  }
}
