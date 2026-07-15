import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setLocaleAction } from "@/lib/actions/locale";
import {
  createCheckoutSessionAction,
  openBillingPortalAction,
} from "@/lib/actions/subscriptions";
import { PLAN_PRICING, PAID_PLANS, getPriceId } from "@/lib/plans";
import type { PaidPlanKey, BillingInterval } from "@/lib/plans";
import { syncSubscriptionOnSuccess } from "@/lib/subscription";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/request";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("settings") };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TSettings = Awaited<ReturnType<typeof getTranslations<"settings">>>;

type SubscriptionData = {
  plan: "FREE" | "STARTER" | "GROWTH" | "PRO";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
  billingInterval: "MONTHLY" | "YEARLY";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
} | null;

type UpgradeIntent = {
  plan: PaidPlanKey;
  interval: BillingInterval;
  priceId: string;
} | null;

// ---------------------------------------------------------------------------
// Plan labels
// ---------------------------------------------------------------------------

const PLAN_LABEL: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Pro",
};

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "mensuel",
  YEARLY: "annuel",
};

// ---------------------------------------------------------------------------
// Billing card
// ---------------------------------------------------------------------------

function BillingCard({
  t,
  subscription,
  stripeParam,
  upgradeIntent,
}: {
  t: TSettings;
  subscription: SubscriptionData;
  stripeParam: string | undefined;
  upgradeIntent: UpgradeIntent;
}) {
  const plan = subscription?.plan ?? "FREE";
  const status = subscription?.status ?? "ACTIVE";
  const hasBillingPortal = !!subscription?.stripeCustomerId;
  const isPaidPlan = plan !== "FREE";
  // After Stripe checkout: show success only if DB is actually updated
  const justActivated = stripeParam === "success" && isPaidPlan;

  const statusVariant: Record<string, "neutral" | "info" | "success" | "warning" | "error"> = {
    TRIALING: "info",
    ACTIVE: "success",
    PAST_DUE: "error",
    CANCELED: "neutral",
    SUSPENDED: "warning",
  };

  const statusLabel: Record<string, string> = {
    TRIALING: t("billing.statusTrialing"),
    ACTIVE: t("billing.statusActive"),
    PAST_DUE: t("billing.statusPastDue"),
    CANCELED: t("billing.statusCanceled"),
    SUSPENDED: t("billing.statusSuspended"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("billing.title")}</CardTitle>
        <CardDescription>{t("billing.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Banners post-checkout */}
        {stripeParam === "success" && justActivated && (
          <div className="rounded-lg bg-nd-sage-tint border border-nd-sage-tint px-4 py-3 text-sm text-nd-sage-deep font-medium">
            {t("billing.successBanner", { plan: PLAN_LABEL[plan] ?? plan })}
          </div>
        )}
        {stripeParam === "success" && !justActivated && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {t("billing.successBannerPending")}
          </div>
        )}
        {stripeParam === "cancelled" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {t("billing.cancelledBanner")}
          </div>
        )}

        {/* Plan actuel */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t("billing.currentPlan")}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base font-semibold text-slate-900">
                {PLAN_LABEL[plan] ?? plan}
                {isPaidPlan && subscription?.billingInterval && (
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    ({INTERVAL_LABEL[subscription.billingInterval] ?? ""})
                  </span>
                )}
              </p>
              <Badge variant={statusVariant[status] ?? "neutral"}>
                {statusLabel[status] ?? status}
              </Badge>
            </div>
            {subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
              <p className="text-xs text-slate-400 mt-1">
                {t("billing.renewsOn", {
                  date: subscription.currentPeriodEnd.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}
              </p>
            )}
            {subscription?.currentPeriodEnd && subscription.cancelAtPeriodEnd && (
              <p className="text-xs text-red-500 mt-1">
                {t("billing.cancelAtPeriodEnd", {
                  date: subscription.currentPeriodEnd.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>

          {hasBillingPortal && (
            <form action={openBillingPortalAction}>
              <Button type="submit" variant="secondary" size="sm">
                {t("billing.manageButton")}
              </Button>
            </form>
          )}
        </div>

        {/* Upgrade intent — venant de /tarifs via ?upgrade=PLAN&interval=INTERVAL */}
        {upgradeIntent && !isPaidPlan && (
          <div
            className="rounded-xl border-2 p-4 space-y-3"
            style={{ borderColor: "var(--nd-sage)", background: "var(--nd-cream)" }}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Plan sélectionné : {PLAN_LABEL[upgradeIntent.plan]} {INTERVAL_LABEL[upgradeIntent.interval]}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {PLAN_PRICING[upgradeIntent.plan][
                  upgradeIntent.interval === "MONTHLY" ? "monthlyPrice" : "yearlyMonthly"
                ]}
                {" "}€/mois
                {upgradeIntent.interval === "YEARLY" && (
                  <span className="text-slate-400">
                    {" "}— {PLAN_PRICING[upgradeIntent.plan].yearlyTotal} € facturés annuellement
                  </span>
                )}
              </p>
            </div>
            <form action={createCheckoutSessionAction.bind(null, upgradeIntent.priceId)}>
              <Button type="submit" variant="primary" size="sm">
                Confirmer et payer
              </Button>
            </form>
          </div>
        )}

        {/* Pour les utilisateurs FREE sans intent : afficher les 3 plans */}
        {!isPaidPlan && !upgradeIntent && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Choisissez votre plan :</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {PAID_PLANS.map((planKey) => {
                const pricing = PLAN_PRICING[planKey];
                const priceId = pricing.priceIdMonthly;
                const isFeatured = planKey === "GROWTH";
                return (
                  <form key={planKey} action={createCheckoutSessionAction.bind(null, priceId)}>
                    <button
                      type="submit"
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer",
                        isFeatured
                          ? "border-[var(--nd-sage)] bg-nd-sage-tint"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <p className="font-semibold text-sm text-slate-900">
                        {PLAN_LABEL[planKey]}
                        {isFeatured && (
                          <span
                            className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white"
                            style={{ background: "var(--nd-sage)" }}
                          >
                            Populaire
                          </span>
                        )}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {pricing.monthlyPrice} €/mois
                      </p>
                    </button>
                  </form>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              Abonnement mensuel sans engagement.{" "}
              <a
                href="/tarifs"
                className="underline underline-offset-2 hover:text-slate-600 transition-colors"
              >
                Voir les tarifs annuels (−17%)
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sélecteur de langue — Server Action avec .bind()
// ---------------------------------------------------------------------------

function LocaleSwitcher({
  currentLocale,
  labelFr,
  labelEn,
}: {
  currentLocale: Locale;
  labelFr: string;
  labelEn: string;
}) {
  const setFr = setLocaleAction.bind(null, "fr" satisfies Locale);
  const setEn = setLocaleAction.bind(null, "en" satisfies Locale);

  return (
    <div className="flex gap-2">
      <form action={setFr}>
        <button
          type="submit"
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
            currentLocale === "fr"
              ? "bg-nd-sage-tint border-nd-sage text-nd-sage-deep font-medium"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          {labelFr}
        </button>
      </form>
      <form action={setEn}>
        <button
          type="submit"
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
            currentLocale === "en"
              ? "bg-nd-sage-tint border-nd-sage text-nd-sage-deep font-medium"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          {labelEn}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; upgrade?: string; interval?: string; reason?: string }>;
}) {
  const [user, t, currentLocale, resolvedParams] = await Promise.all([
    requireUser(),
    getTranslations("settings"),
    getLocale(),
    searchParams,
  ]);

  // Fallback sync: if returning from Stripe checkout but webhook hasn't fired yet,
  // query Stripe directly and update the DB. Reads stripeCustomerId first (lightweight).
  if (resolvedParams.stripe === "success") {
    const existing = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, stripeCustomerId: true },
    });
    if (existing?.plan === "FREE" && existing.stripeCustomerId) {
      await syncSubscriptionOnSuccess(user.id, existing.stripeCustomerId);
    }
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: user.id },
    select: {
      plan: true,
      status: true,
      billingInterval: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  const stripeParam = resolvedParams.stripe;
  const reasonParam = resolvedParams.reason;

  // Resolve upgrade intent from URL params (set by /tarifs CTAs)
  let upgradeIntent: UpgradeIntent = null;
  const rawPlan = resolvedParams.upgrade?.toUpperCase();
  const rawInterval = resolvedParams.interval?.toUpperCase();

  if (rawPlan && (PAID_PLANS as string[]).includes(rawPlan)) {
    const plan = rawPlan as PaidPlanKey;
    const interval: BillingInterval =
      rawInterval === "YEARLY" ? "YEARLY" : "MONTHLY";
    const priceId = getPriceId(plan, interval);
    if (priceId) upgradeIntent = { plan, interval, priceId };
  }

  return (
    <div>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <div className="max-w-2xl space-y-6">
        {/* Subscription required banner */}
        {reasonParam === "subscription_required" && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4">
            <p className="font-semibold text-amber-900 text-sm">
              {t("billing.subscriptionRequiredBanner")}
            </p>
            <p className="text-amber-800 text-sm mt-1">
              {t("billing.subscriptionRequiredDescription")}
            </p>
          </div>
        )}

        {/* Profil */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.title")}</CardTitle>
            <CardDescription>{t("profile.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">{t("profile.nameLabel")}</Label>
                  <Input
                    id="name"
                    defaultValue={user.name}
                    placeholder={t("profile.namePlaceholder")}
                    disabled
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">{t("profile.emailLabel")}</Label>
                  <Input
                    id="email"
                    defaultValue={user.email}
                    type="email"
                    disabled
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">{t("profile.editNotice")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Abonnement */}
        <BillingCard
          t={t}
          subscription={subscription}
          stripeParam={stripeParam}
          upgradeIntent={upgradeIntent}
        />

        {/* Langue */}
        <Card>
          <CardHeader>
            <CardTitle>{t("language.title")}</CardTitle>
            <CardDescription>{t("language.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleSwitcher
              currentLocale={currentLocale as Locale}
              labelFr={t("language.fr")}
              labelEn={t("language.en")}
            />
          </CardContent>
        </Card>

        {/* Compte */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account.title")}</CardTitle>
            <CardDescription>{t("account.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {t("account.passwordTitle")}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("account.passwordDescription")}
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled>
                {t("account.changePassword")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zone de danger */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">{t("danger.title")}</CardTitle>
            <CardDescription>{t("danger.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {t("danger.deleteTitle")}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("danger.deleteDescription")}
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                {t("danger.deleteButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
