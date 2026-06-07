import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@prisma/client";

const PER_PAGE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("invoices") };
}

type Filter = "all" | "draft" | "issued" | "paid";

const FILTER_STATUS: Record<Exclude<Filter, "all">, InvoiceStatus> = {
  draft: "DRAFT",
  issued: "ISSUED",
  paid: "PAID",
};

const STATUS_BADGE: Record<
  InvoiceStatus,
  "neutral" | "info" | "success" | "error"
> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PAID: "success",
  CANCELLED: "error",
};

interface InvoicesPageProps {
  searchParams: Promise<{ filter?: string; page?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const [user, t, locale, sp] = await Promise.all([
    requireUser(),
    getTranslations("invoices"),
    getLocale(),
    searchParams,
  ]);

  const rawFilter = sp.filter ?? "all";
  const activeFilter: Filter = ["all", "draft", "issued", "paid"].includes(
    rawFilter
  )
    ? (rawFilter as Filter)
    : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const statusFilter =
    activeFilter !== "all" ? FILTER_STATUS[activeFilter] : undefined;

  const where = {
    userId: user.id,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.invoice.count({ where }),
  ]);

  function buildHref(p: number): string {
    const qs = new URLSearchParams();
    if (activeFilter !== "all") qs.set("filter", activeFilter);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/invoices?${s}` : "/invoices";
  }

  const filters: { label: string; key: Filter }[] = [
    { label: t("filterAll"), key: "all" },
    { label: t("filterDraft"), key: "draft" },
    { label: t("filterIssued"), key: "issued" },
    { label: t("filterPaid"), key: "paid" },
  ];

  const fmt = (amount: number) =>
    amount.toLocaleString(locale, { style: "currency", currency: "EUR" });

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <div className="flex gap-2">
            <Button variant="primary" size="md" asChild>
              <Link href="/invoices/new">
                <Plus className="w-4 h-4" />
                {t("new")}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?filter=${f.key}`}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              activeFilter === f.key
                ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button variant="primary" size="md" asChild>
                <Link href="/invoices/new">
                  <Plus className="w-4 h-4" />
                  {t("createCta")}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {invoices.map((invoice) => (

              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {invoice.number}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {invoice.patient.lastName} {invoice.patient.firstName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium text-slate-900">
                      {fmt(invoice.totalAmount)}
                    </span>
                    <Badge variant={STATUS_BADGE[invoice.status]}>
                      {t(
                        `status${
                          invoice.status.charAt(0) +
                          invoice.status.slice(1).toLowerCase()
                        }` as Parameters<typeof t>[0]
                      )}
                    </Badge>
                    {invoice.issuedAt && (
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {invoice.issuedAt.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 pb-4">
            <Pagination page={page} total={total} perPage={PER_PAGE} buildHref={buildHref} />
          </div>
        </Card>
      )}
    </div>
  );
}
