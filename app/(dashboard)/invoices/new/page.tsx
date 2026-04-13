import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invoices");
  return { title: t("form.createTitle") };
}

interface NewInvoicePageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const [user, t, sp] = await Promise.all([
    requireUser(),
    getTranslations("invoices"),
    searchParams,
  ]);

  const patients = await db.patient.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("backToList")}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t("form.createTitle")}
        </h1>
      </div>

      <InvoiceForm
        patients={patients}
        preselectedPatientId={sp.patientId}
      />
    </div>
  );
}
