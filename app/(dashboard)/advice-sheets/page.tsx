import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Plus, Download, Pencil, GitBranch } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("adviceSheets") };
}

type StatusFilter = "all" | "draft" | "final";

interface PageProps {
  searchParams: Promise<{ status?: string; patient?: string }>;
}

export default async function AdviceSheetsPage({ searchParams }: PageProps) {
  const [user, t, locale, sp] = await Promise.all([
    requireUser(),
    getTranslations("adviceSheets"),
    getLocale(),
    searchParams,
  ]);

  const rawStatus = sp.status ?? "all";
  const activeStatus: StatusFilter = ["all", "draft", "final"].includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";

  // Charge toutes les fiches du praticien (versions comprises)
  const allSheets = await db.adviceSheet.findMany({
    where: {
      userId: user.id,
      ...(activeStatus === "draft" ? { status: "DRAFT" } : {}),
      ...(activeStatus === "final" ? { status: "FINAL" } : {}),
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [
      { versionMajor: "desc" },
      { versionMinor: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Grouper par famille (parentId = null → racine ; sinon grouper par parentId)
  const familyMap = new Map<string, typeof allSheets>();
  for (const sheet of allSheets) {
    const rootId = sheet.parentId ?? sheet.id;
    if (!familyMap.has(rootId)) familyMap.set(rootId, []);
    familyMap.get(rootId)!.push(sheet);
  }

  // Trier les familles par date de la version la plus récente
  const families = [...familyMap.values()].sort((a, b) => {
    const latestA = Math.max(...a.map((s) => s.createdAt.getTime()));
    const latestB = Math.max(...b.map((s) => s.createdAt.getTime()));
    return latestB - latestA;
  });

  const filters: { label: string; key: StatusFilter }[] = [
    { label: t("filterAll"),   key: "all" },
    { label: t("filterDraft"), key: "draft" },
    { label: t("filterFinal"), key: "final" },
  ];

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/advice-sheets/new">
              <Plus className="w-4 h-4" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      {/* Filtres statut */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/advice-sheets" : `/advice-sheets?status=${f.key}`}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              activeStatus === f.key
                ? "border-nd-sage bg-nd-sage-tint text-nd-sage-deep font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {families.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText className="w-5 h-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button variant="primary" size="md" asChild>
                <Link href="/advice-sheets/new">
                  <Plus className="w-4 h-4" />
                  {t("createCta")}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {families.map((family) => {
            // Version la plus récente = affichée en premier dans la liste
            const sorted = [...family].sort((a, b) => {
              if (a.versionMajor !== b.versionMajor) return b.versionMajor - a.versionMajor;
              return b.versionMinor - a.versionMinor;
            });
            const latest = sorted[0];
            if (!latest) return null;
            const patient = latest.patient;
            const hasVersions = family.length > 1;

            return (
              <Card key={latest.parentId ?? latest.id}>
                {/* Version courante */}
                <div className="flex items-center justify-between px-6 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <ScrollText className="w-4 h-4 text-nd-sage shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {latest.title ?? t("untitled")}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patient.lastName} {patient.firstName}
                        {" · "}
                        <span className="font-medium text-slate-600">
                          V{latest.versionMajor}.{latest.versionMinor}
                        </span>
                        {" · "}
                        {latest.createdAt.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={latest.status === "FINAL" ? "success" : "neutral"}>
                      {latest.status === "FINAL" ? t("statusFinal") : t("statusDraft")}
                    </Badge>
                    {hasVersions && (
                      <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {family.length} {t("versions")}
                      </span>
                    )}
                    <Link href={`/advice-sheets/${latest.id}/edit`} className="text-slate-400 hover:text-nd-sage transition-colors" title={t("actions.edit")}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <a href={`/api/pdf/advice-sheet/${latest.id}`} className="text-slate-400 hover:text-nd-sage transition-colors" title={t("actions.downloadPdf")}>
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Versions précédentes si > 1 */}
                {hasVersions && (
                  <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/60">
                    <p className="text-xs text-slate-500 mb-2">{t("previousVersions")}</p>
                    <div className="space-y-1">
                      {sorted.slice(1).map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-xs text-slate-600 py-1">
                          <Link href={`/advice-sheets/${v.id}`} className="flex items-center gap-2 hover:text-nd-sage transition-colors">
                            <span className="font-medium">V{v.versionMajor}.{v.versionMinor}</span>
                            <span className="text-slate-400">
                              {v.createdAt.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant={v.status === "FINAL" ? "success" : "neutral"} className="text-xs">
                              {v.status === "FINAL" ? t("statusFinal") : t("statusDraft")}
                            </Badge>
                            <a href={`/api/pdf/advice-sheet/${v.id}`} className="text-slate-400 hover:text-nd-sage transition-colors">
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
