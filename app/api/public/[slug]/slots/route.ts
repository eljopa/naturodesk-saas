import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeAvailableSlots, type WeekSchedule } from "@/lib/public/slots";

// ---------------------------------------------------------------------------
// GET /api/public/[slug]/slots?date=YYYY-MM-DD&serviceId=UUID
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;

  const dateStr   = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!dateStr || !serviceId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  // Validation format date YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  // Charger la page publique
  const page = await db.therapistWebPage.findUnique({
    where: { slug },
    select: { userId: true, isPublished: true, appointmentEnabled: true },
  });

  if (!page?.isPublished || !page.appointmentEnabled) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  // Vérifier que la prestation appartient au thérapeute
  const service = await db.serviceOffering.findFirst({
    where: { id: serviceId, userId: page.userId, isActive: true },
    select: { durationMinutes: true },
  });

  if (!service) {
    return NextResponse.json({ error: "service_not_found" }, { status: 404 });
  }

  // Charger les disponibilités
  const schedule = await db.practitionerSchedule.findUnique({
    where: { userId: page.userId },
    select: { scheduleJson: true, timezone: true },
  });

  if (!schedule) {
    return NextResponse.json({ slots: [] });
  }

  // Charger tous les RDV qui chevauchent ce jour (hors CANCELLED / NO_SHOW).
  // Requête d'overlap : startAt < fin_du_jour ET endAt > début_du_jour
  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59Z`);

  const existing = await db.appointment.findMany({
    where: {
      userId:  page.userId,
      status:  { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: dayEnd },
      endAt:   { gt: dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  const slots = computeAvailableSlots(
    dateStr,
    schedule.scheduleJson as WeekSchedule,
    schedule.timezone,
    service.durationMinutes,
    existing
  );

  // Ne retourner que les ISO strings — aucune donnée patient
  return NextResponse.json({
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt:   s.endAt.toISOString(),
    })),
  });
}
