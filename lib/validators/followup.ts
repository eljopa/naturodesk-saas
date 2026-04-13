import { z } from "zod";

export const CreateFollowUpSchema = z.object({
  patientId: z.string().uuid("patientId invalide"),
  appointmentId: z.string().uuid().optional().nullable(),
  symptomEvolution: z.string().max(3000).optional().nullable(),
  protocolAdjustment: z.string().max(3000).optional().nullable(),
  observations: z.string().max(3000).optional().nullable(),
  nextSteps: z.string().max(3000).optional().nullable(),
});

export const UpdateFollowUpSchema = CreateFollowUpSchema.omit({
  patientId: true,
}).partial();

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>;
