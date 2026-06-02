import { z } from "zod";

// Champ honeypot : accepte n'importe quelle valeur (validation manuelle dans les routes).
// z.string().max(0) causerait un 400 au lieu du 200 silencieux attendu pour les bots.
const honeypot = z.string();

// ---------------------------------------------------------------------------
// Formulaire de contact
// ---------------------------------------------------------------------------

export const ContactFormSchema = z.object({
  senderName:  z.string().min(2).max(100).trim(),
  senderEmail: z.string().email().max(200).trim().toLowerCase(),
  senderPhone: z
    .string()
    .max(30)
    .trim()
    .optional()
    .transform((v) => v || null),
  message:  z.string().min(10).max(1500).trim(),
  honeypot,
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;

// ---------------------------------------------------------------------------
// Réservation en ligne
// ---------------------------------------------------------------------------

export const BookingFormSchema = z.object({
  serviceId:    z.string().uuid(),
  startAt:      z.string().datetime({ message: "Date invalide" }),
  visitorName:  z.string().min(2).max(100).trim(),
  visitorEmail: z.string().email().max(200).trim().toLowerCase(),
  visitorPhone: z
    .string()
    .max(30)
    .trim()
    .optional()
    .transform((v) => v || null),
  honeypot,
});

export type BookingFormData = z.infer<typeof BookingFormSchema>;
