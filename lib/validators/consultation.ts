import { z } from "zod";

export const SymptomSchema = z.object({
  label: z.string().min(1).max(500),
  intensity: z.number().int().min(1).max(10).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const MedicationSchema = z.object({
  name: z.string().min(1).max(500),
  dosage: z.string().max(200).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
});

export const SupplementSchema = z.object({
  name: z.string().min(1).max(500),
  dosage: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
});

export const CreateConsultationSchema = z.object({
  patientId: z.string().uuid("patientId invalide"),
  appointmentId: z.string().uuid().optional().nullable(),
  context: z.string().max(5000).optional().nullable(),
  symptoms: z.array(SymptomSchema).default([]),
  medications: z.array(MedicationSchema).default([]),
  supplements: z.array(SupplementSchema).default([]),
});

export const UpdateConsultationSchema = z.object({
  context: z.string().max(5000).optional().nullable(),
  symptoms: z.array(SymptomSchema).optional(),
  medications: z.array(MedicationSchema).optional(),
  supplements: z.array(SupplementSchema).optional(),
});

export type CreateConsultationInput = z.infer<typeof CreateConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof UpdateConsultationSchema>;
export type SymptomInput = z.infer<typeof SymptomSchema>;
export type MedicationInput = z.infer<typeof MedicationSchema>;
export type SupplementInput = z.infer<typeof SupplementSchema>;
