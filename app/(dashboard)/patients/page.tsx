import type { Metadata } from "next";
import Link from "next/link";
import { User, Plus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patients/patient-search";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("patients") };
}

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function getAge(birthDate: Date | null, locale: string): string {
  if (!birthDate) return "—";
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  const adjusted = m < 0 || (m === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
  return birthDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) + ` (${adjusted} ans)`;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const [user, t, locale] = await Promise.all([
    requireUser(),
    getTranslations("patients"),
    getLocale(),
  ]);

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filter = params.filter === "archived" ? "archived" : "active";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const where = {
    userId: user.id,
    isArchived: filter === "archived",
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.patient.count({ where }),
  ]);

  function buildHref(p: number): string {
    const qs = new URLSearchParams();
    if (filter !== "active") qs.set("filter", filter);
    if (query) qs.set("q", query);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/patients?${s}` : "/patients";
  }

  function filterHref(f: string) {
    const qs = new URLSearchParams();
    if (f !== "active") qs.set("filter", f);
    if (query) qs.set("q", query);
    const s = qs.toString();
    return s ? `/patients?${s}` : "/patients";
  }

  const isEmpty = total === 0;
  const isSearch = query.length > 0;

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/patients/new">
              <Plus className="w-4 h-4" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(["active", "archived"] as const).map((f) => (
            <Link
              key={f}
              href={filterHref(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                filter === f
                  ? "bg-teal-50 border-teal-300 text-teal-700 font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {f === "active" ? t("filterActive") : t("filterArchived")}
            </Link>
          ))}
        </div>
        <div className="sm:ml-auto">
          <PatientSearch />
        </div>
      </div>

      {/* List */}
      <Card>
        {isEmpty ? (
          <EmptyState
            icon={<User className="w-5 h-5" />}
            title={
              isSearch
                ? t("emptySearchTitle")
                : filter === "archived"
                ? t("emptyArchivedTitle")
                : t("emptyTitle")
            }
            description={
              isSearch
                ? t("emptySearchDescription")
                : filter === "archived"
                ? t("emptyArchivedDescription")
                : t("emptyDescription")
            }
            action={
              !isSearch && filter === "active" ? (
                <Button variant="primary" size="md" asChild>
                  <Link href="/patients/new">
                    <Plus className="w-4 h-4" />
                    {t("createCta")}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
          <ul className="divide-y divide-slate-100">
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold shrink-0">
                    {getInitials(patient.firstName, patient.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                      {patient.lastName} {patient.firstName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {getAge(patient.birthDate, locale)}
                    </p>
                  </div>
                  {patient.phone && (
                    <p className="text-sm text-slate-500 hidden sm:block shrink-0">
                      {patient.phone}
                    </p>
                  )}
                  {patient.isArchived && (
                    <Badge variant="neutral">{t("detail.archivedBadge")}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 pb-4">
            <Pagination
              page={page}
              total={total}
              perPage={PER_PAGE}
              buildHref={buildHref}
            />
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
