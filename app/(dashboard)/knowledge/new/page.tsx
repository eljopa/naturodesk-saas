import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/knowledge/document-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("knowledge") };
}

export default async function NewDocumentPage() {
  await requireUser();
  const t = await getTranslations("knowledge");

  return (
    <div className="max-w-2xl">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("backToList")}
      </Link>

      <h1 className="text-xl font-semibold text-slate-900 mb-1">{t("form.pageTitle")}</h1>
      <p className="text-sm text-slate-500 mb-6">{t("form.pageDescription")}</p>

      <Card>
        <CardContent className="pt-6">
          <DocumentForm />
        </CardContent>
      </Card>
    </div>
  );
}
