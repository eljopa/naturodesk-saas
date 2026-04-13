"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// Create Stripe checkout session → redirect to Stripe hosted page
// ---------------------------------------------------------------------------

export async function createCheckoutSessionAction(): Promise<void> {
  const user = await requireUser();

  if (!STRIPE_PRICE_IDS.PRO_MONTHLY) {
    // Stripe not configured — silently redirect back
    redirect("/settings");
  }

  const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

  // Get or create Stripe customer
  const subscription = await db.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  let stripeCustomerId = subscription?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: "FREE",
        status: "TRIALING",
        stripeCustomerId: customer.id,
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_IDS.PRO_MONTHLY, quantity: 1 }],
    success_url: `${appUrl}/settings?stripe=success`,
    cancel_url: `${appUrl}/settings`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });

  if (!session.url) {
    redirect("/settings");
  }

  redirect(session.url);
}

// ---------------------------------------------------------------------------
// Open Stripe Billing Portal → redirect to Stripe hosted portal
// ---------------------------------------------------------------------------

export async function openBillingPortalAction(): Promise<void> {
  const user = await requireUser();

  const subscription = await db.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    redirect("/settings");
  }

  const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  redirect(session.url);
}
