import { z } from "zod";

// ---------------------------------------------------------------------------
// Types publics (partagés avec le composant client)
// ---------------------------------------------------------------------------

export const DAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------------------
// TimeBlock : une plage horaire {from, to}
// ---------------------------------------------------------------------------

export const TimeBlockSchema = z
  .object({
    from: z.string().regex(TIME_RE, "Format HH:MM requis"),
    to:   z.string().regex(TIME_RE, "Format HH:MM requis"),
  })
  .refine((b) => b.from < b.to, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["to"],
  });

export type TimeBlock = z.infer<typeof TimeBlockSchema>;

// ---------------------------------------------------------------------------
// Tableau de plages pour un jour : aucun chevauchement
// ---------------------------------------------------------------------------

export const DayScheduleSchema = z
  .array(TimeBlockSchema)
  .refine(
    (blocks) => {
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          if (blocks[i]!.from < blocks[j]!.to && blocks[i]!.to > blocks[j]!.from) {
            return false;
          }
        }
      }
      return true;
    },
    { message: "Les plages ne doivent pas se chevaucher" }
  );

// ---------------------------------------------------------------------------
// Schéma complet de la semaine + timezone
// ---------------------------------------------------------------------------

export const ScheduleFormSchema = z.object({
  timezone:  z.string().min(1).max(100),
  monday:    DayScheduleSchema,
  tuesday:   DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday:  DayScheduleSchema,
  friday:    DayScheduleSchema,
  saturday:  DayScheduleSchema,
  sunday:    DayScheduleSchema,
});

export type ScheduleFormData = z.infer<typeof ScheduleFormSchema>;

// Schéma utilisé pour valider le JSON brut reçu depuis FormData
export const ScheduleJsonSchema = ScheduleFormSchema.omit({ timezone: true });
export type WeekScheduleJson = z.infer<typeof ScheduleJsonSchema>;
