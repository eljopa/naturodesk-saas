import { z } from "zod";
import { AppointmentType } from "@prisma/client";

const nullableString = (max: number) =>
  z
    .string()
    .max(max)
    .trim()
    .optional()
    .transform((v) => v || null);

// ---------------------------------------------------------------------------
// Page web
// ---------------------------------------------------------------------------

export const WebPageFormSchema = z.object({
  slug: z
    .string()
    .min(2, "Le slug doit contenir au moins 2 caractères")
    .max(60, "Le slug ne peut pas dépasser 60 caractères")
    .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"),

  heroThemeId: z.coerce.number().int().min(1).max(10).default(1),
  heroImageId:     nullableString(20),
  logoUrl:         nullableString(500),
  bio:             nullableString(500),
  presentation:    nullableString(3000),
  address:         nullableString(300),
  phone:           nullableString(30),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Email de contact invalide",
    }),

  // Réseaux sociaux — accepte toute URL ou vide
  instagram: nullableString(300),
  facebook:  nullableString(300),
  linkedin:  nullableString(300),
  website:   nullableString(300),

  seoTitle:       nullableString(60),
  seoDescription: nullableString(160),

  // Place ID Google Business Profile — sert à afficher les avis Google sur la page publique
  googlePlaceId: z
    .string()
    .max(300)
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^[A-Za-z0-9_-]+$/.test(v), {
      message: "Google Place ID invalide",
    }),

  // Checkboxes — FormData envoie "on" si coché, absent si non coché
  contactFormEnabled: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  appointmentEnabled: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export type WebPageFormData = z.infer<typeof WebPageFormSchema>;

// ---------------------------------------------------------------------------
// Rubrique d'information (spécialité / discipline / approche)
// ---------------------------------------------------------------------------

export const WebPageInfoSectionSchema = z.object({
  title: z.string().min(1, "Titre requis").max(100).trim(),
  description: z.string().min(1, "Description requise").max(2000).trim(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export type WebPageInfoSectionData = z.infer<typeof WebPageInfoSectionSchema>;

// ---------------------------------------------------------------------------
// Prestation
// ---------------------------------------------------------------------------

export const ServiceOfferingSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est obligatoire")
    .max(100)
    .trim(),

  description: nullableString(500),

  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "Durée minimale 15 minutes")
    .max(480, "Durée maximale 480 minutes"),

  price: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : parseFloat(v)))
    .refine((v) => v === null || (!isNaN(v) && v >= 0 && v <= 99999), {
      message: "Tarif invalide",
    }),

  appointmentType: z.nativeEnum(AppointmentType).default(AppointmentType.BILAN),

  displayOrder: z.coerce.number().int().min(0).default(0),
});

export type ServiceOfferingData = z.infer<typeof ServiceOfferingSchema>;
