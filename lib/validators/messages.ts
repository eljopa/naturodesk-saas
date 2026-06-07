import { z } from "zod";

export const NoteSchema = z.object({
  notes: z.string().max(2000),
});
