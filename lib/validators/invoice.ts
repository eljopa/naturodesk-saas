import { z } from "zod";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

export const InvoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
});

export const CreateInvoiceSchema = z.object({
  patientId: z.string().uuid("patientId invalide"),
  lines: z.array(InvoiceLineSchema).min(1, "Au moins une ligne requise"),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().nullable(),
  issuedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().nullable(),
  issuedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceLineInput = z.infer<typeof InvoiceLineSchema>;
