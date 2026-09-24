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
 *
 * Conversions live in `@/lib/time/et` — the single Eastern scheduling module.
 */

import {
  ET_TIME_ZONE,
  etWallClockParts,
  etWallToUtc,
  parseEtDateTimeLocal,
} from "@/lib/time/et";

export const TASK_DUE_TIMEZONE = ET_TIME_ZONE;
export const DATE_ONLY_TASK_DUE_TIME = "23:59";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * Parse a form datetime for desk activities / calendar.
 * - `YYYY-MM-DDTHH:MM` → America/New_York wall clock
 * - Absolute ISO with `Z` or ±offset → that instant
 */
export function parseDeskDateTimeLocal(raw: string | null | undefined): Date | null {
  return parseEtDateTimeLocal(raw);
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
  return etWallToUtc(date, time);
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
  const wall = etWallClockParts(d);
  return { date: wall.date, time: wall.time };
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
