import { z } from "zod";

const MAX_SECTION = 5000;
const MAX_SUMMARY = 2000;
const MAX_TITLE = 200;

const sectionField = z
  .string()
  .max(MAX_SECTION)
  .trim()
  .optional()
  .transform((v) => v || null);

export const CreateAdviceSheetSchema = z.object({
  patientId:      z.string().uuid(),
  consultationId: z.string().uuid().optional().nullable(),
  parentId:       z.string().uuid().optional().nullable(),
  title:          z.string().max(MAX_TITLE).trim().optional().transform((v) => v || null),
  versionMajor:   z.coerce.number().int().min(1).default(1),
  versionMinor:   z.coerce.number().int().min(0).default(0),

  consultationSummary: z.string().max(MAX_SUMMARY).trim().optional().transform((v) => v || null),

  objectives:       sectionField,
  dietaryAdvice:    sectionField,
  supplements:      sectionField,
  phytotherapy:     sectionField,
  aromatherapy:     sectionField,
  micronutrition:   sectionField,
  gemmotherapy:     sectionField,
  bachFlowers:      sectionField,
  lifestyle:        sectionField,
  physicalActivity: sectionField,
  additionalNotes:  sectionField,
  precautions:      sectionField,
});

export const UpdateAdviceSheetSchema = CreateAdviceSheetSchema
  .omit({ patientId: true, consultationId: true, parentId: true, versionMajor: true, versionMinor: true })
  .partial();

export type CreateAdviceSheetInput = z.infer<typeof CreateAdviceSheetSchema>;
export type UpdateAdviceSheetInput = z.infer<typeof UpdateAdviceSheetSchema>;
