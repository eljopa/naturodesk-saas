"use server";

import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { chunkDocument } from "@/lib/knowledge/chunk";
import { embedBatch } from "@/lib/knowledge/embed";
import type { KnowledgeSourceType, KnowledgeDocType } from "@prisma/client";

const VALID_SOURCE_TYPES: KnowledgeSourceType[] = ["BDPM", "ANSM", "PUBMED", "MANUAL"];
const VALID_DOC_TYPES: KnowledgeDocType[] = ["MONOGRAPH", "NOTICE", "INTERACTION_SHEET", "STUDY"];

export interface KnowledgeFormState {
  error?: string;
  fieldErrors?: Partial<Record<"title" | "drugKey" | "content", string>>;
}

export async function createDocumentAction(
  prevState: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  await requireUser(); // gate access — knowledge is global, not user-scoped

  const title = (formData.get("title") as string)?.trim();
  const drugKey = (formData.get("drugKey") as string)?.trim().toLowerCase();
  const rawSourceType = formData.get("sourceType") as string;
  const rawDocType = formData.get("docType") as string;
  const url = (formData.get("url") as string)?.trim() || null;
  const content = (formData.get("content") as string)?.trim();

  // Validation
  const fieldErrors: KnowledgeFormState["fieldErrors"] = {};
  if (!title || title.length < 3) fieldErrors.title = "Le titre est requis (min. 3 caractères).";
  if (!drugKey || drugKey.length < 2) fieldErrors.drugKey = "La clé médicament est requise.";
  if (!content || content.length < 50) fieldErrors.content = "Le contenu doit faire au moins 50 caractères.";

  const sourceType: KnowledgeSourceType = VALID_SOURCE_TYPES.includes(rawSourceType as KnowledgeSourceType)
    ? (rawSourceType as KnowledgeSourceType)
    : "MANUAL";
  const docType: KnowledgeDocType = VALID_DOC_TYPES.includes(rawDocType as KnowledgeDocType)
    ? (rawDocType as KnowledgeDocType)
    : "MONOGRAPH";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Compute content hash
  const contentHash = createHash("sha256").update(content!).digest("hex").slice(0, 32);

  // Check for duplicate
  const existing = await db.knowledgeDocument.findFirst({
    where: { drugKey: drugKey!, contentHash },
  });
  if (existing) {
    return { error: "Un document identique existe déjà pour cette clé médicament." };
  }

  // Create document
  const doc = await db.knowledgeDocument.create({
    data: {
      drugKey: drugKey!,
      sourceType,
      docType,
      title: title!,
      url,
      contentHash,
      fetchedAt: new Date(),
    },
  });

  // Chunk the content
  const chunks = chunkDocument(content!, title!);
  if (chunks.length === 0) {
    await db.knowledgeDocument.delete({ where: { id: doc.id } });
    return { error: "Le contenu n'a pas pu être découpé en extraits exploitables." };
  }

  // Create chunks (without embeddings first)
  const createdChunks = await Promise.all(
    chunks.map((c) =>
      db.knowledgeChunk.create({
        data: {
          documentId: doc.id,
          kind: c.kind,
          label: c.label,
          excerpt: c.excerpt,
          sectionPath: c.sectionPath,
        },
        select: { id: true, excerpt: true },
      })
    )
  );

  // Generate embeddings in batch
  try {
    const texts = createdChunks.map((c) => c.excerpt);
    const embeddings = await embedBatch(texts);

    // Store embeddings via raw SQL (pgvector requires special casting)
    for (let i = 0; i < createdChunks.length; i++) {
      const chunk = createdChunks[i]!;
      const embedding = embeddings[i]!;
      const vectorStr = `[${embedding.map((v) => v.toFixed(8)).join(",")}]`;
      await db.$executeRawUnsafe(
        `UPDATE "knowledge_chunks" SET embedding = '${vectorStr}'::vector WHERE id = $1`,
        chunk.id
      );
    }
  } catch (err) {
    // Embeddings failed — document and chunks still saved, just without vectors
    console.error("Embedding generation failed:", err);
    // Don't fail the whole action — document is still useful without embeddings
  }

  redirect("/knowledge");
}

export async function deleteDocumentAction(documentId: string): Promise<void> {
  await requireUser();

  // Delete chunks first (no cascade in schema), then document
  await db.knowledgeChunk.deleteMany({ where: { documentId } });
  await db.knowledgeDocument.delete({ where: { id: documentId } });

  redirect("/knowledge");
}
