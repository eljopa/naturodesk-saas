/**
 * GET /api/cron/send-appointment-reminders
 *
 * Déclenché par Vercel Cron (voir vercel.json, tous les jours). Vercel envoie
 * une requête GET avec l'en-tête `Authorization: Bearer $CRON_SECRET` dès que
 * cette variable d'environnement est définie — c'est ce header qu'on vérifie
 * ici, même pattern que /api/cron/generate-blog-article.
 *
 * Envoie un rappel par e-mail aux patients dont le rendez-vous approche (voir
 * lib/appointments/send-reminders.ts pour la fenêtre exacte). N'envoie jamais
 * deux fois le même rappel (reminderSentAt) et ne lève jamais.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendAppointmentRemindersOnce } from "@/lib/appointments/send-reminders";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/send-appointment-reminders] CRON_SECRET non définie");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendAppointmentRemindersOnce().catch((err) => {
    console.error("[cron/send-appointment-reminders] Run failed:", err);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "run_failed" }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
