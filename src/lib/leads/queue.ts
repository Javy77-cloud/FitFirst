/** Work-queue rules for the Leads page. Converted leads are Deals-only. */

export const LEAD_QUEUE_STATUSES = ["new", "contacted", "qualified", "warm", "cold", "nurture", "lost"] as const;
export type LeadQueueStatus = (typeof LEAD_QUEUE_STATUSES)[number];

export const LEAD_QUEUE_STATUS_FILTERS = [
  { value: "new", label: "new" },
  { value: "contacted", label: "contacted" },
  { value: "qualified", label: "in-progress" },
  { value: "warm", label: "warm" },
  { value: "cold", label: "cold" },
  { value: "nurture", label: "Nurture" },
  { value: "lost", label: "Lost" },
] as const;

export const NURTURE_DELAY_UNITS = ["days", "months"] as const;
export type NurtureDelayUnit = (typeof NURTURE_DELAY_UNITS)[number];

export const MAX_NURTURE_DAYS = 365;
export const MAX_NURTURE_MONTHS = 12;

export const LEAD_TEMPERATURES = ["hot", "warm", "cold"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const FIRST_CONTACT_SLA_MS = 5 * 60 * 1000;

const CONVERTED = new Set(["converted"]);

export function normalizeLeadStatus(status: string | null | undefined): string {
  const raw = (status ?? "new").trim().toLowerCase();
  if (raw === "in_progress" || raw === "in-progress" || raw === "in progress") return "qualified";
  if (raw === "recycled" || raw === "junk" || raw === "unqualified") return "lost";
  if (raw === "nurture" || raw === "nurturing") return "nurture";
  if (raw === "qualif" || raw.includes("qualif")) return raw.includes("unqual") ? "lost" : "qualified";
  return raw || "new";
}

export function leadStatusLabel(status: string | null | undefined): string {
  const value = normalizeLeadStatus(status);
  if (value === "qualified") return "in-progress";
  if (value === "lost") return "Lost";
  if (value === "nurture") return "Nurture";
  if (value === "cold") return "Cold (not interested)";
  return value || "new";
}

export function isNurtureDelayUnit(value: string | null | undefined): value is NurtureDelayUnit {
  return Boolean(value && (NURTURE_DELAY_UNITS as readonly string[]).includes(value));
}

export function clampNurtureDelay(
  amount: number,
  unit: NurtureDelayUnit,
): { amount: number; unit: NurtureDelayUnit } {
  if (unit === "months") {
    return { amount: Math.min(MAX_NURTURE_MONTHS, Math.max(1, Math.round(amount))), unit: "months" };
  }
  return { amount: Math.min(MAX_NURTURE_DAYS, Math.max(1, Math.round(amount))), unit: "days" };
}

export function nurtureDueAt(now: Date, amount: number, unit: NurtureDelayUnit): Date {
  const clamped = clampNurtureDelay(amount, unit);
  const next = new Date(now);
  if (clamped.unit === "months") {
    next.setMonth(next.getMonth() + clamped.amount);
  } else {
    next.setDate(next.getDate() + clamped.amount);
  }
  const cap = new Date(now);
  cap.setFullYear(cap.getFullYear() + 1);
  return next.getTime() > cap.getTime() ? cap : next;
}

/** Lost stays off the default queue. Nurture parks until the contact-again date. */
export function isParkedFromDefaultLeadsView(
  lead: { status?: string | null; nurtureUntil?: Date | string | null },
  now: Date | string = new Date(),
): boolean {
  const status = normalizeLeadStatus(lead.status);
  if (status === "lost") return true;
  if (status !== "nurture") return false;
  if (!lead.nurtureUntil) return true;
  return new Date(lead.nurtureUntil).getTime() > new Date(now).getTime();
}

export function normalizeLeadTemperature(value: string | null | undefined): LeadTemperature {
  const raw = (value ?? "hot").trim().toLowerCase();
  if (raw === "warm") return "warm";
  if (raw === "cold") return "cold";
  return "hot";
}

export function temperatureForStatus(
  status: string | null | undefined,
  current: string | null | undefined,
): LeadTemperature {
  const value = normalizeLeadStatus(status);
  if (value === "cold" || value === "lost") return "cold";
  if (value === "warm") return "warm";
  if (value === "new") return current ? normalizeLeadTemperature(current) : "hot";
  return current ? normalizeLeadTemperature(current) : "hot";
}

export function isConvertedLead(lead: { status?: string | null; convertedDealId?: string | null }): boolean {
  if (lead.convertedDealId) return true;
  return CONVERTED.has(normalizeLeadStatus(lead.status));
}

export function isLeadOnQueue(lead: { status?: string | null; convertedDealId?: string | null }): boolean {
  return !isConvertedLead(lead);
}

export function isUntouchedLead(lead: { status?: string | null; firstContactAt?: Date | string | null }): boolean {
  return !lead.firstContactAt && normalizeLeadStatus(lead.status) === "new";
}

export function sortLeadQueue<T extends { status?: string | null; firstContactAt?: Date | string | null; createdAt: Date | string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const aUntouched = isUntouchedLead(a);
    const bUntouched = isUntouchedLead(b);
    if (aUntouched !== bUntouched) return aUntouched ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function matchesLeadQueueFilters<
  T extends { status?: string | null; source?: string | null; temperature?: string | null },
>(
  lead: T,
  filter: { status?: string; source?: string; temperature?: string },
): boolean {
  if (filter.status && normalizeLeadStatus(lead.status) !== normalizeLeadStatus(filter.status)) return false;
  if (filter.source && (lead.source ?? "") !== filter.source) return false;
  if (filter.temperature) {
    const heat = (lead.temperature ?? "").toLowerCase();
    if (heat !== filter.temperature) return false;
  }
  return true;
}

export type ResponseTimerState = {
  phase: "idle" | "counting" | "overdue";
  remainingMs: number;
  elapsedMs: number;
  overdue: boolean;
};

/** Countdown to the live pending step. Red only after the deadline with no agent action. */
export function responseTimerState(
  dueAt: Date | string | null | undefined,
  now: Date | string = new Date(),
): ResponseTimerState {
  const due = dueAt ? new Date(dueAt).getTime() : Number.NaN;
  if (!dueAt || Number.isNaN(due)) {
    return { phase: "idle", remainingMs: 0, elapsedMs: 0, overdue: false };
  }
  const current = new Date(now).getTime();
  const remainingMs = due - current;
  if (remainingMs <= 0) {
    return { phase: "overdue", remainingMs: 0, elapsedMs: Math.max(0, current - due), overdue: true };
  }
  return { phase: "counting", remainingMs, elapsedMs: 0, overdue: false };
}

export function formatCountdownClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatElapsedClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function searchMatchLabel(count: number): string {
  return count === 1 ? "1 match" : `${count} matches`;
}
