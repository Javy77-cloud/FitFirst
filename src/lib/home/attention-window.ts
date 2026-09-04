import { addUtcDays, addUtcMonths, endOfUtcMonth, startOfUtcMonth } from "@/lib/home/as-of";

export type AttentionKind = "task" | "lapse" | "bound_pending";
export type AttentionPriority = "Highest" | "High" | "Normal" | "Low";

export const ATTENTION_WINDOWS = ["overdue", "this_week", "this_month", "next_month"] as const;
export type AttentionWindow = (typeof ATTENTION_WINDOWS)[number];

export const ATTENTION_WINDOW_LABEL: Record<AttentionWindow, string> = {
  overdue: "Overdue",
  this_week: "This week",
  this_month: "This month",
  next_month: "Next month",
};

export function parseAttentionWindow(raw: string | null | undefined): AttentionWindow | null {
  if (!raw) return null;
  return (ATTENTION_WINDOWS as readonly string[]).includes(raw) ? (raw as AttentionWindow) : null;
}

export function startOfUtcWeek(date: Date): Date {
  const midnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return addUtcDays(midnight, -midnight.getUTCDay());
}

export function endOfUtcWeek(date: Date): Date {
  return new Date(startOfUtcWeek(date).getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function matchesAttentionWindow(dueAt: Date, asOf: Date, window: AttentionWindow): boolean {
  const due = dueAt.getTime();
  if (window === "overdue") return due < startOfUtcDay(asOf).getTime();
  if (window === "this_week") {
    return due >= startOfUtcWeek(asOf).getTime() && due <= endOfUtcWeek(asOf).getTime();
  }
  if (window === "this_month") {
    return due >= startOfUtcMonth(asOf).getTime() && due <= endOfUtcMonth(asOf).getTime();
  }
  const next = addUtcMonths(startOfUtcMonth(asOf), 1);
  return due >= startOfUtcMonth(next).getTime() && due <= endOfUtcMonth(next).getTime();
}

export function filterAttentionItems<T extends { dueAt: Date }>(
  items: T[],
  asOf: Date,
  window: AttentionWindow | null,
): T[] {
  if (!window) return items;
  return items.filter((item) => matchesAttentionWindow(item.dueAt, asOf, window));
}

export function attentionPriority(input: {
  kind: AttentionKind;
  dueAt: Date;
  asOf: Date;
}): AttentionPriority {
  if (input.kind === "lapse") return "High";
  if (input.dueAt.getTime() < startOfUtcDay(input.asOf).getTime()) return "Highest";
  if (input.kind === "bound_pending") return "Normal";
  const weekOut = addUtcDays(input.asOf, 7);
  if (input.dueAt.getTime() <= weekOut.getTime()) return "High";
  return "Normal";
}

export function attentionStatus(kind: AttentionKind): string {
  if (kind === "lapse") return "Lapse";
  if (kind === "bound_pending") return "Bound";
  return "Not Started";
}
