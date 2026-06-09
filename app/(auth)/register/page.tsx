import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthUser } from "@/lib/auth";
import { PLAN_PRICING, PAID_PLANS } from "@/lib/plans";
import type { PaidPlanKey } from "@/lib/plans";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("register") };
}

const PLAN_LABEL: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Pro",
};

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "mensuel",
  YEARLY: "annuel",
};

interface RegisterPageProps {
  searchParams: Promise<{ plan?: string; interval?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const [authUser, t, params] = await Promise.all([
    getAuthUser(),
    getTranslations("auth.register"),
    searchParams,
  ]);

  const rawPlan = params.plan?.toUpperCase();
  const rawInterval = params.interval?.toUpperCase();

  const validPlan =
    rawPlan && (PAID_PLANS as string[]).includes(rawPlan)
      ? (rawPlan as PaidPlanKey)
      : null;
  const validInterval: "MONTHLY" | "YEARLY" =
    rawInterval === "YEARLY" ? "YEARLY" : "MONTHLY";

  // Déjà connecté → rediriger vers settings (avec plan) ou dashboard
  if (authUser) {
    if (validPlan) {
      redirect(`/settings?upgrade=${validPlan}&interval=${validInterval}`);
    }
    redirect("/dashboard");
  }

  const redirectTo = validPlan
    ? `/settings?upgrade=${validPlan}&interval=${validInterval}`
    : "/dashboard";

  // Libellé du plan pour affichage dans le formulaire
  let planLabel: string | undefined;
  if (validPlan) {
    const pricing = PLAN_PRICING[validPlan];
    const price =
      validInterval === "YEARLY" ? pricing.yearlyMonthly : pricing.monthlyPrice;
    const intervalLabel = INTERVAL_LABEL[validInterval];
    planLabel = `${PLAN_LABEL[validPlan]} ${intervalLabel} — ${price} €/mois`;
    if (validInterval === "YEARLY") {
      planLabel += ` (${pricing.yearlyTotal} €/an)`;
    }
  }

  // Lien "J'ai déjà un compte" → login avec redirectTo conservé
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      <RegisterForm
        redirectTo={redirectTo}
        planLabel={planLabel}
        loginHref={loginHref}
      />
    </>
  );
}
