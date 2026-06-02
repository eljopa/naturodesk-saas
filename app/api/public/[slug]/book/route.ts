import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BookingFormSchema } from "@/lib/validators/public";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { hasConflict } from "@/lib/public/slots";
import {
  sendAppointmentConfirmationEmail,
  sendNewBookingNotificationEmail,
} from "@/lib/email";

// ---------------------------------------------------------------------------
// POST /api/public/[slug]/book
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit : 3 bookings / 60 min par IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`book:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  // Parser le body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = BookingFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Honeypot
  if (parsed.data.honeypot !== "") {
    return NextResponse.json({ ok: true });
  }

  const { serviceId, startAt: startAtStr, visitorName, visitorEmail, visitorPhone } = parsed.data;

  // Charger la page et le thérapeute
  const page = await db.therapistWebPage.findUnique({
    where: { slug },
    select: {
      userId:            true,
      isPublished:       true,
      appointmentEnabled:true,
      contactEmail:      true,        // email de contact public de la page
      user: { select: { name: true, cabinetName: true, email: true } },
    },
  });

  if (!page?.isPublished || !page.appointmentEnabled) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  // Charger la prestation
  const service = await db.serviceOffering.findFirst({
    where: { id: serviceId, userId: page.userId, isActive: true },
    select: { durationMinutes: true, name: true, appointmentType: true },
  });

  if (!service) {
    return NextResponse.json({ error: "service_not_found" }, { status: 404 });
  }

  // Calculer endAt côté serveur — jamais confié au client
  const startAt = new Date(startAtStr);
  const endAt   = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);

  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  // Vérifier que le créneau est dans le futur (30 min minimum)
  if (startAt.getTime() < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json({ error: "slot_too_soon" }, { status: 409 });
  }

  // Re-check conflit serveur (atomique avec la création via transaction)
  const conflictingAppointments = await db.appointment.findMany({
    where: {
      userId: page.userId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
    },
    select: { startAt: true, endAt: true },
  });

  if (hasConflict(startAt, endAt, conflictingAppointments)) {
    return NextResponse.json({ error: "slot_conflict" }, { status: 409 });
  }

  // Upsert patient : cherche par (userId, email), crée si absent
  const nameParts    = visitorName.trim().split(/\s+/);
  const firstName    = nameParts[0] ?? visitorName;
  const lastName     = nameParts.slice(1).join(" ") || "";

  let patient = await db.patient.findFirst({
    where: { userId: page.userId, email: visitorEmail },
    select: { id: true, firstName: true },
  });

  if (!patient) {
    patient = await db.patient.create({
      data: {
        userId:    page.userId,
        firstName,
        lastName,
        email:     visitorEmail,
        phone:     visitorPhone ?? null,
      },
      select: { id: true, firstName: true },
    });
  }

  // Créer le RDV
  const appointment = await db.appointment.create({
    data: {
      userId:    page.userId,
      patientId: patient.id,
      startAt,
      endAt,
      type:      service.appointmentType,
      status:    "SCHEDULED",
      source:    "online_booking",
    },
  });

  // Emails (feu-et-oubli)
  const practitionerNotifEmail = page.contactEmail ?? page.user.email;

  const dateLabel = startAt.toLocaleDateString("fr-FR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
    timeZone: "Europe/Paris",
  });
  const timeLabel = startAt.toLocaleTimeString("fr-FR", {
    hour:     "2-digit",
    minute:   "2-digit",
    timeZone: "Europe/Paris",
  });

  sendAppointmentConfirmationEmail({
    patientEmail:        visitorEmail,
    patientFirstName:    patient.firstName,
    practitionerName:    page.user.name,
    cabinetName:         page.user.cabinetName ?? null,
    appointmentDate:     dateLabel,
    appointmentTime:     timeLabel,
    appointmentDuration: service.durationMinutes,
    appointmentType:     service.appointmentType,
    locale:              "fr",
  }).catch((e) => console.error("[email] Booking confirmation failed:", e));

  sendNewBookingNotificationEmail({
    practitionerEmail:   practitionerNotifEmail,
    practitionerName:    page.user.name,
    cabinetName:         page.user.cabinetName ?? null,
    visitorName,
    visitorEmail,
    visitorPhone:        visitorPhone ?? null,
    serviceName:         service.name,
    appointmentDate:     dateLabel,
    appointmentTime:     timeLabel,
    appointmentDuration: service.durationMinutes,
  }).catch((e) => console.error("[email] Booking notification failed:", e));

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    startAt: startAt.toISOString(),
    endAt:   endAt.toISOString(),
  });
}
