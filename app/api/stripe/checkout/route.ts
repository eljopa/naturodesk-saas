import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  try {
    const user = await requireUser();

    if (!STRIPE_PRICE_IDS.PRO_MONTHLY) {
      return NextResponse.json(
        { error: "stripe_not_configured" },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    // Get or create Stripe customer
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true, plan: true },
    });

    let stripeCustomerId = subscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      // Save customer ID immediately
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
      cancel_url: `${appUrl}/settings?stripe=cancelled`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
