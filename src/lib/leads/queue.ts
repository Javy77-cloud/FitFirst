/** Work-queue rules for the Leads page. Converted leads are Deals-only. */

export const LEAD_QUEUE_STATUSES = ["new", "contacted", "qualified", "lost"] as const;
export type LeadQueueStatus = (typeof LEAD_QUEUE_STATUSES)[number];

export const LEAD_QUEUE_STATUS_FILTERS = [
  { value: "new", label: "new" },
  { value: "contacted", label: "contacted" },
  { value: "qualified", label: "in-progress" },
  { value: "lost", label: "recycled" },
] as const;

export const LEAD_TEMPERATURES = ["hot", "cold"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const FIRST_CONTACT_SLA_MS = 5 * 60 * 1000;

const CONVERTED = new Set(["converted"]);

export function normalizeLeadStatus(status: string | null | undefined): string {
  const raw = (status ?? "new").trim().toLowerCase();
  if (raw === "in_progress" || raw === "in-progress" || raw === "in progress") return "qualified";
  if (raw === "recycled" || raw === "junk" || raw === "unqualified") return "lost";
  if (raw === "qualif" || raw.includes("qualif")) return raw.includes("unqual") ? "lost" : "qualified";
  return raw || "new";
}

export function leadStatusLabel(status: string | null | undefined): string {
  const value = normalizeLeadStatus(status);
  if (value === "qualified") return "in-progress";
  if (value === "lost") return "recycled";
  return value || "new";
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
  phase: "counting" | "cleared";
  elapsedMs: number;
  overdue: boolean;
};

export function responseTimerState(
  createdAt: Date | string,
  firstContactAt: Date | string | null | undefined,
  now: Date | string = new Date(),
): ResponseTimerState {
  const start = new Date(createdAt).getTime();
  const current = new Date(now).getTime();
  if (firstContactAt) {
    const contact = new Date(firstContactAt).getTime();
    return { phase: "cleared", elapsedMs: Math.max(0, contact - start), overdue: false };
  }
  const elapsedMs = Math.max(0, current - start);
  return { phase: "counting", elapsedMs, overdue: elapsedMs >= FIRST_CONTACT_SLA_MS };
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
