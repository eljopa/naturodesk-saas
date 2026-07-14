"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit";
import { sendSupportTicketAdminReplyEmail } from "@/lib/email";
import { notifyTicketAdminReply, notifyTicketResolved, notifyTicketClosed } from "@/lib/notifications";
import { z } from "zod";
import type { SupportTicketStatus, SupportPriority } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminSupportErrorCode =
  | "not_found"
  | "invalid_input"
  | "generic_error";

export type AdminSupportFormState = {
  errorCode?: AdminSupportErrorCode;
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// Update ticket status + priority
// ---------------------------------------------------------------------------

const UpdateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

export async function updateTicketAction(
  ticketId: string,
  _prevState: AdminSupportFormState,
  formData: FormData
): Promise<AdminSupportFormState> {
  const admin = await requireAdmin();

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { errorCode: "not_found" };

  const parsed = UpdateTicketSchema.safeParse({
    status: formData.get("status"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  const resolvedAt =
    parsed.data.status === "RESOLVED" && ticket.status !== "RESOLVED"
      ? new Date()
      : parsed.data.status !== "RESOLVED"
      ? null
      : ticket.resolvedAt;

  try {
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: parsed.data.status as SupportTicketStatus,
        priority: parsed.data.priority as SupportPriority,
        resolvedAt,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "ticket.update",
    targetType: "SupportTicket",
    targetId: ticketId,
    meta: { status: parsed.data.status, priority: parsed.data.priority },
  });

  if (parsed.data.status !== ticket.status) {
    if (parsed.data.status === "RESOLVED") {
      notifyTicketResolved(ticket.userId, ticketId, ticket.title).catch(() => {});
    } else if (parsed.data.status === "CLOSED") {
      notifyTicketClosed(ticket.userId, ticketId, ticket.title).catch(() => {});
    }
  }

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reply to ticket (admin reply)
// ---------------------------------------------------------------------------

const ReplySchema = z.object({
  body: z.string().min(1).max(5000).trim(),
});

export async function replyToTicketAction(
  ticketId: string,
  _prevState: AdminSupportFormState,
  formData: FormData
): Promise<AdminSupportFormState> {
  const admin = await requireAdmin();

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!ticket) return { errorCode: "not_found" };

  const parsed = ReplySchema.safeParse({
    body: formData.get("body"),
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.supportTicketReply.create({
      data: {
        ticketId,
        authorId: admin.id,
        isAdmin: true,
        body: parsed.data.body,
      },
    });

    // Auto-transition OPEN → IN_PROGRESS on first admin reply
    if (ticket.status === "OPEN") {
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "ticket.reply",
    targetType: "SupportTicket",
    targetId: ticketId,
  });

  sendSupportTicketAdminReplyEmail({
    userEmail: ticket.user.email,
    userName: ticket.user.name,
    ticketId,
    title: ticket.title,
    body: parsed.data.body,
  }).catch(() => {});
  notifyTicketAdminReply(ticket.userId, ticketId, ticket.title).catch(() => {});

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  return { success: true };
}
