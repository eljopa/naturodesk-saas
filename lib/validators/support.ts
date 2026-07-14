import { z } from "zod";

export const CreateTicketSchema = z.object({
  title: z.string().trim().min(5, "Le titre doit contenir au moins 5 caractères").max(200),
  body: z.string().trim().min(10, "Le message doit contenir au moins 10 caractères").max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().default("NORMAL"),
});

export const ReplyTicketSchema = z.object({
  body: z.string().trim().min(1, "La réponse ne peut pas être vide").max(5000),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type ReplyTicketInput = z.infer<typeof ReplyTicketSchema>;
