import {
  isCompactLayoutField,
  type LayoutFieldHint,
} from "@/lib/custom-fields/section-density";
import type { SectionDensity } from "@/lib/custom-fields/types";
import type { QuoteFieldDef } from "./applicant-core";

/** Risk Profile (Documents / former master sheet) defaults to Deal Details 3-col density. */
export const DEFAULT_RISK_PROFILE_DENSITY: SectionDensity = 3;

export const RISK_PROFILE_DENSITY_CONTROL_ID = "risk-profile";

export function riskProfileDensityOf(raw: unknown): SectionDensity {
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  return DEFAULT_RISK_PROFILE_DENSITY;
}

export function sheetFieldLayoutHint(field: QuoteFieldDef | undefined): LayoutFieldHint {
  if (!field) return { type: "single_line" };
  if (field.input === "textarea" || field.input === "multiselect" || field.input === "chips") {
    return { type: "multi_line" };
  }
  if (/(^|_)address$/.test(field.key) || field.key.includes("address")) {
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

export function shortSheetControlClass(field: QuoteFieldDef | undefined): string {
  if (!isShortSheetValue(field)) return "";
  const key = field?.key.toLowerCase() ?? "";
  if (/(^|_)(state|zip|year|stories|beds|baths|acres)$/.test(key) || SHORT_YEAR.test(key)) {
    return "max-w-[6.5rem]";
  }
  return "max-w-[8rem]";
}

