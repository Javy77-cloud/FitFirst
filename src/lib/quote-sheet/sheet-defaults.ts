import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";

function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export const SHEET_DEFAULT_SOURCE_LABEL = "default";

/** Yes/no picklist options shared by protection / hazard / dwelling flags. */
export const YES_NO_OPTIONS = ["yes", "no"] as const;

/** Months occupied — only two desk buckets (not free 12). */
export const MONTHS_OCCUPIED_OPTIONS = ["0-9", "9-12"] as const;

export const EXTERIOR_OPTIONS = [
  "stucco",
  "vinyl",
  "brick",
  "concrete block",
  "wood",
  "aluminum",
  "other",
] as const;

export const FOUNDATION_OPTIONS = [
  "slab",
  "crawl space",
  "basement",
  "pier",
  "other",
] as const;

export const CONSTRUCTION_OPTIONS = [
  "frame",
  "masonry",
  "masonry veneer",
  "concrete block",
  "superior",
  "other",
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

/** Normalize free months (e.g. 12) into the two picklist buckets. */
export function normalizeMonthsOccupied(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/\s+/g, "");
  if (lower === "0-9" || lower === "0–9" || lower === "0to9") return "0-9";
  if (lower === "9-12" || lower === "9–12" || lower === "9to12" || lower === "9+") return "9-12";
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return text;
  if (n >= 9) return "9-12";
  if (n >= 0) return "0-9";
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
