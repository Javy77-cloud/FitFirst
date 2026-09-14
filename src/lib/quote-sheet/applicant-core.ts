import type { SheetProduct } from "./products";

export type QuoteFieldDef = {
  key: string;
  label: string;
  group: string;
  input?: "text" | "number" | "textarea" | "select";
  options?: string[];
  extractKey?: string;
  products?: SheetProduct[];
};

export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widow",
  "Divorced",
  "Separated",
] as const;

/** Named-insured / applicant entity — common P&C application set. */
export const ENTITY_TYPE_OPTIONS = [
  "Individual",
  "Joint",
  "LLC",
  "Corporation",
  "Partnership",
  "Trust",
  "Estate",
  "Association",
  "Other",
] as const;

/** Co-applicant relationship to the named insured / applicant. */
export const RELATIONSHIP_TO_INSURED_OPTIONS = [
  "Spouse",
  "Child",
  "Domestic partner",
  "Parent",
  "Grandchild",
  "Grandparent",
  "Other relative",
  "Roommate",
] as const;

/** Allstate FL Auto accepts Male/Female only (M/F) — Javy 2026-09-10. */
export const GENDER_OPTIONS = ["Male", "Female"] as const;

/**
 * FL Auto / Allstate-style occupation / job categories (portal-mapped).
 * Mixes employment statuses + common job categories portals accept — not a lone Other.
 * Progressive portal "Employment" uses applicant_employment (EMPLOYMENT_STATUS_OPTIONS) instead.
 */

/**
 * FL Auto / Geico-style highest education level (rated driver / applicant).
 * Portal-mapped common set — blank/None OK (no forced default).
 */
export const EDUCATION_LEVEL_OPTIONS = [
  "Less than high school",
  "High school",
  "Some college",
  "Associate",
  "Bachelor",
  "Master",
  "Doctorate",
  "Trade/vocational",
] as const;

export const OCCUPATION_OPTIONS = [
  "Employed",
  "Self-employed",
  "Homemaker",
  "Retired",
  "Student",
  "Unemployed",
  "Administrative",
  "Clerical",
  "Professional",
  "Management",
  "Executive",
  "Sales",
  "Trades",
  "Skilled labor",
  "Technical",
  "Military",
  "Medical / Healthcare",
  "Education",
  "Government / Civil service",
  "Agriculture / Farming",
  "Transportation / Driver",
  "Hospitality / Food service",
  "Retail",
  "Construction",
  "Information Technology",
  "Legal",
  "Finance / Banking",
  "Real estate",
  "Law enforcement / Public safety",
  "Business owner",
  "Disabled",
  "Other",
] as const;

/**
 * Progressive-style Employment status (portal "Employment" / employment category).
 * Separate from applicant_occupation (which mixes status + job categories for Allstate-style).
 * No default — wait for Javy / Heather.
 */
export const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Self-employed",
  "Retired",
  "Homemaker",
  "Student",
  "Unemployed",
  "Disabled",
  "Military",
  "Other",
] as const;

/** @deprecated use RELATIONSHIP_TO_INSURED_OPTIONS */
export const CO_APPLICANT_RELATIONSHIP_OPTIONS = RELATIONSHIP_TO_INSURED_OPTIONS;

/** Shared applicant block on every master sheet. */
export const APPLICANT_CORE_FIELDS: QuoteFieldDef[] = [
  { key: "applicant_name", label: "Applicant name", group: "Applicant", extractKey: "applicant_name" },
  { key: "applicant_address", label: "Applicant address", group: "Applicant", extractKey: "applicant_address" },
  { key: "applicant_phone", label: "Phone", group: "Applicant", extractKey: "phone" },
  { key: "applicant_email", label: "Email", group: "Applicant", extractKey: "email" },
  { key: "applicant_dob", label: "Date of birth", group: "Applicant", extractKey: "dob" },
  {
    key: "applicant_gender",
    label: "Gender",
    group: "Applicant",
    input: "select",
    options: [...GENDER_OPTIONS],
    extractKey: "applicant_gender",
  },
  {
    key: "applicant_marital_status",
    label: "Marital status",
    group: "Applicant",
    input: "select",
    options: [...MARITAL_STATUS_OPTIONS],
    extractKey: "applicant_marital_status",
  },
  {
    key: "applicant_occupation",
    label: "Occupation / job category",
    group: "Applicant",
    input: "select",
    options: [...OCCUPATION_OPTIONS],
    extractKey: "applicant_occupation",
  },
  {
    key: "applicant_employment",
    label: "Employment",
    group: "Applicant",
    input: "select",
    options: [...EMPLOYMENT_STATUS_OPTIONS],
    extractKey: "applicant_employment",
  },
  {
    key: "applicant_education_level",
    label: "Education level",
    group: "Applicant",
    input: "select",
    options: [...EDUCATION_LEVEL_OPTIONS],
    extractKey: "applicant_education_level",
  },
  {
    key: "entity_type",
    label: "Entity type",
    group: "Applicant",
    input: "select",
    options: [...ENTITY_TYPE_OPTIONS],
    extractKey: "entity_type",
  },
];

/**
 * Co-applicant — additive, but required when applicant marital status is Married (spouse).
 * No address / share-address; no applicant↔co-applicant dual relationship fields.
 */
export const CO_APPLICANT_FIELDS: QuoteFieldDef[] = [
  { key: "co_applicant_name", label: "Co-applicant name", group: "Co-applicant", extractKey: "co_applicant_name" },
  {
    key: "co_applicant_relationship_to_insured",
    label: "Relationship to insured",
    group: "Co-applicant",
    input: "select",
    options: [...RELATIONSHIP_TO_INSURED_OPTIONS],
    extractKey: "co_applicant_relationship_to_insured",
  },
  {
    key: "co_applicant_gender",
    label: "Gender",
    group: "Co-applicant",
    input: "select",
    options: [...GENDER_OPTIONS],
    extractKey: "co_applicant_gender",
  },
  {
    key: "co_applicant_marital_status",
    label: "Marital status",
    group: "Co-applicant",
    input: "select",
    options: [...MARITAL_STATUS_OPTIONS],
    extractKey: "co_applicant_marital_status",
  },
  {
    key: "co_applicant_occupation",
    label: "Occupation / job category",
    group: "Co-applicant",
    input: "select",
    options: [...OCCUPATION_OPTIONS],
    extractKey: "co_applicant_occupation",
  },
  {
    key: "co_applicant_employment",
    label: "Employment",
    group: "Co-applicant",
    input: "select",
    options: [...EMPLOYMENT_STATUS_OPTIONS],
    extractKey: "co_applicant_employment",
  },
  {
    key: "co_applicant_education_level",
    label: "Education level",
    group: "Co-applicant",
    input: "select",
    options: [...EDUCATION_LEVEL_OPTIONS],
    extractKey: "co_applicant_education_level",
  },
  { key: "co_applicant_dob", label: "Date of birth", group: "Co-applicant", extractKey: "co_applicant_dob" },
  { key: "co_applicant_email", label: "Email", group: "Co-applicant", extractKey: "co_applicant_email" },
  { key: "co_applicant_phone", label: "Phone", group: "Co-applicant", extractKey: "co_applicant_phone" },
];

export function isMarriedStatus(value?: string | null): boolean {
  return String(value ?? "").trim().toLowerCase() === "married";
}

export function coApplicantHasValue(
  values: Record<string, { value?: string; status?: string } | undefined>,
): boolean {
  return CO_APPLICANT_FIELDS.some((field) => {
    const cell = values[field.key];
    const raw = cell?.value?.trim() ?? "";
    return Boolean(raw) && cell?.status !== "missing";
  });
}

export function coApplicantRequired(
  values: Record<string, { value?: string; status?: string } | undefined>,
  opts?: { hasCoApplicantFlag?: string | null },
): boolean {
  const flag = String(opts?.hasCoApplicantFlag ?? "").trim().toLowerCase();
  // Deal Details "No co-applicant" wins — do not require co-app name/fields on sheet save.
  if (["false", "0", "no", "off"].includes(flag)) return false;
  return isMarriedStatus(values.applicant_marital_status?.value);
}
