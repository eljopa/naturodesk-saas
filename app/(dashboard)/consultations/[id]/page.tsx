import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FlaskConical, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ContextEditor } from "@/components/consultations/context-editor";
import { SymptomSection } from "@/components/consultations/symptom-section";
import { MedicationSection } from "@/components/consultations/medication-section";
import { SupplementSection } from "@/components/consultations/supplement-section";
import { SupplementAnalysisPanel } from "@/components/consultations/supplement-analysis-panel";
import { FindingSection } from "@/components/consultations/finding-section";
import { KnowledgeFindingsPanel } from "@/components/knowledge/knowledge-findings-panel";
import {
  updateConsultationContextAction,
  setConsultationStatusAction,
} from "@/lib/actions/consultations";
import {
  addSymptomAction,
  deleteSymptomAction,
  addMedicationAction,
  deleteMedicationAction,
  addSupplementAction,
  deleteSupplementAction,
  addFindingAction,
  deleteFindingAction,
} from "@/lib/actions/clinical";
import {
  triggerAnalysisAction,
  retryAnalysisAction,
} from "@/lib/actions/analysis";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await db.consultation.findUnique({
    where: { id },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  if (!c) return {};
  return { title: `${c.patient.lastName} ${c.patient.firstName} — Bilan` };
}

const TABS = ["context", "symptoms", "medications", "supplements", "findings", "knowledge"] as const;
type Tab = (typeof TABS)[number];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const STATUS_INFO: Record<string, { variant: "default" | "success" | "warning" | "neutral" | "info"; labelKey: string }> = {
  DRAFT: { variant: "neutral", labelKey: "statusDraft" },
  READY: { variant: "info", labelKey: "statusReady" },
  ANALYSIS_PENDING: { variant: "warning", labelKey: "statusAnalysisPending" },
  ANALYSIS_RUNNING: { variant: "warning", labelKey: "statusAnalysisRunning" },
  ANALYSIS_DONE: { variant: "success", labelKey: "statusAnalysisDone" },
  ANALYSIS_ERROR: { variant: "default", labelKey: "statusAnalysisError" },
};

export default async function ConsultationPage({ params, searchParams }: PageProps) {
  const [user, t, tPdf, locale, { id }, sp] = await Promise.all([
    requireUser(),
    getTranslations("consultations"),
    getTranslations("pdf"),
    getLocale(),
    params,
    searchParams,
  ]);

  const consultation = await db.consultation.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      appointment: { select: { id: true, startAt: true, type: true } },
      symptoms: { orderBy: { createdAt: "asc" } },
      medications: { orderBy: { createdAt: "asc" } },
      supplements: { orderBy: { createdAt: "asc" } },
      findings: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!consultation) notFound();

  // Security: verify patient belongs to user
  const patient = await db.patient.findUnique({
    where: { id: consultation.patientId },
    select: { userId: true },
  });
  if (!patient || patient.userId !== user.id) notFound();

  const activeTab: Tab =
    TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "context";

  const tabHref = (tab: Tab) =>
    tab === "context"
      ? `/consultations/${id}`
      : `/consultations/${id}?tab=${tab}`;

  const tabLabels: Record<Tab, string> = {
    context: t("detail.tabContext"),
    symptoms: t("detail.tabSymptoms"),
    medications: t("detail.tabMedications"),
    supplements: t("detail.tabSupplements"),
    findings: t("detail.tabFindings"),
    knowledge: t("detail.tabKnowledge"),
  };

  // Bind server actions
  const updateContext = updateConsultationContextAction.bind(null, id);
  const markReady = setConsultationStatusAction.bind(null, id, "READY");
  const markDraft = setConsultationStatusAction.bind(null, id, "DRAFT");
  const triggerAnalysis = triggerAnalysisAction.bind(null, id);
  const retryAnalysis = retryAnalysisAction.bind(null, id);

  const addSymptom = addSymptomAction.bind(null, id);
  const deleteSymptom = deleteSymptomAction.bind(null, id);
  const addMedication = addMedicationAction.bind(null, id);
  const deleteMedication = deleteMedicationAction.bind(null, id);
  const addSupplement = addSupplementAction.bind(null, id);
  const deleteSupplement = deleteSupplementAction.bind(null, id);
  const addFinding = addFindingAction.bind(null, id);
  const deleteFinding = deleteFindingAction.bind(null, id);

  const statusInfo = STATUS_INFO[consultation.status] ?? STATUS_INFO["DRAFT"]!;
  const status = consultation.status;
  const isAnalysing = status === "ANALYSIS_PENDING" || status === "ANALYSIS_RUNNING";

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/consultations"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("detail.backToList")}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                <Link
                  href={`/patients/${consultation.patient.id}`}
                  className="hover:text-nd-sage-deep transition-colors"
                >
                  {consultation.patient.lastName} {consultation.patient.firstName}
                </Link>
              </h1>
              <Badge variant={statusInfo.variant}>
                {t(statusInfo.labelKey as Parameters<typeof t>[0])}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t("detail.createdAt")}{" "}
              {consultation.createdAt.toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            {consultation.appointment && (
              <p className="text-xs text-slate-500">
                {t("detail.appointment")}{" "}
                {consultation.appointment.startAt.toLocaleString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <a href={`/api/pdf/consultation/${id}`} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-1.5" />
                {tPdf("downloadConsultation")}
              </a>
            </Button>
            {status === "DRAFT" && (
              <form action={markReady}>
                <Button type="submit" variant="primary" size="sm">
                  {t("detail.markReadyButton")}
                </Button>
              </form>
            )}

            {status === "READY" && (
              <>
                <form action={markDraft}>
                  <Button type="submit" variant="secondary" size="sm">
                    {t("detail.markDraftButton")}
                  </Button>
                </form>
                <form action={triggerAnalysis}>
                  <Button type="submit" variant="primary" size="sm">
                    <FlaskConical className="w-4 h-4" />
                    {t("detail.triggerAnalysisButton")}
                  </Button>
                </form>
              </>
            )}

            {isAnalysing && (
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t("detail.analysisInProgress")}
              </span>
            )}

            {status === "ANALYSIS_ERROR" && (
              <form action={retryAnalysis}>
                <Button type="submit" variant="secondary" size="sm">
                  <AlertTriangle className="w-4 h-4" />
                  {t("detail.retryAnalysisButton")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Analysis summary — shown when ANALYSIS_DONE */}
      {status === "ANALYSIS_DONE" && (consultation.medicationLoadLevel || consultation.terrainSummary) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-2xl">
          {consultation.medicationLoadLevel && (
            <div className={cn(
              "rounded-xl border px-4 py-3",
              consultation.medicationLoadLevel === "CRITICAL"
                ? "border-red-200 bg-red-50"
                : consultation.medicationLoadLevel === "HIGH"
                ? "border-orange-200 bg-orange-50"
                : consultation.medicationLoadLevel === "MEDIUM"
                ? "border-yellow-200 bg-yellow-50"
                : "border-slate-200 bg-slate-50"
            )}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {t("detail.medicationLoad")}
              </p>
              <p className={cn(
                "text-sm font-semibold",
                consultation.medicationLoadLevel === "CRITICAL" ? "text-red-700"
                : consultation.medicationLoadLevel === "HIGH" ? "text-orange-700"
                : consultation.medicationLoadLevel === "MEDIUM" ? "text-yellow-700"
                : "text-slate-700"
              )}>
                {t(`detail.loadLevel${consultation.medicationLoadLevel}` as Parameters<typeof t>[0])}
                {consultation.medicationLoadScore != null && (
                  <span className="font-normal text-slate-500 ml-1">
                    ({consultation.medicationLoadScore.toFixed(1)}/10)
                  </span>
                )}
              </p>
            </div>
          )}
          {consultation.terrainSummary && (
            <div className="rounded-xl border border-nd-sage-tint bg-nd-sage-tint px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {t("detail.terrainSummary")}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {consultation.terrainSummary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === tab
                ? "border-nd-sage text-nd-sage-deep"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {tabLabels[tab]}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <div className={activeTab === "knowledge" ? "max-w-3xl" : "max-w-2xl"}>
        {activeTab === "context" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.contextSection")}
              </h2>
              <ContextEditor
                context={consultation.context}
                updateAction={updateContext}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "symptoms" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.tabSymptoms")}
              </h2>
              <SymptomSection
                symptoms={consultation.symptoms}
                addAction={addSymptom}
                deleteAction={deleteSymptom}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "medications" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.tabMedications")}
              </h2>
              <MedicationSection
                medications={consultation.medications}
                addAction={addMedication}
                deleteAction={deleteMedication}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "supplements" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.tabSupplements")}
              </h2>
              <SupplementSection
                supplements={consultation.supplements}
                addAction={addSupplement}
                deleteAction={deleteSupplement}
              />
              <SupplementAnalysisPanel consultationId={id} />
            </CardContent>
          </Card>
        )}

        {activeTab === "findings" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.tabFindings")}
              </h2>
              <FindingSection
                findings={consultation.findings}
                addAction={addFinding}
                deleteAction={deleteFinding}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "knowledge" && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                {t("detail.tabKnowledge")}
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Interactions, déplétions et alertes issues de la base documentaire.
              </p>
              <KnowledgeFindingsPanel consultationId={id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
