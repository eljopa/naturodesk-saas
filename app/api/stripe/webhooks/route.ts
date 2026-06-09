import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/plans";
import { db } from "@/lib/db";
import { sendSubscriptionActivatedEmail } from "@/lib/email";
import type Stripe from "stripe";

// Stripe webhooks must consume the raw body
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event router
// ---------------------------------------------------------------------------

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  console.log(`[webhook] checkout.session.completed | session=${session.id} | userId=${userId} | mode=${session.mode}`);

  if (!userId || session.mode !== "subscription") {
    console.log("[webhook] skipping — missing userId or not subscription mode");
    return;
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  console.log(`[webhook] subscription=${stripeSubscriptionId} | customer=${session.customer}`);

  if (!stripeSubscriptionId) {
    console.log("[webhook] skipping — no subscription id");
    return;
  }

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = stripeSub as any;

  // In Stripe API 2025-03-31.basil, current_period_* moved to items.data[0]
  const firstItem = subAny.items?.data?.[0] as any;
  const periodStart = (firstItem?.current_period_start ?? subAny.current_period_start)
    ? new Date((firstItem?.current_period_start ?? subAny.current_period_start) * 1000)
    : null;
  const periodEnd = (firstItem?.current_period_end ?? subAny.current_period_end)
    ? new Date((firstItem?.current_period_end ?? subAny.current_period_end) * 1000)
    : null;
  const trialEnd = subAny.trial_end
    ? new Date(subAny.trial_end * 1000)
    : null;

  // Determine plan: prefer metadata set at checkout creation, fall back to priceId lookup
  const metaPlan = session.metadata?.plan;
  const metaInterval = session.metadata?.billingInterval;

  let plan: "STARTER" | "GROWTH" | "PRO" = "STARTER";
  let billingInterval: "MONTHLY" | "YEARLY" = "MONTHLY";

  if (metaPlan && ["STARTER", "GROWTH", "PRO"].includes(metaPlan)) {
    plan = metaPlan as "STARTER" | "GROWTH" | "PRO";
  } else {
    // Fallback: resolve from line items
    const priceId =
      session.metadata?.priceId ??
      (subAny.items?.data?.[0]?.price?.id as string | undefined);
    if (priceId) {
      const info = getPlanFromPriceId(priceId);
      if (info) plan = info.plan;
    }
  }

  if (metaInterval && ["MONTHLY", "YEARLY"].includes(metaInterval)) {
    billingInterval = metaInterval as "MONTHLY" | "YEARLY";
  }

  console.log(`[webhook] upserting subscription | userId=${userId} plan=${plan} interval=${billingInterval}`);

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
      trialEndsAt: trialEnd,
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
      trialEndsAt: trialEnd,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`[webhook] subscription upserted ✓ | userId=${userId} plan=${plan}`);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (user) {
    sendSubscriptionActivatedEmail({
      userEmail: user.email,
      userName: user.name,
      plan,
      billingInterval,
      locale: "fr",
    }).catch((e) => console.error("[email] Subscription activated email failed:", e));
  }
}

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;

  const status = mapStripeStatus(stripeSub.status);
  const cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = stripeSub as any;

  // In Stripe API 2025-03-31.basil, current_period_* moved to items.data[0]
  const firstItemU = subAny.items?.data?.[0] as any;
  const periodStart = (firstItemU?.current_period_start ?? subAny.current_period_start)
    ? new Date((firstItemU?.current_period_start ?? subAny.current_period_start) * 1000)
    : null;
  const periodEnd = (firstItemU?.current_period_end ?? subAny.current_period_end)
    ? new Date((firstItemU?.current_period_end ?? subAny.current_period_end) * 1000)
    : null;
  const canceledAt = subAny.canceled_at
    ? new Date(subAny.canceled_at * 1000)
    : null;

  // Detect plan/interval change (e.g., upgrade/downgrade via Billing Portal)
  const priceId = subAny.items?.data?.[0]?.price?.id as string | undefined;
  const planInfo = priceId ? getPlanFromPriceId(priceId) : null;

  await db.subscription.updateMany({
    where: { userId },
    data: {
      status,
      cancelAtPeriodEnd,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      canceledAt,
      ...(planInfo && {
        plan: planInfo.plan,
        billingInterval: planInfo.interval,
      }),
    },
  });
}

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;

  await db.subscription.updateMany({
    where: { userId },
    data: {
      plan: "FREE",
      status: "CANCELED",
      canceledAt: new Date(),
      cancelAtPeriodEnd: false,
    },
  });
}

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

async function handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
  const customerId =
    typeof stripeInvoice.customer === "string"
      ? stripeInvoice.customer
      : stripeInvoice.customer?.id;

  if (!customerId) return;

  await db.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DBSubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "SUSPENDED";

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): DBSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "paused":
    case "unpaid":
    case "incomplete":
      return "SUSPENDED";
    default:
      return "ACTIVE";
  }
}
