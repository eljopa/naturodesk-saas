"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScheduleFormSchema, ScheduleJsonSchema, DAY_KEYS } from "@/lib/validators/schedule";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleErrorCode = "invalid_input" | "generic_error";

export type ScheduleFormState = {
  errorCode?: ScheduleErrorCode;
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// saveScheduleAction
//
// FormData attendu :
//   timezone    : string (ex: "Europe/Paris")
//   scheduleJson: JSON string — { monday: [{from,to}], ... }
//
// Les jours fermés doivent avoir un tableau vide [].
// ---------------------------------------------------------------------------

export async function saveScheduleAction(
  _prevState: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const user = await requireUser();

  const timezone = (formData.get("timezone") as string | null)?.trim() ?? "";
  const raw      = (formData.get("scheduleJson") as string | null)?.trim() ?? "{}";

  // Parser le JSON brut
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errorCode: "invalid_input" };
  }

  // Valider la structure hebdomadaire
  const weekResult = ScheduleJsonSchema.safeParse(parsed);
  if (!weekResult.success) return { errorCode: "invalid_input" };

  // Valider le timezone avec le schéma complet
  const fullResult = ScheduleFormSchema.safeParse({
    timezone,
    ...weekResult.data,
  });
  if (!fullResult.success) return { errorCode: "invalid_input" };

  // Construire le scheduleJson final : les jours non présents dans le payload
  // reçoivent un tableau vide (jours fermés)
  const scheduleJson: Record<string, { from: string; to: string }[]> = {};
  for (const day of DAY_KEYS) {
    scheduleJson[day] = fullResult.data[day] ?? [];
  }

  try {
    await db.practitionerSchedule.upsert({
      where:  { userId: user.id },
      create: { userId: user.id, timezone: fullResult.data.timezone, scheduleJson },
      update: { timezone: fullResult.data.timezone, scheduleJson },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/appointments/schedule");
  return { success: true };
}
