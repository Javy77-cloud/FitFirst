import {
  isCompactLayoutField,
  isTrueAddressFieldKey,
  type LayoutFieldHint,
} from "@/lib/custom-fields/section-density";
import { parseSectionDensity, SECTION_DENSITIES } from "@/lib/custom-fields/types";
import type { QuoteFieldDef } from "./applicant-core";

/** Same 1–5 scale as Deal Details (`SECTION_DENSITIES`). Long-text sections cap at 4. */
export const RISK_PROFILE_DENSITIES = SECTION_DENSITIES;
export type RiskProfileDensity = (typeof RISK_PROFILE_DENSITIES)[number];
export const RISK_PROFILE_LONG_TEXT_MAX: RiskProfileDensity = 4;
export const RISK_PROFILE_SHORT_FIELD_MAX: RiskProfileDensity = 5;

/** Fallback when a section has no short-field default. */
export const DEFAULT_RISK_PROFILE_DENSITY: RiskProfileDensity = 3;

/** localStorage prefix. Full key is `${RISK_PROFILE_DENSITY_STORAGE_KEY}:${userId}`. */
export const RISK_PROFILE_DENSITY_STORAGE_KEY = "ff-risk-profile-section-density";
export const RISK_PROFILE_DENSITY_ANON_USER = "anon";

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
  return parseSectionDensity(raw) ?? DEFAULT_RISK_PROFILE_DENSITY;
}

export function riskProfileSectionDensityId(title: string): string {
  return title.trim() || "section";
}

/** Signed-in user id from the root layout stamp, or an explicit override. */
export function riskProfileDensityUserKey(userId?: string | null): string {
  const explicit = typeof userId === "string" ? userId.trim() : "";
  if (explicit) return explicit;
  return readDomUserId() || RISK_PROFILE_DENSITY_ANON_USER;
}

export function riskProfileDensityStorageKey(userId?: string | null): string {
  return `${RISK_PROFILE_DENSITY_STORAGE_KEY}:${riskProfileDensityUserKey(userId)}`;
}

function readDomUserId(): string {
  if (typeof document === "undefined") return "";
  try {
    const fromHtml = document.documentElement?.dataset?.ffUserId?.trim();
    if (fromHtml) return fromHtml;
    const stamped = document.querySelector("[data-ff-user-id]")?.getAttribute("data-ff-user-id");
    return stamped?.trim() ?? "";
  } catch {
    return "";
  }
}

function parseDensityRecord(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readStorageItem(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** User-keyed localStorage, then unscoped local/session leftovers from earlier builds. */
function readDensityRecord(userId?: string | null): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const userKey = riskProfileDensityStorageKey(userId);
  const local = window.localStorage;
  const session = window.sessionStorage;
  return parseDensityRecord(
    readStorageItem(local, userKey) ??
      readStorageItem(local, RISK_PROFILE_DENSITY_STORAGE_KEY) ??
      readStorageItem(session, userKey) ??
      readStorageItem(session, RISK_PROFILE_DENSITY_STORAGE_KEY),
  );
}

export function readStoredRiskProfileDensity(
  sectionId: string,
  userId?: string | null,
): RiskProfileDensity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = readDensityRecord(userId);
    if (!(sectionId in parsed)) return undefined;
    return riskProfileDensityOf(parsed[sectionId]);
  } catch {
    return undefined;
  }
}

export function writeStoredRiskProfileDensity(
  sectionId: string,
  density: RiskProfileDensity,
  userId?: string | null,
) {
  if (typeof window === "undefined") return;
  try {
    const parsed = readDensityRecord(userId);
    parsed[sectionId] = density;
    window.localStorage.setItem(riskProfileDensityStorageKey(userId), JSON.stringify(parsed));
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

