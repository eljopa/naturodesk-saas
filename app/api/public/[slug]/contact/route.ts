import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ContactFormSchema } from "@/lib/validators/public";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { sendContactMessageEmail } from "@/lib/email";
import { notifyNewContactMessage } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// POST /api/public/[slug]/contact
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit : 5 req / 15 min par IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  // Charger la page
  const page = await db.therapistWebPage.findUnique({
    where: { slug },
    select: {
      userId: true,
      isPublished: true,
      contactFormEnabled: true,
      contactEmail: true,
      user: { select: { name: true, cabinetName: true, email: true } },
    },
  });

  if (!page?.isPublished || !page.contactFormEnabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Parser le body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = ContactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Honeypot — réponse 200 silencieuse (ne pas signaler au bot)
  if (parsed.data.honeypot !== "") {
    return NextResponse.json({ ok: true });
  }

  const { senderName, senderEmail, senderPhone, message } = parsed.data;

  // Stocker le message en base
  const contactMessage = await db.contactMessage.create({
    data: {
      userId: page.userId,
      senderName,
      senderEmail,
      senderPhone: senderPhone ?? null,
      message,
    },
  });

  // Envoyer l'email au thérapeute (feu-et-oubli)
  const recipientEmail = page.contactEmail ?? page.user.email;
  sendContactMessageEmail({
    practitionerEmail: recipientEmail,
    practitionerName:  page.user.name,
    cabinetName:       page.user.cabinetName ?? null,
    senderName,
    senderEmail,
    senderPhone:       senderPhone ?? null,
    message,
  }).catch((e) => console.error("[email] Contact message email failed:", e));

  notifyNewContactMessage(page.userId, senderName, contactMessage.id).catch((e) =>
    console.error("[notifications] Contact message notification failed:", e)
  );

  return NextResponse.json({ ok: true });
}
