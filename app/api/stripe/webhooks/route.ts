import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
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
      // Ignore unhandled events
      break;
  }
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || session.mode !== "subscription") return;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeSubscriptionId) return;

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = stripeSub as any;

  const periodStart = subAny.current_period_start
    ? new Date(subAny.current_period_start * 1000)
    : null;
  const periodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000)
    : null;
  const trialEnd = subAny.trial_end
    ? new Date(subAny.trial_end * 1000)
    : null;

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "PRO",
      status: "ACTIVE",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      plan: "PRO",
      status: "ACTIVE",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
      cancelAtPeriodEnd: false,
    },
  });

  // Send confirmation email to practitioner
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (user) {
    await sendSubscriptionActivatedEmail({
      userEmail: user.email,
      userName: user.name,
      plan: "PRO",
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

  const periodStart = subAny.current_period_start
    ? new Date(subAny.current_period_start * 1000)
    : null;
  const periodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000)
    : null;
  const canceledAt = subAny.canceled_at
    ? new Date(subAny.canceled_at * 1000)
    : null;

  await db.subscription.updateMany({
    where: { userId },
    data: {
      status,
      cancelAtPeriodEnd,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      canceledAt,
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
