import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ProtocolForm } from "@/components/protocols/protocol-form";
import {
  updateProtocolAction,
  deleteProtocolAction,
} from "@/lib/actions/protocols";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await db.protocolTemplate.findUnique({ where: { id } });
  if (!p) return {};
  return { title: p.title };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProtocolPage({ params }: PageProps) {
  await requireUser();

  const [t, tForm, { id }] = await Promise.all([
    getTranslations("protocols"),
    getTranslations("protocols.form"),
    params,
  ]);

  const protocol = await db.protocolTemplate.findUnique({ where: { id } });
  if (!protocol) notFound();

  const contentJson = protocol.contentJson as {
    summary?: string | null;
    content?: string | null;
  };

  const updateAction = updateProtocolAction.bind(null, protocol.id);
  const deleteAction = deleteProtocolAction.bind(null, protocol.id);

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
          {tForm("editTitle")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ProtocolForm
            action={updateAction}
            defaultValues={{
              title: protocol.title,
              category: protocol.category,
              summary: contentJson.summary,
              content: contentJson.content,
            }}
            submitLabel={tForm("submitEdit")}
            cancelHref="/protocols"
            deleteAction={deleteAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
