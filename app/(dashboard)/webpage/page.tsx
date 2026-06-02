import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Globe } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils/slug";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WebPageForm, type WebPageFormDefaults } from "@/components/webpage/webpage-form";
import { ServicesManager, type ServiceData } from "@/components/webpage/services-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("webpage") };
}

// ---------------------------------------------------------------------------
// Pro gate
// ---------------------------------------------------------------------------

async function ProUpgradeGate() {
  const t = await getTranslations("webpage.proGate");
  const tBilling = await getTranslations("settings.billing");

  return (
    <div className="max-w-2xl">
      <Card className="border-2 border-dashed border-teal-200 bg-teal-50/30">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100">
              <Globe className="w-6 h-6 text-teal-700" />
            </div>
          </div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription className="text-base mt-1">{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-2">
          <Button variant="primary" size="md" asChild>
            <Link href="/settings">{tBilling("upgradeButton")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WebPageDashboardPage() {
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations("webpage"),
  ]);

  // Vérification plan Pro
  const subscription = await db.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true },
  });
  const isPro =
    subscription?.plan === "PRO" &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING");

  if (!isPro) {
    return (
      <div>
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
        <ProUpgradeGate />
      </div>
    );
  }

  // Chargement des données
  const [webPage, services] = await Promise.all([
    db.therapistWebPage.findUnique({
      where: { userId: user.id },
    }),
    db.serviceOffering.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, description: true, durationMinutes: true, price: true, appointmentType: true, displayOrder: true },
    }),
  ]);

  // Slug par défaut si la page n'existe pas encore
  const defaultSlug = generateSlug(user.cabinetName ?? user.name);

  // Sérialisation pour les composants client
  const formDefaults: WebPageFormDefaults = webPage
    ? {
        id: webPage.id,
        slug: webPage.slug,
        slugLockedAt: webPage.slugLockedAt,
        isPublished: webPage.isPublished,
        publishedAt: webPage.publishedAt,
        logoUrl: webPage.logoUrl,
        heroThemeId: webPage.heroThemeId,
        bio: webPage.bio,
        presentation: webPage.presentation,
        servicesDisplay: webPage.servicesDisplay,
        pricingDisplay: webPage.pricingDisplay,
        address: webPage.address,
        phone: webPage.phone,
        contactEmail: webPage.contactEmail,
        socialLinks: (webPage.socialLinks as Record<string, string>) ?? null,
        seoTitle: webPage.seoTitle,
        seoDescription: webPage.seoDescription,
        contactFormEnabled: webPage.contactFormEnabled,
        appointmentEnabled: webPage.appointmentEnabled,
      }
    : {
        slug: defaultSlug,
        slugLockedAt: null,
        isPublished: false,
        publishedAt: null,
        logoUrl: null,
        heroThemeId: 1,
        bio: null,
        presentation: null,
        servicesDisplay: null,
        pricingDisplay: null,
        address: null,
        phone: null,
        contactEmail: null,
        socialLinks: null,
        seoTitle: null,
        seoDescription: null,
        contactFormEnabled: true,
        appointmentEnabled: false,
      };

  const serviceData: ServiceData[] = services.map((s) => ({
    id:              s.id,
    name:            s.name,
    description:     s.description,
    durationMinutes: s.durationMinutes,
    price:           s.price,
    appointmentType: s.appointmentType,
    displayOrder:    s.displayOrder,
  }));

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <div className="max-w-2xl space-y-6">
        <WebPageForm defaults={formDefaults} defaultSlug={defaultSlug} />
        <ServicesManager services={serviceData} />
      </div>
    </div>
  );
}
