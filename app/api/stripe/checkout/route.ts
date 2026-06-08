import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/plans";

// Alternative REST route — the preferred path is the Server Action in lib/actions/subscriptions.ts.
// This route accepts { priceId } in the request body and returns { url } for client-side redirect.

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const priceId = typeof body.priceId === "string" ? body.priceId : "";

    if (!priceId) {
      return NextResponse.json({ error: "missing_price_id" }, { status: 400 });
    }

    const planInfo = getPlanFromPriceId(priceId);
    if (!planInfo) {
      return NextResponse.json({ error: "invalid_price_id" }, { status: 400 });
    }

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

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
