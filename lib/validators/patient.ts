import { z } from "zod";

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  birthDate: z.string().datetime({ offset: true }).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Email invalide").optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  profession: z.string().max(200).optional().nullable(),
  allergies: z.string().max(2000).optional().nullable(),
  medicalHistory: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const ArchivePatientSchema = z.object({
  isArchived: z.boolean(),
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
