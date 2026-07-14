"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateTicketSchema, ReplyTicketSchema } from "@/lib/validators/support";
import { sendSupportTicketCreatedEmail, sendSupportTicketUserReplyEmail } from "@/lib/email";

export type SupportErrorCode = "not_found" | "invalid_input" | "forbidden" | "generic_error";
export type SupportFormState = { errorCode?: SupportErrorCode; success?: boolean; ticketId?: string } | null;

export async function createTicketAction(
  _prevState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const user = await requireUser();

  const parsed = CreateTicketSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    priority: formData.get("priority") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  let ticketId: string;
  try {
    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        body: parsed.data.body,
        priority: parsed.data.priority,
      },
    });
    ticketId = ticket.id;
  } catch {
    return { errorCode: "generic_error" };
  }

  sendSupportTicketCreatedEmail({
    ticketId,
    title: parsed.data.title,
    body: parsed.data.body,
    priority: parsed.data.priority,
    userName: user.name,
    userEmail: user.email,
  }).catch(() => {});

  revalidatePath("/support");
  return { success: true, ticketId };
}

/** Réponse du praticien sur son propre ticket. Une réponse sur un ticket RESOLVED le rouvre automatiquement. */
export async function replyToTicketAction(
  ticketId: string,
  _prevState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const user = await requireUser();

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== user.id) return { errorCode: "not_found" };
  if (ticket.status === "CLOSED") return { errorCode: "forbidden" };

  const parsed = ReplyTicketSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.supportTicketReply.create({
      data: { ticketId, authorId: user.id, isAdmin: false, body: parsed.data.body },
    });
    if (ticket.status === "RESOLVED") {
      await db.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN", resolvedAt: null } });
    }
  } catch {
    return { errorCode: "generic_error" };
  }

  sendSupportTicketUserReplyEmail({
    ticketId,
    title: ticket.title,
    body: parsed.data.body,
    userName: user.name,
  }).catch(() => {});

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  return { success: true };
}

/** Rouvre un ticket RESOLVED ou CLOSED sans avoir besoin d'écrire un message. */
export async function reopenTicketAction(
  ticketId: string,
  _prevState: SupportFormState,
  _formData: FormData
): Promise<SupportFormState> {
  const user = await requireUser();

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== user.id) return { errorCode: "not_found" };
  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") return { errorCode: "forbidden" };

  try {
    await db.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN", resolvedAt: null } });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  return { success: true };
}
