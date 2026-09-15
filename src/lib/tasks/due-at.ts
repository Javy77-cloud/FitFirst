/**
 * Quick-comm / desk task due datetimes.
 *
 * `review_tasks.due_date` is already `timestamptz`, so time is stored on the
 * existing column — no migration.
 *
 * Wall clock is America/New_York (desk default). Date-only submissions
 * (blank or missing time — including legacy forms) default to **23:59 Eastern**
 * (end of that local day). Existing rows keep whatever timestamp is already
 * stored (historically `YYYY-MM-DDT16:00:00.000Z`).
 */

export const TASK_DUE_TIMEZONE = "America/New_York";
export const DATE_ONLY_TASK_DUE_TIME = "23:59";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
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
function zonedLocalToUtc(localIso: string, timeZone: string): Date {
  const asUtc = new Date(`${localIso}Z`);
  if (Number.isNaN(asUtc.getTime())) return asUtc;
  const first = tzOffsetMs(asUtc, timeZone);
  let utc = new Date(asUtc.getTime() - first);
  const second = tzOffsetMs(utc, timeZone);
  if (second !== first) utc = new Date(asUtc.getTime() - second);
  return utc;
}

export function parseTaskDueAt(
  dateRaw: string | null | undefined,
  timeRaw?: string | null,
): Date | null {
  const date = String(dateRaw ?? "").trim();
  if (!DATE_RE.test(date)) return null;
  const trimmedTime = String(timeRaw ?? "").trim();
  const time = trimmedTime || DATE_ONLY_TASK_DUE_TIME;
  if (!TIME_RE.test(time)) return null;
  return zonedLocalToUtc(`${date}T${time}:00`, TASK_DUE_TIMEZONE);
}

/** Read `dueDate` + optional `dueTime` from a task form. */
export function taskDueFromForm(
  form: FormData,
  fallback: Date = new Date(),
): Date {
  return parseTaskDueAt(String(form.get("dueDate") ?? ""), String(form.get("dueTime") ?? "")) ?? fallback;
}

export function taskDueInputParts(
  value: Date | string | null | undefined,
): { date: string; time: string } {
  if (value == null || value === "") return { date: "", time: "" };
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASK_DUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  return {
    date: `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`,
    time: `${part(parts, "hour")}:${part(parts, "minute")}`,
  };
}

/** Popup `createdAt` — future dues wait until that instant; past dues fire now. */
export function taskReminderFireAt(dueDate: Date, now = new Date()): Date {
  return dueDate.getTime() > now.getTime() ? dueDate : now;
}

/** List/card display: M-D-Y plus clock in America/New_York. */
export function formatTaskDueAt(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASK_DUE_TIMEZONE,
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const dayPeriod = part(parts, "dayPeriod");
  return `${part(parts, "month")}-${part(parts, "day")}-${part(parts, "year")} ${part(parts, "hour")}:${part(parts, "minute")} ${dayPeriod}`;
}
