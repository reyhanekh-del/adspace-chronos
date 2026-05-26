/** Schedule UI times are whole hours only (minutes always :00). */
export const HOUR_TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, "0")}:00`
);

/** End times may use 24:00 for end-of-day. */
export const HOUR_END_TIME_OPTIONS = [...HOUR_TIME_OPTIONS, "24:00"];

export function hourFromTime(t: string): number {
  const h = Number((t ?? "00:00").split(":")[0]);
  return Number.isFinite(h) ? h : 0;
}

export function normalizeHourOnlyTime(t: string, maxHour = 23): string {
  const h = hourFromTime(t);
  if (maxHour >= 24 && h >= 24) return "24:00";
  const hour = Math.min(maxHour, Math.max(0, h));
  return `${String(hour).padStart(2, "0")}:00`;
}

export function hourToTimeString(h: number, maxHour = 23): string {
  const hour = Math.min(maxHour, Math.max(0, Math.floor(h)));
  return `${String(hour).padStart(2, "0")}:00`;
}
