import type { Metadata } from "next";
import Link from "next/link";
import { Database, Plus, Trash2, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { deleteDocumentAction } from "@/lib/actions/knowledge";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("knowledge") };
}

const DOC_TYPE_VARIANT: Record<string, "info" | "neutral" | "warning" | "success"> = {
  MONOGRAPH:         "info",
  NOTICE:            "neutral",
  INTERACTION_SHEET: "warning",
  STUDY:             "success",
  FACT_SHEET:        "info",
  PRODUCT_LABEL:     "neutral",
};

export default async function KnowledgePage() {
  await requireUser();
  const t = await getTranslations("knowledge");

  const [docCount, chunkCount, drugKeyCount, documents] = await Promise.all([
    db.knowledgeDocument.count(),
    db.knowledgeChunk.count(),
    db.knowledgeDocument.groupBy({ by: ["drugKey"] }).then((r) => r.length),
    db.knowledgeDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
  ]);

  const embeddedCountResult = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "knowledge_chunks" WHERE embedding IS NOT NULL
  `;
  const embeddedCount = Number(embeddedCountResult[0]?.count ?? 0);

  const stats = [
    { title: t("statDocuments"), description: t("statDocumentsDesc"), value: docCount },
    {
      title: t("statChunks"),
      description: t("statChunksDesc"),
      value: `${embeddedCount} / ${chunkCount}`,
    },
    { title: t("statMedications"), description: t("statMedicationsDesc"), value: drugKeyCount },
  ];

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/knowledge/new">
              <Plus className="w-4 h-4" />
              {t("addDocument")}
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardTitle>{stat.title}</CardTitle>
              <CardDescription>{stat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-slate-900 tabular-nums">
                {stat.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Semantic search */}
      {chunkCount > 0 && (
        <div className="mb-6">
          <KnowledgeSearch />
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Database className="w-5 h-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button variant="secondary" size="md" asChild>
                <Link href="/knowledge/new">
                  <Plus className="w-4 h-4" />
                  {t("addDocument")}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const deleteAction = deleteDocumentAction.bind(null, doc.id);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <code className="font-mono bg-slate-100 px-1 rounded">
                          {doc.drugKey}
                        </code>
                        {" · "}
                        {doc._count.chunks} {t("chunks")}
                        {doc.url && (
                          <>
                            {" · "}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:underline"
                            >
                              {t("source")}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={
                        DOC_TYPE_VARIANT[doc.docType] ?? "neutral"
                      }
                    >
                      {t(`docType${doc.docType}` as Parameters<typeof t>[0])}
                    </Badge>
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={t("deleteDocument")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
