"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceOfferingSchema } from "@/lib/validators/webpage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceErrorCode =
  | "invalid_input"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type ServiceFormState = {
  errorCode?: ServiceErrorCode;
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// createServiceAction
// ---------------------------------------------------------------------------

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();

  const parsed = ServiceOfferingSchema.safeParse({
    name:            formData.get("name"),
    description:     formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    price:           formData.get("price"),
    appointmentType: formData.get("appointmentType"),
    displayOrder:    formData.get("displayOrder"),
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.serviceOffering.create({
      data: { userId: user.id, ...parsed.data },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/webpage");
  return { success: true };
}

// ---------------------------------------------------------------------------
// updateServiceAction
// ---------------------------------------------------------------------------

export async function updateServiceAction(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();

  const existing = await db.serviceOffering.findUnique({
    where: { id: serviceId },
    select: { userId: true },
  });
  if (!existing) return { errorCode: "not_found" };
  if (existing.userId !== user.id) return { errorCode: "unauthorized" };

  const parsed = ServiceOfferingSchema.safeParse({
    name:            formData.get("name"),
    description:     formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    price:           formData.get("price"),
    appointmentType: formData.get("appointmentType"),
    displayOrder:    formData.get("displayOrder"),
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.serviceOffering.update({
      where: { id: serviceId },
      data: parsed.data,
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/webpage");
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteServiceAction
// ---------------------------------------------------------------------------

export async function deleteServiceAction(serviceId: string): Promise<void> {
  const user = await requireUser();

  const existing = await db.serviceOffering.findUnique({
    where: { id: serviceId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== user.id) return;

  await db.serviceOffering.delete({ where: { id: serviceId } });
  revalidatePath("/webpage");
}
