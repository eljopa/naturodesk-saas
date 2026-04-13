import { z } from "zod";
import { AppointmentType, AppointmentStatus } from "@prisma/client";

export const CreateAppointmentSchema = z
  .object({
    patientId: z.string().uuid("patientId invalide"),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    type: z.nativeEnum(AppointmentType).default("BILAN"),
    notes: z.string().max(2000).optional().nullable(),
    source: z.string().max(50).optional().nullable(),
    externalId: z.string().max(200).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "La fin doit être après le début",
    path: ["endAt"],
  });

export const UpdateAppointmentSchema = z.object({
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  type: z.nativeEnum(AppointmentType).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
