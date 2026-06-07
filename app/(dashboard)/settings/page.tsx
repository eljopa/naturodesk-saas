import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setLocaleAction } from "@/lib/actions/locale";
import {
  createCheckoutSessionAction,
  openBillingPortalAction,
} from "@/lib/actions/subscriptions";
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
// Billing card
// ---------------------------------------------------------------------------

type TSettings = Awaited<ReturnType<typeof getTranslations<"settings">>>;

type SubscriptionData = {
  plan: "FREE" | "PRO";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
} | null;

function BillingCard({
  t,
  subscription,
  stripeParam,
}: {
  t: TSettings;
  subscription: SubscriptionData;
  stripeParam: string | undefined;
}) {
  const plan = subscription?.plan ?? "FREE";
  const status = subscription?.status ?? "ACTIVE";
  const hasBillingPortal = !!subscription?.stripeCustomerId;

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
      <CardContent className="space-y-4">
        {stripeParam === "success" && (
          <div className="rounded-lg bg-nd-sage-tint border border-nd-sage-tint px-4 py-3 text-sm text-nd-sage-deep font-medium">
            {t("billing.successBanner")}
          </div>
        )}
        {stripeParam === "cancelled" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {t("billing.cancelledBanner")}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t("billing.currentPlan")}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base font-semibold text-slate-900">
                {plan === "PRO" ? t("billing.planPro") : t("billing.planFree")}
              </p>
              <Badge variant={statusVariant[status] ?? "neutral"}>
                {statusLabel[status] ?? status}
              </Badge>
            </div>
            {subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
              <p className="text-xs text-slate-400 mt-1">
                {t("billing.renewsOn", {
                  date: subscription.currentPeriodEnd.toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  }),
                })}
              </p>
            )}
            {subscription?.currentPeriodEnd && subscription.cancelAtPeriodEnd && (
              <p className="text-xs text-red-500 mt-1">
                {t("billing.cancelAtPeriodEnd", {
                  date: subscription.currentPeriodEnd.toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            {plan === "FREE" && (
              <form action={createCheckoutSessionAction}>
                <Button type="submit" variant="primary" size="sm">
                  {t("billing.upgradeButton")}
                </Button>
              </form>
            )}
            {hasBillingPortal && (
              <form action={openBillingPortalAction}>
                <Button type="submit" variant="secondary" size="sm">
                  {t("billing.manageButton")}
                </Button>
              </form>
            )}
          </div>
        </div>
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
  searchParams: Promise<{ stripe?: string }>;
}) {
  const [user, t, tPdf, currentLocale, resolvedParams] = await Promise.all([
    requireUser(),
    getTranslations("settings"),
    getTranslations("pdf"),
    getLocale(),
    searchParams,
  ]);

  const subscription = await db.subscription.findUnique({
    where: { userId: user.id },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  const stripeParam = resolvedParams.stripe;
  void tPdf;

  return (
    <div>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <div className="max-w-2xl space-y-6">
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
