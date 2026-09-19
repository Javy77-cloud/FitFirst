import type { CustomFieldDef, LayoutSection } from "./types";
import {
  EDUCATION_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
  RELATIONSHIP_TO_INSURED_OPTIONS,
} from "@/lib/quote-sheet/applicant-core";
import { INDUSTRY_OPTIONS } from "./industry-occupation";

/**
 * Deal/Lead CRM co-applicant fields — separate keys from primary Contact.
 * Same field key cannot appear twice with different values; co-applicant needs its own store.
 */
export const CO_APPLICANT_CRM_FIELDS: CustomFieldDef[] = [
  { key: "co_applicant_first_name", label: "First name", type: "single_line" },
  { key: "co_applicant_middle_name", label: "Middle name", type: "single_line" },
  { key: "co_applicant_last_name", label: "Last name", type: "single_line" },
  { key: "co_applicant_email", label: "Email", type: "email" },
  { key: "co_applicant_phone", label: "Phone", type: "phone" },
  { key: "co_applicant_dob", label: "Date of birth", type: "dob" },
  {
    key: "co_applicant_relationship_to_insured",
    label: "Relationship to the insured",
    type: "picklist",
    options: [...RELATIONSHIP_TO_INSURED_OPTIONS],
  },
  {
    key: "co_applicant_gender",
    label: "Gender",
    type: "picklist",
    options: [...GENDER_OPTIONS],
  },
  {
    key: "co_applicant_marital_status",
    label: "Marital status",
    type: "picklist",
    options: [...MARITAL_STATUS_OPTIONS],
  },
  {
    key: "co_applicant_industry",
    label: "Industry",
    type: "picklist",
    options: [...INDUSTRY_OPTIONS],
  },
  {
    key: "co_applicant_occupation",
    label: "Occupation",
    type: "picklist",
    options: [...OCCUPATION_OPTIONS],
  },
  {
    key: "co_applicant_education_level",
    label: "Education level",
    type: "picklist",
    options: [...EDUCATION_LEVEL_OPTIONS],
  },
  {
    key: "co_applicant_military_discount",
    label: "Military discount",
    type: "checkbox",
  },
];

/** Identity → relationship → gender → marital → industry → occupation → military → contact. */
export const CO_APPLICANT_SECTION_FIELD_KEYS = [
  "co_applicant_first_name",
  "co_applicant_middle_name",
  "co_applicant_last_name",
  "co_applicant_relationship_to_insured",
  "co_applicant_dob",
  "co_applicant_gender",
  "co_applicant_marital_status",
  "co_applicant_industry",
  "co_applicant_occupation",
  "co_applicant_military_discount",
  "co_applicant_phone",
  "co_applicant_email",
  "co_applicant_education_level",
] as const;

/** Explicit Deal Details switch — not a layout field row. */
export const HAS_CO_APPLICANT_KEY = "has_co_applicant";

export const CO_APPLICANT_SECTION_ID = "co_applicant";

/** True when any co-applicant CRM field has a non-blank value. */
export function dealHasAnyCoApplicantValue(
  stored: Record<string, string | null | undefined> | null | undefined,
): boolean {
  const bag = stored ?? {};
  return CO_APPLICANT_SECTION_FIELD_KEYS.some((key) => String(bag[key] ?? "").trim());
}

/**
 * Co-applicant transfer/fill gate.
 * Explicit true/false wins; when unset, default Off if all blank, On if any co-app value.
 */
export function isCoApplicantEnabled(
  stored: Record<string, string | null | undefined> | null | undefined,
): boolean {
  const bag = stored ?? {};
  const flag = String(bag[HAS_CO_APPLICANT_KEY] ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(flag)) return true;
  if (["false", "0", "no", "off"].includes(flag)) return false;
  return dealHasAnyCoApplicantValue(bag);
}

export function normalizeHasCoApplicantFlag(raw: unknown): "true" | "false" {
  const flag = String(raw ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(flag) ? "true" : "false";
}

/** Explicit Deal Details Off — wins over Married-required on the master sheet. */
export function isCoApplicantExplicitlyOff(
  stored: Record<string, string | null | undefined> | string | null | undefined,
): boolean {
  const flag =
    typeof stored === "string" || stored == null
      ? String(stored ?? "").trim().toLowerCase()
      : String(stored[HAS_CO_APPLICANT_KEY] ?? "").trim().toLowerCase();
  return ["false", "0", "no", "off"].includes(flag);
}

export function coApplicantLayoutSection(): LayoutSection {
  return {
    id: "co_applicant",
    label: "Co-applicant",
    fieldKeys: [...CO_APPLICANT_SECTION_FIELD_KEYS],
  };
}
