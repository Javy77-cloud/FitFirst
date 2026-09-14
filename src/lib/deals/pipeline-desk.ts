import { isDueToday, isOverdue, whenForActivity } from "@/lib/activities/rules";
import { CONTACT_ACTION_COLORS } from "@/lib/desk/contact-actions";
import { formatCountdownClock, responseTimerState } from "@/lib/leads/queue";
import { matchDealLookup, type DealLookupRow } from "@/lib/deals/lookup";

export const STALE_DEAL_DAYS = 14;
export const NEXT_ACTION_FALLBACK_DAYS = 7;

/** Chip tints match row quick-action fills: Call mustard, Email navy, Task blue, Meeting purple. */
export const DEAL_ACTIVITY_TONES = {
  call: {
    chipBg: "#f8f1de",
    chipBgLight: "#fffdf7",
    chipBgDark: "#eadfb8",
    chipFg: CONTACT_ACTION_COLORS.call,
    buttonBg: CONTACT_ACTION_COLORS.call,
  },
  email: {
    chipBg: "#eef0f4",
    chipBgLight: "#fcfdff",
    chipBgDark: "#c8cdd6",
    chipFg: CONTACT_ACTION_COLORS.email,
    buttonBg: CONTACT_ACTION_COLORS.email,
  },
  task: {
    chipBg: "#e8f3ff",
    chipBgLight: "#f8fbff",
    chipBgDark: "#b6d4f5",
    chipFg: "#1d6fb8",
    buttonBg: "#1d6fb8",
  },
  meeting: {
    chipBg: "#f3effe",
    chipBgLight: "#fcfaff",
    chipBgDark: "#d4c6f5",
    chipFg: "#5b21b6",
    buttonBg: "#5b21b6",
  },
  training: {
    chipBg: "#defaf4",
    chipBgLight: "#f6fffc",
    chipBgDark: "#9ee0d4",
    chipFg: "#0f766e",
    buttonBg: "#0f766e",
  },
} as const;

/** Visible words: Phone / SMS / Task / Meeting / Training. Ids stay call / email for the work queue. */
export const DEAL_TODAY_ACTIVITY_CHIPS = [
  { id: "call", label: "Phone", tone: "mustard" },
  { id: "email", label: "SMS", tone: "navy" },
  { id: "task", label: "Task", tone: "blue" },
  { id: "meeting", label: "Meeting", tone: "purple" },
  { id: "training", label: "Training", tone: "teal" },
] as const;

export const DEAL_MEETING_ACTION_COLOR = DEAL_ACTIVITY_TONES.meeting.buttonBg;
export const DEAL_TASK_ACTION_COLOR = DEAL_ACTIVITY_TONES.task.buttonBg;

export type DealTodayActivityType = (typeof DEAL_TODAY_ACTIVITY_CHIPS)[number]["id"];

export type DealActivityTouch = {
  id: string;
  dealId?: string | null;
  kind: string;
  title: string;
  status?: string | null;
  dueAt?: Date | string | null;
  startAt?: Date | string | null;
  scheduledAt?: Date | string | null;
  meetingType?: string | null;
};

export function isDealTodayActivityType(value: string | null | undefined): value is DealTodayActivityType {
  return Boolean(value && DEAL_TODAY_ACTIVITY_CHIPS.some((chip) => chip.id === value));
}

export function classifyDealActivityType(row: Pick<DealActivityTouch, "kind" | "meetingType">): DealTodayActivityType | null {
  if (row.meetingType === "training" || row.kind === "training") return "training";
  if (row.kind === "task") return "task";
  if (row.kind === "call") return "call";
  if (row.kind === "email") return "email";
  if (row.kind === "meeting") return "meeting";
  return null;
}

export function countTodayDealActivity(
  rows: DealActivityTouch[],
  now = new Date(),
): Record<DealTodayActivityType, number> {
  const counts: Record<DealTodayActivityType, number> = {
    task: 0,
    call: 0,
    email: 0,
    meeting: 0,
    training: 0,
  };
  for (const row of rows) {
    const type = classifyDealActivityType(row);
    if (!type) continue;
    const when = whenForActivity(row);
    if (!isDueToday(when, now, row.status)) continue;
    counts[type] += 1;
  }
  return counts;
}

export function filterTodayDealActivity(
  rows: DealActivityTouch[],
  type: DealTodayActivityType,
  now = new Date(),
): DealActivityTouch[] {
  return rows.filter((row) => {
    if (classifyDealActivityType(row) !== type) return false;
    return isDueToday(whenForActivity(row), now, row.status);
  });
}

export function todayActivityWorkHref(
  type: DealTodayActivityType,
  basePath: "/deals" | "/renewals" = "/deals",
): string {
  return `${basePath}?queue=${type}`;
}

/** Tasks page is the work queue for now — relabel later. */
export function todayActivityCalendarHref(): string {
  return "/tasks";
}

/** e.g. "Monday, Sep 7" */
export function formatTodayActivityDate(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export function lastTouchedAt(input: {
  updatedAt?: Date | string | null;
  activities?: Array<{ updatedAt?: Date | string | null; completedAt?: Date | string | null }>;
}): Date | null {
  const stamps = [input.updatedAt, ...(input.activities ?? []).flatMap((row) => [row.updatedAt, row.completedAt])];
  let latest: Date | null = null;
  for (const stamp of stamps) {
    if (!stamp) continue;
    const date = stamp instanceof Date ? stamp : new Date(stamp);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  return latest;
}

export function isDealStale(input: {
  updatedAt?: Date | string | null;
  boundAt?: Date | string | null;
  archivedAt?: Date | string | null;
  pipelineStage?: string | null;
  nextDueAt?: Date | string | null;
  now?: Date;
  thresholdDays?: number;
}): boolean {
  if (input.archivedAt) return false;
  const stage = (input.pipelineStage ?? "").toLowerCase();
  if (input.boundAt || stage === "bound" || stage === "closed_won") return false;
  const next = input.nextDueAt ? new Date(input.nextDueAt) : null;
  if (next && !Number.isNaN(next.getTime()) && next.getTime() >= (input.now ?? new Date()).getTime()) {
    return false;
  }
  const touched = lastTouchedAt({ updatedAt: input.updatedAt });
  if (!touched) return true;
  const days = input.thresholdDays ?? STALE_DEAL_DAYS;
  const now = input.now ?? new Date();
  return now.getTime() - touched.getTime() > days * 24 * 60 * 60 * 1000;
}

export function nextDealActionAt(input: {
  activities?: DealActivityTouch[];
  updatedAt?: Date | string | null;
  now?: Date;
  fallbackDays?: number;
}): Date | null {
  const open = (input.activities ?? []).filter((row) => !isClosedStatus(row.status));
  let soonest: Date | null = null;
  for (const row of open) {
    const when = whenForActivity(row);
    if (!when) continue;
    if (!soonest || when.getTime() < soonest.getTime()) soonest = when;
  }
  if (soonest) return soonest;
  const touched = lastTouchedAt({ updatedAt: input.updatedAt });
  if (!touched) return null;
  const days = input.fallbackDays ?? NEXT_ACTION_FALLBACK_DAYS;
  return new Date(touched.getTime() + days * 24 * 60 * 60 * 1000);
}

function isClosedStatus(status?: string | null): boolean {
  const raw = (status ?? "").toLowerCase();
  return raw === "completed" || raw === "canceled" || raw === "cancelled";
}

export function dealNextActionState(dueAt: Date | string | null | undefined, now = new Date()) {
  const state = responseTimerState(dueAt, now);
  return {
    ...state,
    label: dueAt ? formatCountdownClock(state.overdue ? 0 : state.remainingMs) : "--:--",
    overdue: Boolean(dueAt) && (state.overdue || isOverdue(dueAt ? new Date(dueAt) : null, now)),
  };
}

export function uploadDealCta(
  deals: DealLookupRow[],
  query: string,
  dealId?: string | null,
): { kind: "idle" | "select" | "create"; match: DealLookupRow | null } {
  const trimmed = query.trim();
  if (!trimmed && !dealId) return { kind: "idle", match: null };
  const match = matchDealLookup(deals, query, dealId);
  if (match) return { kind: "select", match };
  if (!trimmed) return { kind: "idle", match: null };
  return { kind: "create", match: null };
}

export function uploadDealCtaLabel(kind: "idle" | "select" | "create"): string {
  if (kind === "select") return "Select this deal";
  if (kind === "create") return "Create deal";
  return "Select this deal";
}
