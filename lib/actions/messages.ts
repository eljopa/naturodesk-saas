"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findOwned(messageId: string, userId: string) {
  return db.contactMessage.findFirst({
    where: { id: messageId, userId },
    select: { id: true },
  });
}

function revalidateAll(messageId: string) {
  revalidatePath("/webpage/messages");
  revalidatePath(`/webpage/messages/${messageId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Actions — transitions de statut
// ---------------------------------------------------------------------------

export async function markReadAction(messageId: string): Promise<void> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return;
  await db.contactMessage.update({
    where: { id: messageId },
    data: { status: "READ", isRead: true, readAt: new Date() },
  });
  revalidateAll(messageId);
}

export async function markUnreadAction(messageId: string): Promise<void> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return;
  await db.contactMessage.update({
    where: { id: messageId },
    data: { status: "UNREAD", isRead: false, readAt: null },
  });
  revalidateAll(messageId);
}

export async function markRepliedAction(messageId: string): Promise<void> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return;
  await db.contactMessage.update({
    where: { id: messageId },
    data: { status: "REPLIED", isRead: true, repliedAt: new Date() },
  });
  revalidateAll(messageId);
}

export async function archiveMessageAction(messageId: string): Promise<void> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return;
  await db.contactMessage.update({
    where: { id: messageId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  revalidateAll(messageId);
}

export async function restoreMessageAction(messageId: string): Promise<void> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return;
  await db.contactMessage.update({
    where: { id: messageId },
    data: { status: "READ", archivedAt: null },
  });
  revalidateAll(messageId);
}

// ---------------------------------------------------------------------------
// Action — note interne
// ---------------------------------------------------------------------------

export async function saveNoteAction(
  messageId: string,
  notes: string
): Promise<{ success: boolean }> {
  const user = await requireUser();
  if (!(await findOwned(messageId, user.id))) return { success: false };
  await db.contactMessage.update({
    where: { id: messageId },
    data: { notes: notes.trim() || null },
  });
  revalidatePath(`/webpage/messages/${messageId}`);
  return { success: true };
}
