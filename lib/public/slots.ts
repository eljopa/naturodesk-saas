/**
 * Calcul des créneaux disponibles depuis PractitionerSchedule.
 *
 * Source unique de vérité pour les disponibilités : PractitionerSchedule.
 * Partagé entre la page publique et, à terme, la vue agenda du dashboard.
 *
 * scheduleJson shape :
 *   { monday: [{from:"09:00",to:"12:00"}, ...], tuesday: [], ... }
 * Jours absents ou tableau vide = non disponible.
 * Toutes les heures en "HH:MM", dans la timezone du champ timezone.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeBlock {
  from: string; // "HH:MM"
  to: string;   // "HH:MM"
}

export type WeekSchedule = Partial<Record<string, TimeBlock[]>>;

export interface Slot {
  startAt: Date;
  endAt: Date;
}

export interface ExistingAppointment {
  startAt: Date;
  endAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers timezone
// ---------------------------------------------------------------------------

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const WEEK_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getDayKey(date: Date, timezone: string): string {
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: timezone,
  })
    .formatToParts(date)
    .find((p) => p.type === "weekday")?.value ?? "Monday";

  const idx = WEEK_NAMES.indexOf(weekdayName);
  return DAY_KEYS[idx >= 0 ? idx : 1] ?? "monday";
}

/**
 * Convertit une date-locale (dateStr + timeStr dans timezone) en Date UTC.
 * Méthode : probe UTC → affichage local → calcul offset → correction.
 */
function toUtcDate(dateStr: string, timeStr: string, timezone: string): Date {
  // probe : on traite la cible comme si c'était UTC, puis on corrige
  const probe = new Date(`${dateStr}T${timeStr}:00Z`);
  // Affichage de cette heure UTC dans la timezone cible (sv-SE = format ISO)
  const localRepr = probe.toLocaleString("sv-SE", { timeZone: timezone });
  // localRepr => "YYYY-MM-DD HH:MM:SS"
  const localMs = new Date(localRepr.replace(" ", "T") + "Z").getTime();
  const offset = probe.getTime() - localMs; // négatif si timezone est en avance
  return new Date(probe.getTime() + offset);
}

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Calcul des créneaux
// ---------------------------------------------------------------------------

/**
 * Retourne les créneaux disponibles pour une date donnée.
 *
 * @param dateStr        Date demandée au format "YYYY-MM-DD"
 * @param schedule       scheduleJson du praticien
 * @param timezone       Timezone du praticien (ex: "Europe/Paris")
 * @param durationMin    Durée de la prestation en minutes
 * @param existing       RDV existants du praticien pour ce jour
 * @returns              Tableau de créneaux libres [{startAt, endAt}]
 */
export function computeAvailableSlots(
  dateStr: string,
  schedule: WeekSchedule,
  timezone: string,
  durationMin: number,
  existing: ExistingAppointment[]
): Slot[] {
  const referenceDate = new Date(`${dateStr}T12:00:00Z`); // milieu du jour pour la détection du jour
  const dayKey = getDayKey(referenceDate, timezone);
  const blocks = schedule[dayKey] ?? [];

  const slots: Slot[] = [];
  // Délai minimum : 30 minutes dans le futur
  const minBookingTime = new Date(Date.now() + 30 * 60 * 1000);

  for (const block of blocks) {
    let currentMin = timeToMinutes(block.from);
    const endMin = timeToMinutes(block.to);

    while (currentMin + durationMin <= endMin) {
      const startHH = String(Math.floor(currentMin / 60)).padStart(2, "0");
      const startMM = String(currentMin % 60).padStart(2, "0");
      const endMin2 = currentMin + durationMin;
      const endHH = String(Math.floor(endMin2 / 60)).padStart(2, "0");
      const endMM = String(endMin2 % 60).padStart(2, "0");

      const slotStart = toUtcDate(dateStr, `${startHH}:${startMM}`, timezone);
      const slotEnd = toUtcDate(dateStr, `${endHH}:${endMM}`, timezone);

      // Ne pas proposer des créneaux passés ou trop proches
      if (slotStart > minBookingTime) {
        const hasConflict = existing.some(
          (apt) => slotStart < apt.endAt && slotEnd > apt.startAt
        );
        if (!hasConflict) {
          slots.push({ startAt: slotStart, endAt: slotEnd });
        }
      }

      currentMin += durationMin;
    }
  }

  return slots;
}

/**
 * Vérifie si un créneau (startAt, endAt) entre en conflit avec des RDV existants.
 * À utiliser côté booking pour le re-check serveur.
 */
export function hasConflict(
  startAt: Date,
  endAt: Date,
  existing: ExistingAppointment[]
): boolean {
  return existing.some((apt) => startAt < apt.endAt && endAt > apt.startAt);
}

/**
 * Vérifie que le scheduleJson a au moins un jour avec une plage définie.
 */
export function isScheduleConfigured(schedule: WeekSchedule): boolean {
  return Object.values(schedule).some((blocks) => (blocks?.length ?? 0) > 0);
}
