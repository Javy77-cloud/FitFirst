import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";

/** Sheet key for mismatch / raw property-API notes. Training data, not an agent field. */
export const RECORDS_CHECK_KEY = "records_check";

/**
 * Auto and Home risk profiles (HO3, HO5, DP, MHO, and the rest of the home line)
 * do not show this textarea. The value stays on the sheet for the fill pipeline.
 */
export function recordsCheckHiddenOnRiskProfile(line: ShopLine | string | null | undefined): boolean {
  return line === "home" || line === "auto";
}

/** Normalize for mismatch compare — strip money commas/spaces, case-insensitive. */
export function valuesDiffer(left: string, right: string): boolean {
  const a = left.trim().replace(/[, $]/g, "").toLowerCase();
  const b = right.trim().replace(/[, $]/g, "").toLowerCase();
  return Boolean(a) && Boolean(b) && a !== b;
}

/**
 * One Records check line. Default incomingLabel is "API" (property records);
 * Gemini / 4pt pass "Gemini" or "4pt".
 */
export function mismatchLine(
  fieldLabel: string,
  incomingValue: string,
  sheetValue: string,
  from: string,
  incomingLabel = "API",
): string {
  const prefix = fieldLabel ? `${fieldLabel}: ` : "";
  return `${prefix}${incomingLabel} says ${incomingValue}, sheet says ${sheetValue} (from ${from}).`;
}

export function appendRecordsCheck(
  values: Record<string, QuoteSheetFieldValue>,
  line: string,
  meta?: { source?: QuoteSheetFieldValue["source"]; sourceLabel?: string },
): void {
  const prev = values[RECORDS_CHECK_KEY]?.value?.trim() ?? "";
  const next = prev ? `${prev} ${line}` : line;
  values[RECORDS_CHECK_KEY] = {
    value: next,
    status: "confirmed",
    source: meta?.source ?? values[RECORDS_CHECK_KEY]?.source ?? "extracted",
    sourceLabel: meta?.sourceLabel ?? values[RECORDS_CHECK_KEY]?.sourceLabel ?? "Records check",
  };
}

const FIELD_LABELS: Record<string, string> = {
  year_built: "Year built",
  construction: "Construction",
  square_feet: "Square footage",
  roof_covering: "Roof covering",
  roof_year: "Roof year",
  stories: "Stories",
  county: "County",
  parcel_id: "Parcel ID",
  assessed_value: "Assessed value",
  applicant_name: "Applicant name",
  named_insured: "Named insured",
  electrical_year: "Electrical year",
  plumbing_year: "Plumbing year",
  hvac_year: "HVAC year",
  water_heater_year: "Water heater year",
  electrical_updated: "Electrical last updated",
  electrical_circuit_amps: "Electrical Circuit Amps",
  occupancy: "Occupancy",
  months_occupied: "Months occupied",
};

export function fieldLabelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Desk phrase for who currently owns the cell value. */
export function sheetSourcePhrase(field?: QuoteSheetFieldValue | null): string {
  const label = (field?.sourceLabel ?? "").toLowerCase();
  if (/\b(four[-\s]?point|4[-\s]?point|4pt)\b/.test(label)) return "4pt";
  if (/wind\s*mit/.test(label)) return "wind mit";
  if (/\bdec\b/.test(label) || field?.source === "extracted") return "dec";
  if (field?.source === "photo-ocr") return "photo";
  if (field?.source === "javy") return "Javy-tested";
  if (field?.source === "agent") return "agent";
  if (field?.source === "public" || field?.source === "public-records") return "public";
  if (field?.source === "property-records") return field.sourceLabel?.trim() || "property records";
  return field?.sourceLabel?.trim() || field?.source || "sheet";
}
