"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Globe, Lock } from "lucide-react";
import {
  saveWebPageAction,
  publishWebPageAction,
  unpublishWebPageAction,
  type WebPageFormState,
} from "@/lib/actions/webpage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebPageFormDefaults {
  id?: string;
  slug: string;
  slugLockedAt: Date | null;
  isPublished: boolean;
  publishedAt: Date | null;
  logoUrl: string | null;
  heroThemeId: number;
  bio: string | null;
  presentation: string | null;
  servicesDisplay: string | null;
  pricingDisplay: string | null;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  socialLinks: Record<string, string> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  contactFormEnabled: boolean;
  appointmentEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Hero theme picker (thèmes 1–10)
// ---------------------------------------------------------------------------

const HERO_THEMES: { id: number; label: string; bg: string; accent: string }[] = [
  { id: 1,  label: "Teal",       bg: "bg-teal-700",   accent: "bg-teal-400" },
  { id: 2,  label: "Forest",     bg: "bg-green-800",  accent: "bg-green-400" },
  { id: 3,  label: "Sage",       bg: "bg-green-600",  accent: "bg-lime-300" },
  { id: 4,  label: "Ocean",      bg: "bg-blue-700",   accent: "bg-sky-400" },
  { id: 5,  label: "Terracotta", bg: "bg-orange-700", accent: "bg-orange-300" },
  { id: 6,  label: "Lavande",    bg: "bg-purple-700", accent: "bg-violet-300" },
  { id: 7,  label: "Charcoal",   bg: "bg-slate-800",  accent: "bg-teal-400" },
  { id: 8,  label: "Olive",      bg: "bg-yellow-800", accent: "bg-yellow-300" },
  { id: 9,  label: "Rose",       bg: "bg-rose-600",   accent: "bg-pink-300" },
  { id: 10, label: "Indigo",     bg: "bg-indigo-800", accent: "bg-amber-400" },
];

function ThemePicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (id: number) => void;
  disabled: boolean;
}) {
  const t = useTranslations("webpage.fields");
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{t("heroThemeHelp")}</p>
      <div className="flex flex-wrap gap-2">
        {HERO_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            disabled={disabled}
            title={theme.label}
            className={cn(
              "w-9 h-9 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all",
              value === theme.id
                ? "border-teal-600 ring-2 ring-teal-600 ring-offset-1 scale-110"
                : "border-transparent hover:border-slate-300"
            )}
          >
            <div className={cn("w-full h-full rounded-full", theme.bg)} />
          </button>
        ))}
      </div>
      <input type="hidden" name="heroThemeId" value={value} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slug field
// ---------------------------------------------------------------------------

function SlugField({
  slug,
  locked,
  disabled,
}: {
  slug: string;
  locked: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("webpage.slug");
  const [copied, setCopied] = useState(false);
  const publicUrl = `${process.env.NEXT_PUBLIC_URL ?? ""}/p/${slug}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (locked) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 truncate">
            /p/{slug}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 bg-white transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-teal-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? t("copied") : t("copyButton")}
          </button>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          {t("lockedHelp")}
        </p>
        <input type="hidden" name="slug" value={slug} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-teal-600 bg-white overflow-hidden">
        <span className="px-3 py-2 text-sm text-slate-400 bg-slate-50 border-r border-slate-200 shrink-0">
          /p/
        </span>
        <input
          type="text"
          name="slug"
          defaultValue={slug}
          disabled={disabled}
          pattern="[a-z0-9-]+"
          maxLength={60}
          className="flex-1 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <p className="text-xs text-slate-400">{t("help", { slug })}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function StatusBar({
  isPublished,
  publishedAt,
  onPublish,
  onUnpublish,
  slug,
  isPending,
}: {
  isPublished: boolean;
  publishedAt: Date | null;
  onPublish: () => void;
  onUnpublish: () => void;
  slug: string;
  isPending: boolean;
}) {
  const t = useTranslations("webpage.status");

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2">
        <Badge variant={isPublished ? "success" : "neutral"}>
          {isPublished ? t("published") : t("draft")}
        </Badge>
        {isPublished && publishedAt && (
          <span className="text-xs text-slate-400">
            {t("publishedAt", {
              date: publishedAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isPublished && (
          <a
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("previewButton")}
          </a>
        )}
        {!isPublished && slug && (
          <a
            href={`/p/${slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("previewButton")}
          </a>
        )}
        {isPublished ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onUnpublish}
            loading={isPending}
          >
            {t("unpublishButton")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onPublish}
            loading={isPending}
          >
            {t("publishButton")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WebPageForm
// ---------------------------------------------------------------------------

interface WebPageFormProps {
  defaults: WebPageFormDefaults;
  defaultSlug: string; // slug initial si la page n'existe pas encore
}

export function WebPageForm({ defaults, defaultSlug }: WebPageFormProps) {
  const t = useTranslations("webpage");
  const tFields = useTranslations("webpage.fields");
  const tErr = useTranslations("webpage.errors");

  const [state, formAction, isSavePending] = useActionState<WebPageFormState, FormData>(
    saveWebPageAction,
    null
  );

  const [heroThemeId, setHeroThemeId] = useState(defaults.heroThemeId);
  const [isPublished, setIsPublished] = useState(defaults.isPublished);
  const [publishedAt, setPublishedAt] = useState<Date | null>(defaults.publishedAt);
  const [pubPending, setPubPending] = useState(false);

  // Si la page a été (dé)publiée via Server Action, la revalidation suffit
  // mais on optimiste-update l'UI localement
  const handlePublish = async () => {
    setPubPending(true);
    const result = await publishWebPageAction();
    if (!result?.errorCode) {
      setIsPublished(true);
      setPublishedAt(new Date());
    }
    setPubPending(false);
  };

  const handleUnpublish = async () => {
    setPubPending(true);
    const result = await unpublishWebPageAction();
    if (!result?.errorCode) setIsPublished(false);
    setPubPending(false);
  };

  const slug = defaults.slug || defaultSlug;
  const isLocked = !!defaults.slugLockedAt;
  const errorMessage = state?.errorCode ? tErr(state.errorCode as Parameters<typeof tErr>[0]) : null;

  return (
    <div className="space-y-6">
      {/* Barre de statut */}
      <StatusBar
        isPublished={isPublished}
        publishedAt={publishedAt}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        slug={slug}
        isPending={pubPending}
      />

      <form action={formAction} className="space-y-6">
        {/* Erreur globale */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {/* Succès */}
        {state?.success && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-700 font-medium">
            {t("success.saved")}
          </div>
        )}

        {/* ── Adresse de la page ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-600" />
              {t("slug.label")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SlugField slug={slug} locked={isLocked} disabled={isSavePending} />
          </CardContent>
        </Card>

        {/* ── Section : Identité & présentation ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.identity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>{tFields("heroTheme")}</Label>
              <ThemePicker
                value={heroThemeId}
                onChange={setHeroThemeId}
                disabled={isSavePending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">{tFields("bio")}</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={defaults.bio ?? ""}
                placeholder={tFields("bioPlaceholder")}
                rows={3}
                disabled={isSavePending}
              />
              <p className="text-xs text-slate-400">{tFields("bioHelp")}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="presentation">{tFields("presentation")}</Label>
              <Textarea
                id="presentation"
                name="presentation"
                defaultValue={defaults.presentation ?? ""}
                placeholder={tFields("presentationPlaceholder")}
                rows={6}
                disabled={isSavePending}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section : Prestations & tarifs ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.services")}</CardTitle>
            <CardDescription>{t("sections.servicesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="servicesDisplay">{tFields("servicesDisplay")}</Label>
              <Textarea
                id="servicesDisplay"
                name="servicesDisplay"
                defaultValue={defaults.servicesDisplay ?? ""}
                placeholder={tFields("servicesDisplayPlaceholder")}
                rows={3}
                disabled={isSavePending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pricingDisplay">{tFields("pricingDisplay")}</Label>
              <Textarea
                id="pricingDisplay"
                name="pricingDisplay"
                defaultValue={defaults.pricingDisplay ?? ""}
                placeholder={tFields("pricingDisplayPlaceholder")}
                rows={2}
                disabled={isSavePending}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section : Coordonnées & contact ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.contact")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="address">{tFields("address")}</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={defaults.address ?? ""}
                  placeholder={tFields("addressPlaceholder")}
                  disabled={isSavePending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">{tFields("phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={defaults.phone ?? ""}
                  placeholder={tFields("phonePlaceholder")}
                  disabled={isSavePending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactEmail">{tFields("contactEmail")}</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={defaults.contactEmail ?? ""}
                  placeholder={tFields("contactEmailPlaceholder")}
                  disabled={isSavePending}
                />
                <p className="text-xs text-slate-400">{tFields("contactEmailHelp")}</p>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-3">{t("sections.social")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    { key: "instagram", label: tFields("instagram"), placeholder: tFields("instagramPlaceholder") },
                    { key: "facebook",  label: tFields("facebook"),  placeholder: tFields("facebookPlaceholder") },
                    { key: "linkedin",  label: tFields("linkedin"),  placeholder: tFields("linkedinPlaceholder") },
                    { key: "website",   label: tFields("website"),   placeholder: tFields("websitePlaceholder") },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key} className="flex flex-col gap-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      name={key}
                      type="url"
                      defaultValue={defaults.socialLinks?.[key] ?? ""}
                      placeholder={placeholder}
                      disabled={isSavePending}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section : SEO ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.seo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seoTitle">{tFields("seoTitle")}</Label>
              <Input
                id="seoTitle"
                name="seoTitle"
                defaultValue={defaults.seoTitle ?? ""}
                placeholder={tFields("seoTitlePlaceholder")}
                maxLength={60}
                disabled={isSavePending}
              />
              <p className="text-xs text-slate-400">{tFields("seoTitleHelp")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seoDescription">{tFields("seoDescription")}</Label>
              <Textarea
                id="seoDescription"
                name="seoDescription"
                defaultValue={defaults.seoDescription ?? ""}
                placeholder={tFields("seoDescriptionPlaceholder")}
                rows={2}
                maxLength={160}
                disabled={isSavePending}
              />
              <p className="text-xs text-slate-400">{tFields("seoDescriptionHelp")}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Section : Fonctionnalités ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.features")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleField
              name="contactFormEnabled"
              label={tFields("contactFormEnabled")}
              defaultChecked={defaults.contactFormEnabled}
              disabled={isSavePending}
            />
            <ToggleField
              name="appointmentEnabled"
              label={tFields("appointmentEnabled")}
              defaultChecked={defaults.appointmentEnabled}
              disabled={isSavePending}
            />
          </CardContent>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSavePending}
          >
            {t("status.saveButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle field (checkbox stylée)
// ---------------------------------------------------------------------------

function ToggleField({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          value="on"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            "w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer",
            checked ? "bg-teal-600" : "bg-slate-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setChecked((v) => !v)}
        />
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </div>
    </label>
  );
}
