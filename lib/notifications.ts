/**
 * Service de notifications in-app — porté depuis lib/notifications.ts (SelfHook).
 * Notifications légères stockées en base (modèle Notification), affichées par
 * la cloche du header (components/notifications/notification-bell.tsx).
 *
 * Toutes les fonctions sont non-bloquantes : un échec ici ne doit jamais faire
 * échouer le flux appelant (appeler avec .catch(() => {}) côté appelant).
 */

import { db } from "@/lib/db";
import { UserRole, type NotificationType } from "@prisma/client";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}): Promise<void> {
  await db.notification.create({ data: params });
}

async function notifyAllAdmins(params: { type: NotificationType; title: string; message: string; link: string }): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, deletedAt: null },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      db.notification.create({
        data: { userId: admin.id, type: params.type, title: params.title, message: params.message, link: params.link },
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Tickets support
// ---------------------------------------------------------------------------

export async function notifyTicketCreated(ticketId: string, ticketTitle: string, userName: string): Promise<void> {
  await notifyAllAdmins({
    type: "TICKET_CREATED",
    title: "Nouveau ticket support",
    message: `${userName} a créé un ticket : ${truncate(ticketTitle, 100)}`,
    link: `/admin/support/${ticketId}`,
  });
}

export async function notifyTicketClientReply(ticketId: string, ticketTitle: string, userName: string): Promise<void> {
  await notifyAllAdmins({
    type: "TICKET_CLIENT_REPLY",
    title: "Nouvelle réponse sur un ticket",
    message: `${userName} a répondu sur : ${truncate(ticketTitle, 100)}`,
    link: `/admin/support/${ticketId}`,
  });
}

export async function notifyTicketAdminReply(userId: string, ticketId: string, ticketTitle: string): Promise<void> {
  await createNotification({
    userId,
    type: "TICKET_ADMIN_REPLY",
    title: "Réponse du support",
    message: `Le support a répondu à votre ticket : ${truncate(ticketTitle, 100)}`,
    link: `/support/${ticketId}`,
  });
}

export async function notifyTicketResolved(userId: string, ticketId: string, ticketTitle: string): Promise<void> {
  await createNotification({
    userId,
    type: "TICKET_RESOLVED",
    title: "Ticket résolu",
    message: `Votre ticket a été marqué comme résolu : ${truncate(ticketTitle, 100)}`,
    link: `/support/${ticketId}`,
  });
}

export async function notifyTicketClosed(userId: string, ticketId: string, ticketTitle: string): Promise<void> {
  await createNotification({
    userId,
    type: "TICKET_CLOSED",
    title: "Ticket fermé",
    message: `Votre ticket a été fermé : ${truncate(ticketTitle, 100)}`,
    link: `/support/${ticketId}`,
  });
}

// ---------------------------------------------------------------------------
// Page web publique (réservation, contact)
// ---------------------------------------------------------------------------

export async function notifyNewBooking(userId: string, visitorName: string, serviceName: string): Promise<void> {
  await createNotification({
    userId,
    type: "NEW_BOOKING",
    title: "Nouvelle réservation",
    message: `${visitorName} a réservé : ${truncate(serviceName, 100)}`,
    link: "/appointments",
  });
}

export async function notifyNewContactMessage(userId: string, senderName: string, messageId: string): Promise<void> {
  await createNotification({
    userId,
    type: "NEW_CONTACT_MESSAGE",
    title: "Nouveau message",
    message: `Message reçu de ${senderName} via votre page web`,
    link: `/webpage/messages/${messageId}`,
  });
}
