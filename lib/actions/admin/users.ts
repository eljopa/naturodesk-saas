"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit";
import { z } from "zod";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUserErrorCode =
  | "not_found"
  | "cannot_suspend_admin"
  | "invalid_input"
  | "generic_error";

export type AdminUserFormState = {
  errorCode?: AdminUserErrorCode;
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// Shared guard: user must exist and not be soft-deleted
// ---------------------------------------------------------------------------

async function findActiveUser(userId: string) {
  return db.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
}

// ---------------------------------------------------------------------------
// Suspend user (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export async function suspendUserAction(
  userId: string,
  _prevState: AdminUserFormState,
  _formData: FormData
): Promise<AdminUserFormState> {
  const admin = await requireSuperAdmin();

  const target = await findActiveUser(userId);
  if (!target) return { errorCode: "not_found" };
  // Prevent suspending any admin role
  if (target.role === "ADMIN" || target.role === "SUPER_ADMIN") {
    return { errorCode: "cannot_suspend_admin" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "user.suspend",
    targetType: "User",
    targetId: userId,
    meta: { targetEmail: target.email },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reactivate user (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export async function reactivateUserAction(
  userId: string,
  _prevState: AdminUserFormState,
  _formData: FormData
): Promise<AdminUserFormState> {
  const admin = await requireSuperAdmin();

  const target = await findActiveUser(userId);
  if (!target) return { errorCode: "not_found" };

  try {
    await db.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "user.reactivate",
    targetType: "User",
    targetId: userId,
    meta: { targetEmail: target.email },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update subscription (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

const UpdateSubscriptionSchema = z.object({
  plan: z.enum(["FREE", "PRO"]),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]),
  trialEndsAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  currentPeriodStart: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  currentPeriodEnd: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  cancelAtPeriodEnd: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  notes: z
    .string()
    .max(1000)
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function upsertSubscriptionAction(
  userId: string,
  _prevState: AdminUserFormState,
  formData: FormData
): Promise<AdminUserFormState> {
  const admin = await requireSuperAdmin();

  const target = await findActiveUser(userId);
  if (!target) return { errorCode: "not_found" };

  const parsed = UpdateSubscriptionSchema.safeParse({
    plan: formData.get("plan"),
    status: formData.get("status"),
    trialEndsAt: formData.get("trialEndsAt") || undefined,
    currentPeriodStart: formData.get("currentPeriodStart") || undefined,
    currentPeriodEnd: formData.get("currentPeriodEnd") || undefined,
    cancelAtPeriodEnd: formData.get("cancelAtPeriodEnd") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  const subData = {
    plan: parsed.data.plan as SubscriptionPlan,
    status: parsed.data.status as SubscriptionStatus,
    trialEndsAt: parsed.data.trialEndsAt,
    currentPeriodStart: parsed.data.currentPeriodStart,
    currentPeriodEnd: parsed.data.currentPeriodEnd,
    cancelAtPeriodEnd: parsed.data.cancelAtPeriodEnd,
    notes: parsed.data.notes,
  };

  try {
    await db.subscription.upsert({
      where: { userId },
      create: { userId, ...subData },
      update: subData,
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "subscription.update",
    targetType: "User",
    targetId: userId,
    meta: {
      targetEmail: target.email,
      plan: parsed.data.plan,
      status: parsed.data.status,
    },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/subscriptions");
  return { success: true };
}
