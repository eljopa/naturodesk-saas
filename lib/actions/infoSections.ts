"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WebPageInfoSectionSchema } from "@/lib/validators/webpage";

export type InfoSectionErrorCode =
  | "invalid_input"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type InfoSectionFormState = {
  errorCode?: InfoSectionErrorCode;
  success?: boolean;
} | null;

export async function createInfoSectionAction(
  _prevState: InfoSectionFormState,
  formData: FormData
): Promise<InfoSectionFormState> {
  const user = await requireUser();

  const parsed = WebPageInfoSectionSchema.safeParse({
    title:        formData.get("title"),
    description:  formData.get("description"),
    displayOrder: formData.get("displayOrder"),
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.webPageInfoSection.create({
      data: { userId: user.id, ...parsed.data },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/webpage");
  return { success: true };
}

export async function updateInfoSectionAction(
  sectionId: string,
  _prevState: InfoSectionFormState,
  formData: FormData
): Promise<InfoSectionFormState> {
  const user = await requireUser();

  const existing = await db.webPageInfoSection.findUnique({
    where: { id: sectionId },
    select: { userId: true },
  });
  if (!existing) return { errorCode: "not_found" };
  if (existing.userId !== user.id) return { errorCode: "unauthorized" };

  const parsed = WebPageInfoSectionSchema.safeParse({
    title:        formData.get("title"),
    description:  formData.get("description"),
    displayOrder: formData.get("displayOrder"),
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.webPageInfoSection.update({
      where: { id: sectionId },
      data: parsed.data,
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/webpage");
  return { success: true };
}

export async function deleteInfoSectionAction(sectionId: string): Promise<void> {
  const user = await requireUser();

  const existing = await db.webPageInfoSection.findUnique({
    where: { id: sectionId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== user.id) return;

  await db.webPageInfoSection.delete({ where: { id: sectionId } });
  revalidatePath("/webpage");
}
