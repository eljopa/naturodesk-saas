import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { AdviceSheetForm } from "@/components/advice-sheets/advice-sheet-form";
import { updateAdviceSheetAction, generateAdviceSheetDraftAction } from "@/lib/actions/advice-sheets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adviceSheets");
  return { title: t("editPageTitle") };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdviceSheetPage({ params }: PageProps) {
  const [user, t, { id }] = await Promise.all([
    requireUser(),
    getTranslations("adviceSheets"),
    params,
  ]);

  const sheet = await db.adviceSheet.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  if (!sheet || sheet.userId !== user.id) notFound();

  const boundAction = updateAdviceSheetAction.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/advice-sheets/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {t("backToDetail")}
        </Link>
      </div>

      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t("editPageTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sheet.patient.lastName} {sheet.patient.firstName}
            {" · "}
            V{sheet.versionMajor}.{sheet.versionMinor}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <AdviceSheetForm
              action={boundAction}
              generateDraftAction={sheet.consultationId ? generateAdviceSheetDraftAction : undefined}
              consultationId={sheet.consultationId ?? undefined}
              patientId={sheet.patientId}
              parentId={sheet.parentId ?? undefined}
              versionMajor={sheet.versionMajor}
              versionMinor={sheet.versionMinor}
              initialTitle={sheet.title ?? ""}
              initialSections={{
                consultationSummary: sheet.consultationSummary ?? "",
                objectives:          sheet.objectives          ?? "",
                dietaryAdvice:       sheet.dietaryAdvice       ?? "",
                supplements:         sheet.supplements         ?? "",
                phytotherapy:        sheet.phytotherapy        ?? "",
                aromatherapy:        sheet.aromatherapy        ?? "",
                micronutrition:      sheet.micronutrition      ?? "",
                gemmotherapy:        sheet.gemmotherapy        ?? "",
                bachFlowers:         sheet.bachFlowers         ?? "",
                lifestyle:           sheet.lifestyle           ?? "",
                physicalActivity:    sheet.physicalActivity    ?? "",
                additionalNotes:     sheet.additionalNotes     ?? "",
                precautions:         sheet.precautions         ?? "",
              }}
              submitLabel={t("form.submitEdit")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
