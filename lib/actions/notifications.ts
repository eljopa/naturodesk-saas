"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

const MAX_NOTIFICATIONS = 20;

/** Notifications de l'utilisateur connecté (praticien ou admin — le modèle n'est pas lié au rôle). */
export async function getNotificationsAction(): Promise<{ items: NotificationDto[]; unreadCount: number }> {
  const user = await requireUser();
  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);
  return { items, unreadCount };
}

/** Le filtre userId dans le where garantit qu'on ne peut marquer que ses propres notifications. */
export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
}
