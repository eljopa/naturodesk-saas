/**
 * Formats a Date as "YYYY-MM-DDTHH:mm" in local time.
 * Required for datetime-local HTML inputs (native browser format).
 * ⚠️  Uses the server's local timezone — acceptable for MVP where
 *     practitioner and server are in the same timezone.
 *     To fix for multi-timezone: store UTC, format with user's tz in client.
 */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Formats a Date as "YYYY-MM-DD" for date inputs.
 */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Rounds a date up to the next 30-minute slot, then adds offsetMinutes.
 * Returns "YYYY-MM-DDTHH:mm" string for datetime-local inputs.
 */
export function nextSlot(offsetMinutes = 0): string {
  const d = new Date();
  const mins = d.getMinutes();
  const rounded = Math.ceil((mins + 1) / 30) * 30;
  d.setMinutes(rounded + offsetMinutes, 0, 0);
  return toDateTimeLocal(d);
}
