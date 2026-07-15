/**
 * Rappels automatiques de rendez-vous (J-1 environ). Le cron tourne une fois
 * par jour ; on sélectionne tout rendez-vous SCHEDULED démarrant dans les 36h
 * à venir et pas encore rappelé (reminderSentAt IS NULL). Idempotent :
 * reminderSentAt n'est posé qu'après envoi réussi, donc un échec (ou un run
 * manqué) est simplement retenté au run suivant tant que le RDV n'est pas
 * passé — pas de fenêtre stricte de 24h à respecter au run près.
 */

import { db } from "@/lib/db";
import { sendAppointmentReminderEmail } from "@/lib/email";

const REMINDER_WINDOW_MS = 36 * 60 * 60 * 1000;

export interface SendRemindersResult {
  candidates: number;
  sent: number;
  failed: number;
  skippedNoEmail: number;
}

export async function sendAppointmentRemindersOnce(): Promise<SendRemindersResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const appointments = await db.appointment.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      startAt: { gte: now, lte: windowEnd },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      type: true,
      patient: { select: { email: true, firstName: true } },
      user: { select: { name: true, cabinetName: true } },
    },
  });

  const result: SendRemindersResult = { candidates: appointments.length, sent: 0, failed: 0, skippedNoEmail: 0 };

  for (const appt of appointments) {
    if (!appt.patient.email) {
      result.skippedNoEmail++;
      continue;
    }

    const dateLabel = appt.startAt.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    });
    const timeLabel = appt.startAt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });

    const sendResult = await sendAppointmentReminderEmail({
      patientEmail: appt.patient.email,
      patientFirstName: appt.patient.firstName,
      practitionerName: appt.user.name,
      cabinetName: appt.user.cabinetName ?? null,
      appointmentDate: dateLabel,
      appointmentTime: timeLabel,
      appointmentDuration: Math.round((appt.endAt.getTime() - appt.startAt.getTime()) / 60000),
      appointmentType: appt.type,
      locale: "fr",
    }).catch((err) => {
      console.error("[appointments/reminders] Send error:", err);
      return { ok: false as const, error: String(err) };
    });

    if (sendResult.ok) {
      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      result.sent++;
    } else {
      result.failed++;
    }
  }

  return result;
}
