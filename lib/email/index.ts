import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  // Resend is optional at startup — warn, don't crash
  console.warn("[email] RESEND_API_KEY not set — emails disabled");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "NaturoDesk <noreply@naturodesk.fr>";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function send(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!resend) {
    console.warn("[email] Skipped (no API key):", opts.subject, "→", opts.to);
    return { ok: false, error: "email_disabled" };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    console.error("[email] Send error:", err);
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Appointment confirmation email
// ---------------------------------------------------------------------------

interface AppointmentConfirmationData {
  patientEmail: string;
  patientFirstName: string;
  practitionerName: string;
  cabinetName: string | null;
  appointmentDate: string; // pre-formatted date string
  appointmentTime: string; // pre-formatted time string
  appointmentDuration: number; // minutes
  appointmentType: "BILAN" | "SUIVI";
  locale: "fr" | "en";
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationData
): Promise<SendResult> {
  const isFr = data.locale === "fr";

  const typeLabelFr =
    data.appointmentType === "BILAN" ? "Bilan de vitalité" : "Consultation de suivi";
  const typeLabelEn =
    data.appointmentType === "BILAN" ? "Vitality assessment" : "Follow-up consultation";
  const typeLabel = isFr ? typeLabelFr : typeLabelEn;

  const cabinet = data.cabinetName ?? data.practitionerName;

  const subject = isFr
    ? `Confirmation de votre rendez-vous — ${data.appointmentDate}`
    : `Appointment confirmation — ${data.appointmentDate}`;

  const html = isFr
    ? buildAppointmentHtmlFr({ ...data, typeLabel, cabinet })
    : buildAppointmentHtmlEn({ ...data, typeLabel, cabinet });

  return send({ to: data.patientEmail, subject, html });
}

function buildAppointmentHtmlFr(d: AppointmentConfirmationData & { typeLabel: string; cabinet: string }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Confirmation RDV</title></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;">
      <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
      <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.cabinet}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 16px;">Bonjour ${d.patientFirstName},</p>
      <p style="color:#334155;margin:0 0 24px;">Votre rendez-vous est confirmé.</p>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#0f766e;font-weight:600;">Détails du rendez-vous</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <tr><td style="padding:4px 0;color:#64748b;">Type</td><td style="padding:4px 0;">${d.typeLabel}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Date</td><td style="padding:4px 0;">${d.appointmentDate}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Heure</td><td style="padding:4px 0;">${d.appointmentTime}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Durée</td><td style="padding:4px 0;">${d.appointmentDuration} min</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Praticien</td><td style="padding:4px 0;">${d.practitionerName}</td></tr>
        </table>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">Si vous avez des questions, n'hésitez pas à contacter votre praticien.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Logiciel de gestion de cabinet naturopathique</p>
    </div>
  </div>
</body>
</html>`;
}

function buildAppointmentHtmlEn(d: AppointmentConfirmationData & { typeLabel: string; cabinet: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Appointment Confirmation</title></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;">
      <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
      <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.cabinet}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 16px;">Hello ${d.patientFirstName},</p>
      <p style="color:#334155;margin:0 0 24px;">Your appointment is confirmed.</p>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#0f766e;font-weight:600;">Appointment details</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <tr><td style="padding:4px 0;color:#64748b;">Type</td><td style="padding:4px 0;">${d.typeLabel}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Date</td><td style="padding:4px 0;">${d.appointmentDate}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Time</td><td style="padding:4px 0;">${d.appointmentTime}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Duration</td><td style="padding:4px 0;">${d.appointmentDuration} min</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Practitioner</td><td style="padding:4px 0;">${d.practitionerName}</td></tr>
        </table>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">If you have any questions, please contact your practitioner.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Naturopathic practice management software</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Invoice sent email
// ---------------------------------------------------------------------------

interface InvoiceSentData {
  patientEmail: string;
  patientFirstName: string;
  practitionerName: string;
  cabinetName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: string; // pre-formatted currency string
  lines: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  locale: "fr" | "en";
}

export async function sendInvoiceEmail(data: InvoiceSentData): Promise<SendResult> {
  const isFr = data.locale === "fr";
  const cabinet = data.cabinetName ?? data.practitionerName;

  const subject = isFr
    ? `Votre facture ${data.invoiceNumber} — ${cabinet}`
    : `Your invoice ${data.invoiceNumber} — ${cabinet}`;

  const html = isFr
    ? buildInvoiceHtmlFr({ ...data, cabinet })
    : buildInvoiceHtmlEn({ ...data, cabinet });

  return send({ to: data.patientEmail, subject, html });
}

function buildInvoiceHtmlFr(d: InvoiceSentData & { cabinet: string }) {
  const linesHtml = d.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px 8px;color:#334155;">${l.description}</td>
          <td style="padding:6px 8px;text-align:center;color:#64748b;">${l.quantity}</td>
          <td style="padding:6px 8px;text-align:right;color:#64748b;">${l.unitPrice}</td>
          <td style="padding:6px 8px;text-align:right;color:#334155;font-weight:500;">${l.total}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Facture ${d.invoiceNumber}</title></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
        <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.cabinet}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">FACTURE</p>
        <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.invoiceNumber}</p>
      </div>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 4px;">Bonjour ${d.patientFirstName},</p>
      <p style="color:#334155;margin:0 0 24px;">Veuillez trouver ci-dessous votre facture du ${d.invoiceDate}.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <th style="padding:8px;text-align:left;color:#64748b;font-weight:500;">Désignation</th>
            <th style="padding:8px;text-align:center;color:#64748b;font-weight:500;">Qté</th>
            <th style="padding:8px;text-align:right;color:#64748b;font-weight:500;">P.U.</th>
            <th style="padding:8px;text-align:right;color:#64748b;font-weight:500;">Total</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>

      <div style="text-align:right;padding:12px 8px;border-top:2px solid #0f766e;">
        <span style="color:#64748b;font-size:14px;">Total TTC&nbsp;&nbsp;</span>
        <span style="color:#0f766e;font-size:18px;font-weight:700;">${d.invoiceTotal}</span>
      </div>

      <p style="color:#64748b;font-size:13px;margin-top:24px;">Praticien : ${d.practitionerName}</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Logiciel de gestion de cabinet naturopathique</p>
    </div>
  </div>
</body>
</html>`;
}

function buildInvoiceHtmlEn(d: InvoiceSentData & { cabinet: string }) {
  const linesHtml = d.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px 8px;color:#334155;">${l.description}</td>
          <td style="padding:6px 8px;text-align:center;color:#64748b;">${l.quantity}</td>
          <td style="padding:6px 8px;text-align:right;color:#64748b;">${l.unitPrice}</td>
          <td style="padding:6px 8px;text-align:right;color:#334155;font-weight:500;">${l.total}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${d.invoiceNumber}</title></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
        <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.cabinet}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">INVOICE</p>
        <p style="color:#99f6e4;font-size:13px;margin:4px 0 0;">${d.invoiceNumber}</p>
      </div>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 4px;">Hello ${d.patientFirstName},</p>
      <p style="color:#334155;margin:0 0 24px;">Please find your invoice dated ${d.invoiceDate} below.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <th style="padding:8px;text-align:left;color:#64748b;font-weight:500;">Description</th>
            <th style="padding:8px;text-align:center;color:#64748b;font-weight:500;">Qty</th>
            <th style="padding:8px;text-align:right;color:#64748b;font-weight:500;">Unit price</th>
            <th style="padding:8px;text-align:right;color:#64748b;font-weight:500;">Total</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>

      <div style="text-align:right;padding:12px 8px;border-top:2px solid #0f766e;">
        <span style="color:#64748b;font-size:14px;">Total&nbsp;&nbsp;</span>
        <span style="color:#0f766e;font-size:18px;font-weight:700;">${d.invoiceTotal}</span>
      </div>

      <p style="color:#64748b;font-size:13px;margin-top:24px;">Practitioner: ${d.practitionerName}</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Naturopathic practice management software</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Subscription emails
// ---------------------------------------------------------------------------

export async function sendSubscriptionActivatedEmail(opts: {
  userEmail: string;
  userName: string;
  plan: string;
  locale: "fr" | "en";
}): Promise<SendResult> {
  const isFr = opts.locale === "fr";
  const subject = isFr
    ? "Votre abonnement NaturoDesk PRO est actif"
    : "Your NaturoDesk PRO subscription is active";

  const html = isFr
    ? `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;">
      <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 16px;">Bonjour ${opts.userName},</p>
      <p style="color:#334155;margin:0 0 16px;">Votre abonnement <strong>NaturoDesk ${opts.plan}</strong> est maintenant actif. Vous avez accès à toutes les fonctionnalités.</p>
      <p style="color:#64748b;font-size:13px;margin:0;">Merci pour votre confiance.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Logiciel de gestion de cabinet naturopathique</p>
    </div>
  </div>
</body></html>`
    : `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f766e;padding:24px 32px;">
      <p style="color:#fff;font-size:20px;font-weight:600;margin:0;">NaturoDesk</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 16px;">Hello ${opts.userName},</p>
      <p style="color:#334155;margin:0 0 16px;">Your <strong>NaturoDesk ${opts.plan}</strong> subscription is now active. You have access to all features.</p>
      <p style="color:#64748b;font-size:13px;margin:0;">Thank you for your trust.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">NaturoDesk — Naturopathic practice management software</p>
    </div>
  </div>
</body></html>`;

  return send({ to: opts.userEmail, subject, html });
}
