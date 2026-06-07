import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateInvoiceStatusAction,
  deleteInvoiceAction,
} from "@/lib/actions/invoices";
import type { InvoiceStatus } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: invoice?.number ?? "Facture" };
}

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<
  InvoiceStatus,
  "neutral" | "info" | "success" | "error"
> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PAID: "success",
  CANCELLED: "error",
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const [user, t, tPdf, locale, { id }] = await Promise.all([
    requireUser(),
    getTranslations("invoices"),
    getTranslations("pdf"),
    getLocale(),
    params,
  ]);

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      lines: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!invoice || invoice.userId !== user.id) notFound();

  const markIssuedAction = updateInvoiceStatusAction.bind(null, invoice.id, "ISSUED");
  const markPaidAction = updateInvoiceStatusAction.bind(null, invoice.id, "PAID");
  const cancelAction = updateInvoiceStatusAction.bind(null, invoice.id, "CANCELLED");
  const deleteAction = deleteInvoiceAction.bind(null, invoice.id);

  const fmt = (amount: number) =>
    amount.toLocaleString(locale, { style: "currency", currency: "EUR" });

  return (
    <div>
      {/* Back */}
      <div className="mb-6">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("backToList")}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {invoice.number}
              </h1>
              <Badge variant={STATUS_BADGE[invoice.status]}>
                {t(`status${invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}` as Parameters<typeof t>[0])}
              </Badge>
            </div>
            <Link
              href={`/patients/${invoice.patient.id}`}
              className="text-sm text-slate-500 hover:text-nd-sage-deep mt-1 block transition-colors"
            >
              {invoice.patient.lastName} {invoice.patient.firstName}
            </Link>
          </div>

          {/* PDF download + status actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button variant="secondary" size="sm" asChild>
              <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-1.5" />
                {tPdf("downloadInvoice")}
              </a>
            </Button>
            {invoice.status === "DRAFT" && (
              <>
                <form action={markIssuedAction}>
                  <Button type="submit" variant="primary" size="sm">
                    {t("markIssued")}
                  </Button>
                </form>
                <form action={deleteAction}>
                  <Button type="submit" variant="destructive" size="sm">
                    {t("deleteInvoice")}
                  </Button>
                </form>
              </>
            )}
            {invoice.status === "ISSUED" && (
              <>
                <form action={markPaidAction}>
                  <Button type="submit" variant="primary" size="sm">
                    {t("markPaid")}
                  </Button>
                </form>
                <form action={cancelAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    {t("cancelInvoice")}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Meta */}
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-slate-500 mb-0.5">{t("numberLabel")}</dt>
                <dd className="font-medium text-slate-900">{invoice.number}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{t("issuedAtLabel")}</dt>
                <dd className="text-slate-900">
                  {invoice.issuedAt
                    ? invoice.issuedAt.toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{t("form.paymentMethodLabel")}</dt>
                <dd className="text-slate-900">
                  {invoice.paymentMethod
                    ? t(`payment${invoice.paymentMethod.charAt(0) + invoice.paymentMethod.slice(1).toLowerCase()}` as Parameters<typeof t>[0])
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{t("totalLabel")}</dt>
                <dd className="font-semibold text-nd-sage-deep text-base">
                  {fmt(invoice.totalAmount)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <div className="px-6 pt-5 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("form.linesTitle")}
            </h2>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_110px_110px] gap-2 px-6 py-2 border-b border-slate-100 text-xs text-slate-500">
            <span>{t("form.lineDescription")}</span>
            <span className="text-center">{t("form.lineQuantity")}</span>
            <span className="text-right">{t("form.lineUnitPrice")}</span>
            <span className="text-right">{t("form.lineTotal")}</span>
          </div>

          <ul className="divide-y divide-slate-50">
            {invoice.lines.map((line) => (
              <li
                key={line.id}
                className="grid grid-cols-[1fr_60px_110px_110px] gap-2 px-6 py-3 text-sm"
              >
                <span className="text-slate-900">{line.description}</span>
                <span className="text-center text-slate-600">{line.quantity}</span>
                <span className="text-right text-slate-600">{fmt(line.unitPrice)}</span>
                <span className="text-right font-medium text-slate-900">
                  {fmt(line.total)}
                </span>
              </li>
            ))}
          </ul>

          {/* Total */}
          <div className="flex justify-end px-6 py-4 border-t border-slate-100">
            <div className="text-sm">
              <span className="text-slate-500 mr-3">{t("form.totalLabel")}</span>
              <span className="font-semibold text-nd-sage-deep text-base">
                {fmt(invoice.totalAmount)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
