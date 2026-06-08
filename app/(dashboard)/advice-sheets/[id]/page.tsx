import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Pencil, GitBranch, GitMerge, Copy, Trash2 } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdviceSheetVersionTree } from "@/components/advice-sheets/advice-sheet-version-tree";
import {
  finalizeAdviceSheetAction,
  revertToDraftAction,
  newMinorVersionAction,
  newMajorVersionAction,
  duplicateAdviceSheetAction,
  deleteAdviceSheetAction,
} from "@/lib/actions/advice-sheets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sheet = await db.adviceSheet.findUnique({
    where: { id },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  if (!sheet) return {};
  return { title: `${sheet.patient.lastName} ${sheet.patient.firstName} — Fiche conseil` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const SECTION_LABELS: Record<string, string> = {
  consultationSummary: "Synthèse de la consultation",
  objectives:          "Objectifs du protocole",
  dietaryAdvice:       "Conseils alimentaires",
  supplements:         "Compléments alimentaires",
  phytotherapy:        "Phytothérapie",
  aromatherapy:        "Aromathérapie",
  micronutrition:      "Micronutrition",
  gemmotherapy:        "Gemmothérapie",
  bachFlowers:         "Fleurs de Bach",
  lifestyle:           "Hygiène de vie",
  physicalActivity:    "Activité physique",
  additionalNotes:     "Remarques complémentaires",
  precautions:         "Précautions éventuelles",
};

const SECTION_ORDER = Object.keys(SECTION_LABELS) as Array<keyof typeof SECTION_LABELS>;

export default async function AdviceSheetDetailPage({ params }: PageProps) {
  const [user, t, locale, { id }] = await Promise.all([
    requireUser(),
    getTranslations("adviceSheets"),
    getLocale(),
    params,
  ]);

  const sheet = await db.adviceSheet.findUnique({
    where: { id },
    include: {
      patient:      { select: { id: true, firstName: true, lastName: true } },
      consultation: { select: { id: true, createdAt: true } },
    },
  });

  if (!sheet || sheet.userId !== user.id) notFound();

  // Charger toute la famille de versions
  const rootId = sheet.parentId ?? sheet.id;
  const familyVersions = await db.adviceSheet.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    select: { id: true, versionMajor: true, versionMinor: true, status: true, createdAt: true, title: true },
  });

  const versionLabel = `V${sheet.versionMajor}.${sheet.versionMinor}`;
  const isDraft = sheet.status === "DRAFT";

  const filledSections = SECTION_ORDER.filter((key) => {
    const val = sheet[key as keyof typeof sheet];
    return typeof val === "string" && val.trim().length > 0;
  });
  const emptySections = SECTION_ORDER.filter((key) => {
    const val = sheet[key as keyof typeof sheet];
    return typeof val !== "string" || val.trim() === "";
  });

  return (
    <div>
      <div className="mb-6">
        <Link href="/advice-sheets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {t("backToList")}
        </Link>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {sheet.title ?? t("untitled")}
              </h1>
              <Badge variant={isDraft ? "neutral" : "success"}>
                {isDraft ? t("statusDraft") : t("statusFinal")}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              {sheet.patient.lastName} {sheet.patient.firstName}
              {" · "}
              <span className="font-medium text-slate-600">{versionLabel}</span>
              {" · "}
              {sheet.createdAt.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              {sheet.signedAt && (
                <>
                  {" · "}
                  {t("signedAt", { date: sheet.signedAt.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}
                </>
              )}
            </p>
            {sheet.consultation && (
              <p className="text-xs text-slate-400 mt-1">
                {t("linkedConsultation")}{" "}
                <Link href={`/consultations/${sheet.consultation.id}`} className="underline hover:text-nd-sage">
                  {t("consultationOf", { date: sheet.consultation.createdAt.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}
                </Link>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/advice-sheets/${id}/edit`}>
                <Pencil className="w-3.5 h-3.5" />
                {t("actions.edit")}
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a href={`/api/pdf/advice-sheet/${id}`}>
                <Download className="w-3.5 h-3.5" />
                {t("actions.downloadPdf")}
              </a>
            </Button>
          </div>
        </div>

        {/* Contenu des sections */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {filledSections.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t("noContent")}</p>
            ) : (
              filledSections.map((key) => {
                const value = sheet[key as keyof typeof sheet] as string;
                return (
                  <div key={key}>
                    <h3 className="text-xs font-semibold text-nd-sage uppercase tracking-wide mb-2">
                      {SECTION_LABELS[key]}
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{value}</p>
                  </div>
                );
              })
            )}
            {emptySections.length > 0 && filledSections.length > 0 && (
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                {emptySections.length} {t("sectionsEmpty")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions de version */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">{t("versioning.title")}</h2>

            <div className="flex flex-wrap gap-2">
              {/* Finaliser / Repasser en brouillon */}
              {isDraft ? (
                <form action={finalizeAdviceSheetAction.bind(null, id)}>
                  <Button type="submit" variant="primary" size="sm">
                    {t("actions.finalize")}
                  </Button>
                </form>
              ) : (
                <form action={revertToDraftAction.bind(null, id)}>
                  <Button type="submit" variant="secondary" size="sm">
                    {t("actions.revertDraft")}
                  </Button>
                </form>
              )}

              {/* Nouvelle version mineure */}
              <form action={newMinorVersionAction.bind(null, id)}>
                <Button type="submit" variant="secondary" size="sm">
                  <GitBranch className="w-3.5 h-3.5" />
                  {t("versioning.newMinor")}
                </Button>
              </form>

              {/* Nouvelle version majeure */}
              <form action={newMajorVersionAction.bind(null, id)}>
                <Button type="submit" variant="secondary" size="sm">
                  <GitMerge className="w-3.5 h-3.5" />
                  {t("versioning.newMajor")}
                </Button>
              </form>

              {/* Dupliquer */}
              <form action={duplicateAdviceSheetAction.bind(null, id)}>
                <Button type="submit" variant="secondary" size="sm">
                  <Copy className="w-3.5 h-3.5" />
                  {t("actions.duplicate")}
                </Button>
              </form>

              {/* Supprimer */}
              <form action={deleteAdviceSheetAction.bind(null, id)}>
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("actions.delete")}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Arbre de versions */}
        {familyVersions.length > 1 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {t("versioning.historyTitle")} ({familyVersions.length})
              </h2>
              <AdviceSheetVersionTree versions={familyVersions} currentId={id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
