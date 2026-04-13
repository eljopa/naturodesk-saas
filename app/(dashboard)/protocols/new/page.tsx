import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProtocolForm } from "@/components/protocols/protocol-form";
import { createProtocolAction } from "@/lib/actions/protocols";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("protocols.form");
  return { title: t("createTitle") };
}

export default async function NewProtocolPage() {
  await requireUser();
  const [t, tForm] = await Promise.all([
    getTranslations("protocols"),
    getTranslations("protocols.form"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/protocols"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("pageTitle")}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {tForm("createTitle")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ProtocolForm
            action={createProtocolAction}
            submitLabel={tForm("submitCreate")}
            cancelHref="/protocols"
          />
        </CardContent>
      </Card>
    </div>
  );
}
