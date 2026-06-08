// Server-only — process.env.STRIPE_* vars are not available in Client Components.
// Import this file only from Server Components, Server Actions, or Route Handlers.

export type PlanKey = "FREE" | "STARTER" | "GROWTH" | "PRO";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type PaidPlanKey = "STARTER" | "GROWTH" | "PRO";

export const PAID_PLANS: PaidPlanKey[] = ["STARTER", "GROWTH", "PRO"];

export interface PaidPlanPricing {
  monthlyPrice: number;
  yearlyMonthly: number; // per month when billed annually
  yearlyTotal: number;   // total charged annually
  priceIdMonthly: string;
  priceIdYearly: string;
}

export const PLAN_PRICING: Record<PaidPlanKey, PaidPlanPricing> = {
  STARTER: {
    monthlyPrice: 49,
    yearlyMonthly: 41,
    yearlyTotal: 490,
    priceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
  },
  GROWTH: {
    monthlyPrice: 69,
    yearlyMonthly: 58,
    yearlyTotal: 690,
    priceIdMonthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ?? "",
    priceIdYearly: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID ?? "",
  },
  PRO: {
    monthlyPrice: 89,
    yearlyMonthly: 74,
    yearlyTotal: 890,
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
  },
};

const PLAN_ORDER: Record<PlanKey, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  PRO: 3,
};

export function isPlanAtLeast(userPlan: PlanKey, requiredPlan: PlanKey): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[requiredPlan];
}

export function getPriceId(plan: PaidPlanKey, interval: BillingInterval): string {
  const pricing = PLAN_PRICING[plan];
  return interval === "MONTHLY" ? pricing.priceIdMonthly : pricing.priceIdYearly;
}

// Reverse lookup: priceId → { plan, interval }
export function getPlanFromPriceId(
  priceId: string
): { plan: PaidPlanKey; interval: BillingInterval } | null {
  for (const [key, pricing] of Object.entries(PLAN_PRICING) as Array<[PaidPlanKey, PaidPlanPricing]>) {
    if (pricing.priceIdMonthly === priceId) return { plan: key, interval: "MONTHLY" };
    if (pricing.priceIdYearly === priceId) return { plan: key, interval: "YEARLY" };
  }
  return null;
}
