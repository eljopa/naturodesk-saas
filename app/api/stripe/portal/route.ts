import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  try {
    const user = await requireUser();

    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "no_stripe_customer" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
