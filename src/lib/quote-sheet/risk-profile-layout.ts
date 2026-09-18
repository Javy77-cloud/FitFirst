import {
  isCompactLayoutField,
  isTrueAddressFieldKey,
  type LayoutFieldHint,
} from "@/lib/custom-fields/section-density";
import type { QuoteFieldDef } from "./applicant-core";

/** Per-section columns on Risk Profile. Long-text sections cap at 4; short-field sections may use 5. */
export const RISK_PROFILE_DENSITIES = [1, 2, 3, 4, 5] as const;
export type RiskProfileDensity = (typeof RISK_PROFILE_DENSITIES)[number];
export const RISK_PROFILE_LONG_TEXT_MAX: RiskProfileDensity = 4;
export const RISK_PROFILE_SHORT_FIELD_MAX: RiskProfileDensity = 5;

/** Fallback when a section has no short-field default. */
export const DEFAULT_RISK_PROFILE_DENSITY: RiskProfileDensity = 3;

export const RISK_PROFILE_DENSITY_STORAGE_KEY = "ff-risk-profile-section-density";

const FIVE_COL_SECTIONS =
  /^(property|dwelling|location|premises|building|structure|vehicles?|drivers?|commercial property|commercial auto)$/i;
const FOUR_COL_SECTIONS =
  /^(applicant|co-applicant|protection|hazards|coverages?|coverage|coastal|flood|household|business|location \/ premises)/i;

export function defaultRiskProfileSectionDensity(title: string): RiskProfileDensity {
  const key = title.trim();
  if (FIVE_COL_SECTIONS.test(key) || /^location/i.test(key)) return 5;
  if (FOUR_COL_SECTIONS.test(key)) return 4;
  return DEFAULT_RISK_PROFILE_DENSITY;
}

function isLongTextSheetField(field: QuoteFieldDef | undefined): boolean {
  if (!field) return false;
  if (field.input === "textarea" || field.input === "multiselect" || field.input === "chips") {
    return true;
  }
  return /(notes|description|records_check|operations|narrative|legal)/i.test(field.key);
}

/** Short-field sections may use 5 columns; longer text is capped at 4. */
export function riskProfileSectionMaxColumns(
  title: string,
  fields: readonly QuoteFieldDef[] = [],
): RiskProfileDensity {
  const key = title.trim();
  if (FIVE_COL_SECTIONS.test(key) || /^location/i.test(key)) return RISK_PROFILE_SHORT_FIELD_MAX;
  if (FOUR_COL_SECTIONS.test(key)) return RISK_PROFILE_LONG_TEXT_MAX;
  const longFields = fields.filter((field) => isLongTextSheetField(field));
  if (longFields.length > 0) return RISK_PROFILE_LONG_TEXT_MAX;
  const shortCount = fields.filter((field) => isShortSheetValue(field)).length;
  if (fields.length > 0 && shortCount >= 3) return RISK_PROFILE_SHORT_FIELD_MAX;
  return RISK_PROFILE_LONG_TEXT_MAX;
}

export function riskProfileSectionChoices(maxColumns: RiskProfileDensity): readonly RiskProfileDensity[] {
  return RISK_PROFILE_DENSITIES.filter((choice) => choice <= maxColumns);
}

export function clampRiskProfileDensity(
  density: RiskProfileDensity,
  maxColumns: RiskProfileDensity,
): RiskProfileDensity {
  return density > maxColumns ? maxColumns : density;
}

export function riskProfileDensityOf(raw: unknown): RiskProfileDensity {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  if (raw === "4") return 4;
  if (raw === "5") return 5;
  return DEFAULT_RISK_PROFILE_DENSITY;
}

export function riskProfileSectionDensityId(title: string): string {
  return title.trim() || "section";
}

export function readStoredRiskProfileDensity(sectionId: string): RiskProfileDensity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(RISK_PROFILE_DENSITY_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!(sectionId in parsed)) return undefined;
    return riskProfileDensityOf(parsed[sectionId]);
  } catch {
    return undefined;
  }
}

export function writeStoredRiskProfileDensity(sectionId: string, density: RiskProfileDensity) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(RISK_PROFILE_DENSITY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[sectionId] = density;
    window.sessionStorage.setItem(RISK_PROFILE_DENSITY_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore quota / private mode */
  }
}

export function sheetFieldLayoutHint(field: QuoteFieldDef | undefined): LayoutFieldHint {
  if (!field) return { type: "single_line" };
  if (field.input === "textarea" || field.input === "multiselect" || field.input === "chips") {
    return { type: "multi_line" };
  }
  if (isTrueAddressFieldKey(field.key)) {
    return { type: "address" };
  }
  if (field.options && field.options.length > 0) {
    return { type: "picklist", options: field.options };
  }
  if (field.input === "number") return { type: "single_line" };
  return { type: "single_line" };
}

const SHORT_KEY =
  /(^|_)(city|state|zip|county|year|stories|beds|baths|acres|gender|marital|dob|phone)$/;
const SHORT_YEAR = /_year$|^year_/;

/** Yes/No, year, ZIP, and other short values stay narrow inside the density cell. */
export function isShortSheetValue(field: QuoteFieldDef | undefined): boolean {
  if (!field) return false;
  const hint = sheetFieldLayoutHint(field);
  if (isCompactLayoutField(field.key, hint)) return true;
  const key = field.key.toLowerCase();
  if (SHORT_KEY.test(key) || SHORT_YEAR.test(key)) return true;
  const opts = (field.options ?? []).map((option) => option.trim().toLowerCase()).filter(Boolean);
  if (opts.length > 0 && opts.every((option) => option === "yes" || option === "no")) return true;
  return false;
}

/** Short values fill the density cell so 4 columns is visibly wider than 5. */
export function shortSheetControlClass(field: QuoteFieldDef | undefined): string {
  if (!field) return "min-w-0 w-full";
  return "min-w-0 w-full";
}

