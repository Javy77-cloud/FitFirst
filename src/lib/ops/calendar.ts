import { contactActionButtonClass, isContactActionKind } from "@/lib/desk/contact-actions";
import type { ActivityKind } from "@/lib/domain";

export type CalendarActivity = {
  id: string;
  kind: string;
  title: string;
  status: string;
  dueAt: Date | string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  assignee: string | null;
  contactId: string | null;
  accountId?: string | null;
  dealId: string | null;
  policyId: string | null;
  leadId?: string | null;
  notes: string | null;
  durationSeconds?: number | null;
  outcome?: string | null;
  phoneNumber?: string | null;
  direction?: string | null;
  meetingType?: string | null;
  meetingLocation?: string | null;
  videoProvider?: string | null;
  videoUrl?: string | null;
  inviteAudience?: string | null;
  inviteOfficeId?: string | null;
  inviteTerritoryId?: string | null;
  createdByUserId?: string | null;
  origin?: "fitfirst" | "external";
  calendarProvider?: string | null;
  calendarHtmlLink?: string | null;
  calendarVisibility?: string | null;
};

export const CALENDAR_VIEWS = ["month", "week", "day"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Javy calendar chrome — view switcher + Add event menu labels. */
export const CALENDAR_TOOLBAR_ROWS = [
  ["Month", "Week", "Day"],
  ["Add Event", "Task", "Meeting", "Call", "Email", "SMS"],
] as const;

/** Admin-only add actions (same Add event menu, under a separator). */
export const CALENDAR_ADMIN_ADD = ["Add Company Meeting", "Add Training"] as const;

export function isCalendarView(value: string | null | undefined): value is CalendarView {
  return value === "month" || value === "week" || value === "day";
}

export function parseCalendarView(value: string | undefined): CalendarView {
  return isCalendarView(value) ? value : "month";
}

export function parseKindsParam(raw: string | string[] | undefined | null): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const kinds = value
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => isActivityKind(k));
  return kinds;
}

export function filterCalendarActivities(
  activities: CalendarActivity[],
  filters: { kinds?: string[]; assignee?: string | null },
): CalendarActivity[] {
  return activities.filter((row) => {
    if (filters.kinds && filters.kinds.length > 0 && !filters.kinds.includes(row.kind)) {
      return false;
    }
    if (filters.assignee && row.assignee !== filters.assignee) return false;
    return true;
  });
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

export function rangeForView(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { from: start, to: endOfDay(addDays(start, 6)) };
  }
  const cells = monthCells(anchor);
  return { from: startOfDay(cells[0].date), to: endOfDay(cells[cells.length - 1].date) };
}

/** Preserve duration when an event is dropped on a new day or hour. */
export function rescheduleWindow(
  activity: CalendarActivity,
  nextStart: Date,
): { startAt: Date; endAt: Date; dueAt: Date } {
  const prevStart = activityAnchor(activity) ?? nextStart;
  const prevEnd = toDate(activity.endAt);
  const durationMs = prevEnd
    ? Math.max(15 * 60 * 1000, prevEnd.getTime() - prevStart.getTime())
    : activity.kind === "meeting"
      ? 30 * 60 * 1000
      : 15 * 60 * 1000;
  return {
    startAt: nextStart,
    endAt: new Date(nextStart.getTime() + durationMs),
    dueAt: nextStart,
  };
}

export function slotStart(day: Date, hour: number, minute = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

export function minutesFromHour(activity: CalendarActivity, hour: number): number {
  const start = activityAnchor(activity);
  if (!start) return 0;
  return Math.max(0, start.getMinutes() + (start.getHours() - hour) * 60);
}

export function eventHeightPx(activity: CalendarActivity, hourHeight = 48): number {
  const start = activityAnchor(activity);
  const end = activityEnd(activity);
  if (!start || !end) return Math.round(hourHeight * 0.7);
  const hours = Math.max(0.35, (end.getTime() - start.getTime()) / (60 * 60 * 1000));
  return Math.round(hours * hourHeight);
}


/** Center toolbar label for month / week / day. */
export function formatCalendarTitle(view: CalendarView, anchor: Date): string {
  if (view === "day") {
    return anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "week") {
    const week = weekDays(anchor);
    return `${week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Move anchor by one month / week / day matching the current view. */
export function shiftCalendarAnchor(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  if (view === "month") return addMonths(anchor, direction);
  if (view === "week") return addDays(anchor, direction * 7);
  return addDays(anchor, direction);
}

export function serializeCalendarActivity(row: CalendarActivity) {
  return {
    ...row,
    dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
    startAt: row.startAt ? new Date(row.startAt).toISOString() : null,
    endAt: row.endAt ? new Date(row.endAt).toISOString() : null,
  };
}

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateParam(value: string | undefined | null, fallback = new Date()): Date {
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return fallback;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function monthCells(anchor: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === anchor.getMonth() };
  });
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayHours(startHour = 7, endHour = 19): number[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
}

export function activityAnchor(activity: CalendarActivity): Date | null {
  return toDate(activity.startAt) ?? toDate(activity.dueAt);
}

export function activityEnd(activity: CalendarActivity): Date | null {
  return toDate(activity.endAt) ?? activityAnchor(activity);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function activityOnDay(activity: CalendarActivity, day: Date): boolean {
  const start = activityAnchor(activity);
  if (!start) return false;
  const end = activityEnd(activity) ?? start;
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

export function activitiesOnDay(activities: CalendarActivity[], day: Date): CalendarActivity[] {
  return activities
    .filter((a) => activityOnDay(a, day))
    .sort((a, b) => {
      const ta = activityAnchor(a)?.getTime() ?? 0;
      const tb = activityAnchor(b)?.getTime() ?? 0;
      return ta - tb;
    });
}

/** Events for the "On this view" panel — day or week only; month returns []. */
export function activitiesOnView(
  activities: CalendarActivity[],
  view: CalendarView,
  anchor: Date,
): CalendarActivity[] {
  if (view === "month") return [];
  if (view === "day") return activitiesOnDay(activities, anchor);
  const seen = new Set<string>();
  const out: CalendarActivity[] = [];
  for (const day of weekDays(anchor)) {
    for (const row of activitiesOnDay(activities, day)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

export function kindClass(kind: string, meetingType?: string | null): string {
  if (meetingType === "training") return "ff-cal-training";
  if (meetingType === "company") return "ff-cal-company";
  if (kind === "meeting") return "ff-cal-meeting";
  if (isContactActionKind(kind)) return contactActionButtonClass(kind);
  return "ff-cal-task";
}

export function eventToneColor(activity: {
  kind: string;
  meetingType?: string | null;
  origin?: "fitfirst" | "external";
  calendarProvider?: string | null;
}): string {
  if (activity.origin === "external") {
    return activity.calendarProvider === "outlook_calendar" ? "#0f4c81" : "#0f766e";
  }
  if (activity.meetingType === "training") return "#1d6fb8";
  if (activity.meetingType === "company") return "#c2410c";
  return ACTIVITY_KIND_HEX[activity.kind] ?? "#5c6b7a";
}

const ACTIVITY_KIND_HEX: Record<string, string> = {
  task: "#2563eb",
  meeting: "#7c3aed",
  call: "#059669",
  email: "#d97706",
  sms: "#0d9488",
};

export function isActivityKind(value: string): value is ActivityKind {
  return (
    value === "task" ||
    value === "meeting" ||
    value === "call" ||
    value === "sms" ||
    value === "email"
  );
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function toDateTimeLocal(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatWhen(activity: CalendarActivity): string {
  if (activity.kind === "task" || activity.kind === "sms" || activity.kind === "email") {
    const due = toDate(activity.dueAt);
    return due
      ? `Due ${due.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
      : "No due date";
  }
  const start = toDate(activity.startAt);
  const end = toDate(activity.endAt);
  if (!start) return "No start time";
  const startLabel = start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return startLabel;
  return `${startLabel} – ${formatTime(end)}`;
}
