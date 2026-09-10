import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";

function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export const SHEET_DEFAULT_SOURCE_LABEL = "default";

/** Yes/no picklist options shared by protection / hazard / dwelling flags. */
export const YES_NO_OPTIONS = ["yes", "no"] as const;

/** Months occupied — three desk buckets (Javy 2026-09-09). */
export const MONTHS_OCCUPIED_OPTIONS = [
  "0 to 3 months",
  "4 to 8 months",
  "9 months or more",
] as const;

/** Usage / how the dwelling is used (Javy 2026-09-09). */
export const USAGE_OPTIONS = [
  "Primary",
  "Secondary",
  "Seasonal",
  "Rental",
  "Vacant",
] as const;

/** Distance to hydrant (Javy 2026-09-09). */
export const DISTANCE_TO_HYDRANT_OPTIONS = [
  "Within 1,000 feet",
  "More than 1,000 feet",
] as const;

/** Distance to fire station (Javy 2026-09-09). */
export const DISTANCE_TO_STATION_OPTIONS = [
  "Within 5 miles",
  "More than 5 miles",
] as const;

/** Exterior = wall type (Javy 2026-09-09 night lock). */
export const EXTERIOR_OPTIONS = [
  "Masonry",
  "Frame",
  "Mixed Masonry-Frame",
] as const;

/** Foundation (7) — Javy 2026-09-09 night lock. */
export const FOUNDATION_OPTIONS = [
  "Slab",
  "Open foundation",
  "Crawl space 25%",
  "Crawl space 50%",
  "Crawl space 100%",
  "Piers (elevated)",
  "Basement",
] as const;

/** Construction = wall construction (11) — Javy 2026-09-09 night lock. */
export const CONSTRUCTION_OPTIONS = [
  "Frame",
  "Frame-Stucco",
  "Aluminum siding",
  "Vinyl siding",
  "Wood siding",
  "Hardy plank siding",
  "Masonry veneer",
  "Brick veneer",
  "Stone veneer",
  "Logs",
  "Asbestos",
] as const;

export const WIND_HAIL_DEDUCTIBLE_OPTIONS = ["1000", "2000", "2500"] as const;
export const HURRICANE_DEDUCTIBLE_OPTIONS = ["1%", "2%", "3%", "4%", "5%"] as const;
export const AOP_DEDUCTIBLE_OPTIONS = ["1000", "2000", "2500"] as const;

/**
 * Empty-cell defaults for new blank sheets / Fill.
 * Protection + hazard starters only — never overwrite agent/confirmed/javy.
 */
export const MASTER_SHEET_EMPTY_DEFAULTS: Record<string, string> = {
  central_alarm: "no",
  smoke_detectors: "no",
  sprinkler: "no",
  deadbolts: "yes",
  pool: "no",
  trampoline: "no",
  dog_breed: "no",
  mobile_home: "no",
  pool_fence: "no",
  animals: "no",
  business_on_premises: "no",
};

const MONTHS_0_3 = "0 to 3 months";
const MONTHS_4_8 = "4 to 8 months";
const MONTHS_9_PLUS = "9 months or more";

/** Normalize free months / legacy buckets into the three picklist options. */
export function normalizeMonthsOccupied(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/\s+/g, "");
  if (
    compact === "0to3" ||
    compact === "0-3" ||
    compact === "0–3" ||
    lower === "0 to 3 months" ||
    lower === "0-3 months"
  ) {
    return MONTHS_0_3;
  }
  if (
    compact === "4to8" ||
    compact === "4-8" ||
    compact === "4–8" ||
    lower === "4 to 8 months" ||
    lower === "4-8 months"
  ) {
    return MONTHS_4_8;
  }
  if (
    compact === "9+" ||
    compact === "9or more" ||
    compact === "9monthsormore" ||
    compact === "9-12" ||
    compact === "9–12" ||
    compact === "9to12" ||
    lower === "9 months or more" ||
    lower.includes("9 months or more")
  ) {
    return MONTHS_9_PLUS;
  }
  // Legacy two-bucket desk values
  if (compact === "0-9" || compact === "0–9" || compact === "0to9") return MONTHS_4_8;
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return text;
  if (n >= 9) return MONTHS_9_PLUS;
  if (n >= 4) return MONTHS_4_8;
  if (n >= 0) return MONTHS_0_3;
  return text;
}

/** Normalize usage into the five desk picklist values. */
export function normalizeUsage(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const map: Record<string, (typeof USAGE_OPTIONS)[number]> = {
    primary: "Primary",
    "owner occupied": "Primary",
    owner: "Primary",
    secondary: "Secondary",
    "second home": "Secondary",
    seasonal: "Seasonal",
    rental: "Rental",
    tenant: "Rental",
    "tenant occupied": "Rental",
    vacant: "Vacant",
  };
  return map[lower] ?? text;
}

export function normalizeDistanceToHydrant(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/[,\s]/g, "");
  if (
    lower === "yes" ||
    lower === "within 1,000 feet" ||
    lower === "within 1000 feet" ||
    compact === "within1000feet" ||
    compact === "within1000ft" ||
    compact.includes("within1000")
  ) {
    return "Within 1,000 feet";
  }
  if (
    lower === "no" ||
    lower === "more than 1,000 feet" ||
    lower === "more than 1000 feet" ||
    compact.includes("morethan1000") ||
    compact.includes(">1000")
  ) {
    return "More than 1,000 feet";
  }
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(n)) {
    return n <= 1000 ? "Within 1,000 feet" : "More than 1,000 feet";
  }
  return text;
}

export function normalizeDistanceToStation(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/[,\s]/g, "");
  if (
    lower === "within 5 miles" ||
    compact === "within5miles" ||
    compact.includes("within5")
  ) {
    return "Within 5 miles";
  }
  if (
    lower === "more than 5 miles" ||
    compact.includes("morethan5") ||
    compact.includes(">5")
  ) {
    return "More than 5 miles";
  }
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(n)) {
    return n <= 5 ? "Within 5 miles" : "More than 5 miles";
  }
  return text;
}

export type ApplyDefaultsResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
};

/** Fill blank cells with master-sheet defaults (empty-only). */
export function applyMasterSheetDefaults(
  existing: Record<string, QuoteSheetFieldValue>,
): ApplyDefaultsResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  for (const [key, raw] of Object.entries(MASTER_SHEET_EMPTY_DEFAULTS)) {
    const current = values[key];
    if (isLockedSheetField(current) || !fieldIsBlank(current)) continue;
    values[key] = {
      value: raw,
      status: "check",
      source: "agent",
      sourceLabel: SHEET_DEFAULT_SOURCE_LABEL,
    };
    filledKeys.push(key);
  }
  // Normalize months_occupied display when present / blank leave alone.
  const months = values.months_occupied;
  if (months?.value?.trim()) {
    const next = normalizeMonthsOccupied(months.value);
    if (next && next !== months.value) {
      values.months_occupied = { ...months, value: next };
    }
  }
  return { values, filledKeys };
}
