"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProtocolErrorCode =
  | "invalid_input"
  | "not_found"
  | "generic_error";

export type ProtocolFormState = {
  errorCode?: ProtocolErrorCode;
} | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const PROTOCOL_CATEGORIES = [
  "DIGESTIVE",
  "HORMONAL",
  "STRESS",
  "DETOX",
  "IMMUNITY",
  "ENERGY",
  "OTHER",
] as const;

const ProtocolSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  category: z.enum(PROTOCOL_CATEGORIES),
  summary: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => v || null),
  content: z
    .string()
    .max(20000)
    .trim()
    .optional()
    .transform((v) => v || null),
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createProtocolAction(
  _prevState: ProtocolFormState,
  formData: FormData
): Promise<ProtocolFormState> {
  await requireUser();
  // Note: ProtocolTemplate has no userId in the schema (global templates).
  // Any authenticated practitioner can create templates.
  // Multi-tenant per-user filtering can be added later by extending the schema.

  const parsed = ProtocolSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    content: formData.get("content") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  // Unique slug: base + timestamp to avoid collisions
  const slug = `${toSlug(parsed.data.title)}-${Date.now()}`;

  let protocol;
  try {
    protocol = await db.protocolTemplate.create({
      data: {
        title: parsed.data.title,
        category: parsed.data.category,
        slug,
        contentJson: {
          summary: parsed.data.summary,
          content: parsed.data.content ?? "",
        },
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect(`/protocols/${protocol.id}/edit`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateProtocolAction(
  protocolId: string,
  _prevState: ProtocolFormState,
  formData: FormData
): Promise<ProtocolFormState> {
  await requireUser();

  const existing = await db.protocolTemplate.findUnique({
    where: { id: protocolId },
  });
  if (!existing) return { errorCode: "not_found" };

  const parsed = ProtocolSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    content: formData.get("content") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.protocolTemplate.update({
      where: { id: protocolId },
      data: {
        title: parsed.data.title,
        category: parsed.data.category,
        contentJson: {
          summary: parsed.data.summary,
          content: parsed.data.content ?? "",
        },
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/protocols/${protocolId}/edit`);
  revalidatePath("/protocols");
  redirect("/protocols");
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProtocolAction(
  protocolId: string
): Promise<void> {
  await requireUser();

  try {
    await db.protocolTemplate.delete({ where: { id: protocolId } });
  } catch {
    // Silent — protocol may not exist
  }

  revalidatePath("/protocols");
  redirect("/protocols");
}
