import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { RiskSnapshot } from "@/lib/domain";
import { storiesAsNumber } from "./sheet-defaults";

function sheetValue(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): string | null {
  const raw = values?.[key]?.value?.trim() ?? "";
  return raw ? raw : null;
}

function sheetNumber(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): number | null {
  const raw = sheetValue(values, key)?.replace(/[, $]/g, "") ?? "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function sheetBool(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): boolean | null {
  const raw = sheetValue(values, key)?.toLowerCase();
  if (!raw) return null;
  if (["true", "yes", "y", "1"].includes(raw)) return true;
  if (["false", "no", "n", "0"].includes(raw)) return false;
  return null;
}

/**
 * Overlay filled Quote Sheet fields onto the deal risk.
 * Super-Copy / Chrome Fill / Forms keep reading the same `quote_sheets` row.
 */
export function riskFromQuoteSheet(
  risk: RiskSnapshot,
  values?: Record<string, QuoteSheetFieldValue> | null,
): RiskSnapshot {
  if (!values) return { ...risk };

  const yearBuilt = sheetNumber(values, "year_built");
  const roofYear = sheetNumber(values, "roof_year");
  const stories = storiesAsNumber(sheetValue(values, "stories"));
  const milesToCoast = sheetNumber(values, "miles_to_coast");
  const coverageA = sheetNumber(values, "coverage_a");
  const replacementCostEstimate = sheetNumber(values, "replacement_cost_estimate");
  const mobileHome = sheetBool(values, "mobile_home");
  const pool = sheetBool(values, "pool");

  return {
    yearBuilt: yearBuilt ?? risk.yearBuilt,
    roofYear: roofYear ?? risk.roofYear,
    roofCovering: sheetValue(values, "roof_covering") ?? risk.roofCovering,
    construction: sheetValue(values, "construction") ?? risk.construction,
    openingProtection: sheetValue(values, "opening_protection") ?? risk.openingProtection,
    occupancy: sheetValue(values, "occupancy") ?? risk.occupancy,
    stories: stories ?? risk.stories,
    pool: pool ?? risk.pool,
    protectionClass: sheetValue(values, "protection_class") ?? risk.protectionClass,
    milesToCoast: milesToCoast ?? risk.milesToCoast,
    city: sheetValue(values, "city") ?? risk.city,
    county: sheetValue(values, "county") ?? risk.county,
    coverageA: coverageA ?? risk.coverageA,
    mobileHome: mobileHome ?? risk.mobileHome,
    replacementCostEstimate: replacementCostEstimate ?? risk.replacementCostEstimate,
    state: sheetValue(values, "state") ?? risk.state,
  };
}
