/**
 * FitFirst business clock — America/New_York wall time.
 *
 * All task / call / reminder / calendar create, edit, display, bucketing,
 * notifications, and Google sync should go through these helpers so surfaces
 * never disagree on the day or instant.
 */

export const ET_TIME_ZONE = "America/New_York";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;
const LOCAL_DT_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

export function etZonedParts(
  value: Date,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-US", { timeZone: ET_TIME_ZONE, ...options }).formatToParts(
    value,
  );
}

/** `YYYY-MM-DD` for an instant in America/New_York. */
export function etDateKey(value: Date): string {
  const parts = etZonedParts(value, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

/** Today's Eastern calendar date as `YYYY-MM-DD` (never `toISOString().slice`). */
export function etTodayDateKey(now: Date = new Date()): string {
  return etDateKey(now);
}

export function etWallClockParts(value: Date): {
  date: string;
  time: string;
  hour: number;
  minute: number;
} {
  const parts = etZonedParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let hour = part(parts, "hour");
  // Some engines report midnight as "24" with hour12:false — normalize to 00.
  if (hour === "24") hour = "00";
  const date = `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
  const time = `${hour}:${part(parts, "minute")}`;
  return {
    date,
    time,
    hour: Number(hour),
    minute: Number(part(parts, "minute")),
  };
}

/** Offset of `timeZone` at `instant`, in milliseconds (negative west of UTC). */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const asZone = Date.UTC(
    Number(part(parts, "year")),
    Number(part(parts, "month")) - 1,
    Number(part(parts, "day")),
    Number(part(parts, "hour")),
    Number(part(parts, "minute")),
    Number(part(parts, "second")),
  );
  return asZone - instant.getTime();
}

/** Convert a zone wall-clock `YYYY-MM-DDTHH:MM:SS` to a UTC Date. */
export function zonedLocalToUtc(localIso: string, timeZone: string = ET_TIME_ZONE): Date {
  const asUtc = new Date(`${localIso}Z`);
  if (Number.isNaN(asUtc.getTime())) return asUtc;
  const first = tzOffsetMs(asUtc, timeZone);
  let utc = new Date(asUtc.getTime() - first);
  const second = tzOffsetMs(utc, timeZone);
  if (second !== first) utc = new Date(asUtc.getTime() - second);
  return utc;
}

/** ET wall-clock date + time → UTC instant. */
export function etWallToUtc(dateRaw: string, timeRaw: string): Date | null {
  const date = String(dateRaw ?? "").trim();
  const time = String(timeRaw ?? "").trim();
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  return zonedLocalToUtc(`${date}T${time}:00`, ET_TIME_ZONE);
}

/**
 * Parse a form datetime for desk scheduling.
 * - `YYYY-MM-DDTHH:MM` → America/New_York wall clock
 * - Absolute ISO with `Z` or ±offset → that instant
 */
export function parseEtDateTimeLocal(raw: string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = LOCAL_DT_RE.exec(s);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, day, hh, mm, ss] = m;
  return zonedLocalToUtc(
    `${y}-${mo}-${day}T${hh ?? "00"}:${mm ?? "00"}:${ss ?? "00"}`,
    ET_TIME_ZONE,
  );
}

/** Start / end of an Eastern calendar day as UTC instants. */
export function etDayBounds(dateKeyOrInstant: string | Date): { start: Date; end: Date } {
  const key =
    typeof dateKeyOrInstant === "string" && DATE_RE.test(dateKeyOrInstant)
      ? dateKeyOrInstant
      : etDateKey(dateKeyOrInstant instanceof Date ? dateKeyOrInstant : new Date());
  const start = zonedLocalToUtc(`${key}T00:00:00`, ET_TIME_ZONE);
  const endSecond = zonedLocalToUtc(`${key}T23:59:59`, ET_TIME_ZONE);
  return { start, end: new Date(endSecond.getTime() + 999) };
}

export function etStartOfDay(dateKeyOrInstant: string | Date): Date {
  return etDayBounds(dateKeyOrInstant).start;
}

export function etEndOfDay(dateKeyOrInstant: string | Date): Date {
  return etDayBounds(dateKeyOrInstant).end;
}

export function sameEtDay(a: Date, b: Date): boolean {
  return etDateKey(a) === etDateKey(b);
}

/** Chip / list label: `Thu, Sep 24` in Eastern. */
export function formatEtWeekdayMonthDay(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    timeZone: ET_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatEtMonthDay(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    timeZone: ET_TIME_ZONE,
    month: "short",
    day: "numeric",
  });
}

/** Task priority picklist values → panel urgency. */
export type TaskPriority = "none" | "low" | "normal" | "high";

export function normalizeTaskPriority(raw: unknown): TaskPriority | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "high" || v === "urgent" || v === "critical") return "high";
  if (v === "low") return "low";
  if (v === "normal" || v === "medium") return "normal";
  if (v === "none" || v === "") return "none";
  return null;
}

/**
 * Panel urgency from chosen task priority once the item is already inside
 * the auto-remind window. Priority colors that nudge; it does not open one
 * while the due instant is still hours or days away.
 */
export function urgencyFromTaskPriority(
  priority: TaskPriority | null | undefined,
  timeBased: "high" | "medium" | "low" | null,
): "high" | "medium" | "low" | null {
  if (timeBased == null) return null;
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return timeBased;
}


/** `YYYY-MM-DDTHH:MM` for `<input type="datetime-local">` — Eastern wall clock. */
export function toEtDateTimeLocal(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : parseEtDateTimeLocal(String(value));
  if (!d || Number.isNaN(d.getTime())) return "";
  const wall = etWallClockParts(d);
  return `${wall.date}T${wall.time}`;
}

/** Stable source_id linking calendar activities ↔ review_tasks. */
export function reviewTaskActivitySourceId(taskId: string): string {
  return `review_task:${taskId}`;
}

export function parseReviewTaskIdFromSource(sourceId: string | null | undefined): string | null {
  const s = String(sourceId ?? "");
  const m = /^review_task:([0-9a-f-]{36})$/i.exec(s);
  return m?.[1] ?? null;
}
