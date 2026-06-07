import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, Plus, Download } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { InvoiceStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  archivePatientAction,
  unarchivePatientAction,
} from "@/lib/actions/patients";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient) return {};
  return { title: `${patient.lastName} ${patient.firstName}` };
}

interface PatientPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const TABS = ["info", "appointments", "consultations", "followups", "invoices"] as const;
type Tab = (typeof TABS)[number];

export default async function PatientPage({
  params,
  searchParams,
}: PatientPageProps) {
  const [user, t, tAppt, tInv, tFU, tPdf, locale, { id }, sp] = await Promise.all([
    requireUser(),
    getTranslations("patients"),
    getTranslations("appointments"),
    getTranslations("invoices"),
    getTranslations("followups"),
    getTranslations("pdf"),
    getLocale(),
    params,
    searchParams,
  ]);

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { startAt: "desc" },
        take: 20,
      },
      consultations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          issuedAt: true,
        },
      },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          symptomEvolution: true,
          protocolAdjustment: true,
          observations: true,
          nextSteps: true,
          appointment: {
            select: { startAt: true },
          },
        },
      },
    },
  });

  if (!patient || patient.userId !== user.id) notFound();

  const activeTab: Tab =
    TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "info";

  const archiveAction = archivePatientAction.bind(null, patient.id);
  const unarchiveAction = unarchivePatientAction.bind(null, patient.id);

  const tabHref = (tab: Tab) =>
    tab === "info"
      ? `/patients/${patient.id}`
      : `/patients/${patient.id}?tab=${tab}`;

  const tabLabels: Record<Tab, string> = {
    info: t("detail.tabInfo"),
    appointments: t("detail.tabAppointments"),
    consultations: t("detail.tabConsultations"),
    followups: t("detail.tabFollowUps"),
    invoices: t("detail.tabInvoices"),
  };

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("detail.backToList")}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {patient.lastName} {patient.firstName}
              </h1>
              {patient.isArchived && (
                <Badge variant="neutral">{t("detail.archivedBadge")}</Badge>
              )}
            </div>
            {patient.birthDate && (
              <p className="text-sm text-slate-500 mt-1">
                {patient.birthDate.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" asChild>
              <a href={`/api/pdf/patient/${patient.id}`} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-1.5" />
                {tPdf("downloadPatient")}
              </a>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/patients/${patient.id}/edit`}>
                {t("detail.editButton")}
              </Link>
            </Button>
            {patient.isArchived ? (
              <form action={unarchiveAction}>
                <Button type="submit" variant="secondary" size="sm">
                  {t("detail.unarchiveButton")}
                </Button>
              </form>
            ) : (
              <form action={archiveAction}>
                <Button type="submit" variant="ghost" size="sm">
                  {t("detail.archiveButton")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-nd-sage text-nd-sage-deep"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {tabLabels[tab]}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <div className="space-y-4 max-w-2xl">
          {/* Coordonnées */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.contactSection")}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">{t("detail.phone")}</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {patient.phone ?? t("detail.noData")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("detail.email")}</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {patient.email ?? t("detail.noData")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("detail.profession")}</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {patient.profession ?? t("detail.noData")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("detail.birthDate")}</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {patient.birthDate
                      ? patient.birthDate.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : t("detail.noData")}
                  </dd>
                </div>
                {patient.address && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">{t("detail.address")}</dt>
                    <dd className="text-slate-900 mt-0.5 whitespace-pre-line">
                      {patient.address}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Données cliniques */}
          {(patient.allergies || patient.medicalHistory) && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  {t("detail.clinicalSection")}
                </h2>
                <dl className="space-y-4 text-sm">
                  {patient.allergies && (
                    <div>
                      <dt className="text-slate-500 mb-1">
                        {t("form.allergiesLabel")}
                      </dt>
                      <dd className="text-slate-900 whitespace-pre-line">
                        {patient.allergies}
                      </dd>
                    </div>
                  )}
                  {patient.medicalHistory && (
                    <div>
                      <dt className="text-slate-500 mb-1">
                        {t("form.medicalHistoryLabel")}
                      </dt>
                      <dd className="text-slate-900 whitespace-pre-line">
                        {patient.medicalHistory}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {t("detail.notesSection")}
              </h2>
              {patient.notes ? (
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {patient.notes}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  {t("detail.noNotes")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {patient.appointments.length} {tAppt("pageTitle").toLowerCase()}
            </p>
            <Button variant="primary" size="sm" asChild>
              <Link href={`/appointments/new?patientId=${patient.id}`}>
                <Calendar className="w-3.5 h-3.5" />
                {t("detail.newAppointment")}
              </Link>
            </Button>
          </div>

          {patient.appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-500">
                  {t("detail.noAppointments")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {patient.appointments.map((appt) => (
                  <li
                    key={appt.id}
                    className="flex items-center justify-between px-6 py-4 gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {appt.startAt.toLocaleString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {appt.notes && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          {appt.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={appt.type === "BILAN" ? "default" : "info"}>
                        {appt.type === "BILAN"
                          ? tAppt("typeBilan")
                          : tAppt("typeSuivi")}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/appointments/${appt.id}/edit`}>
                          {t("detail.editButton")}
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {activeTab === "consultations" && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {patient.consultations.length} {t("detail.tabConsultations").toLowerCase()}
            </p>
            <Button variant="primary" size="sm" asChild>
              <Link href={`/consultations/new?patientId=${patient.id}`}>
                <Calendar className="w-3.5 h-3.5" />
                {t("detail.tabConsultations")}
              </Link>
            </Button>
          </div>

          {patient.consultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-500">
                  {t("detail.noConsultations")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {patient.consultations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/consultations/${c.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors gap-4"
                    >
                      <p className="text-sm text-slate-900">
                        {c.createdAt.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <Badge variant="neutral">
                        {c.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {activeTab === "followups" && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {patient.followUps.length} {tFU("pageTitle").toLowerCase()}
            </p>
            <Button variant="primary" size="sm" asChild>
              <Link href={`/patients/${patient.id}/followups/new`}>
                <Plus className="w-3.5 h-3.5" />
                {tFU("new")}
              </Link>
            </Button>
          </div>

          {patient.followUps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-500">{tFU("emptyDescription")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {patient.followUps.map((fu) => {
                const preview =
                  fu.symptomEvolution ||
                  fu.observations ||
                  fu.protocolAdjustment ||
                  fu.nextSteps;
                return (
                  <Link
                    key={fu.id}
                    href={`/patients/${patient.id}/followups/${fu.id}/edit`}
                    className="block rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          {fu.createdAt.toLocaleDateString(locale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {fu.appointment && (
                            <span className="ml-2 text-nd-sage">
                              · {fu.appointment.startAt.toLocaleDateString(locale, {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </p>
                        {preview && (
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {preview}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {patient.invoices.length} {tInv("pageTitle").toLowerCase()}
            </p>
            <Button variant="primary" size="sm" asChild>
              <Link href={`/invoices/new?patientId=${patient.id}`}>
                <Plus className="w-3.5 h-3.5" />
                {tInv("new")}
              </Link>
            </Button>
          </div>

          {patient.invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-500">
                  {t("detail.noInvoices")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {patient.invoices.map((inv) => {
                  const statusBadge: Record<
                    InvoiceStatus,
                    "neutral" | "info" | "success" | "error"
                  > = {
                    DRAFT: "neutral",
                    ISSUED: "info",
                    PAID: "success",
                    CANCELLED: "error",
                  };
                  return (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {inv.number}
                          </p>
                          {inv.issuedAt && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {inv.issuedAt.toLocaleDateString(locale, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-medium text-slate-900">
                            {inv.totalAmount.toLocaleString(locale, {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </span>
                          <Badge variant={statusBadge[inv.status]}>
                            {tInv(
                              `status${inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}` as Parameters<typeof tInv>[0]
                            )}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
