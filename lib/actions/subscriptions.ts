"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Create Stripe checkout session → redirect to Stripe hosted page
// priceId is bound via .bind(null, priceId) at the call site
// ---------------------------------------------------------------------------

export async function createCheckoutSessionAction(priceId: string): Promise<void> {
  const user = await requireUser();

  if (!priceId) redirect("/settings");

  const planInfo = getPlanFromPriceId(priceId);
  if (!planInfo) redirect("/settings");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
        status: "ACTIVE",
        stripeCustomerId: customer.id,
      },
      update: { stripeCustomerId: customer.id },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?stripe=success`,
    cancel_url: `${appUrl}/settings?stripe=cancelled`,
    metadata: {
      userId: user.id,
      plan: planInfo.plan,
      billingInterval: planInfo.interval,
      priceId,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: planInfo.plan,
        billingInterval: planInfo.interval,
      },
    },
  });

  if (!session.url) redirect("/settings");
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

  if (!subscription?.stripeCustomerId) redirect("/settings");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  redirect(session.url);
}
