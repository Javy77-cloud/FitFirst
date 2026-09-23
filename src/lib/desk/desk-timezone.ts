/** FitFirst desk clock. Activity + Inbox timestamps render in this zone. */
export const DESK_TIME_ZONE = "America/New_York";

export function deskZonedParts(
  value: Date,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-US", { timeZone: DESK_TIME_ZONE, ...options }).formatToParts(value);
}

export function deskDateKey(value: Date): string {
  const parts = deskZonedParts(value, { year: "numeric", month: "2-digit", day: "2-digit" });
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

export function formatDeskDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: DESK_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDeskClock(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: DESK_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDeskMonthDay(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: DESK_TIME_ZONE,
    month: "short",
    day: "numeric",
  });
}

export function formatDeskMonthDayYear(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: DESK_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
