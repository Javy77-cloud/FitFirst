import type { CustomFieldDef, LayoutSection } from "./types";
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
} from "@/lib/quote-sheet/applicant-core";
import { INDUSTRY_OPTIONS } from "./industry-occupation";

export const YES_NO_OPTIONS = ["Yes", "No"] as const;

export const CREDIT_PERMISSION_OPTIONS = ["Yes", "No", "Only if required"] as const;

export const ASSUMED_CREDIT_RATING_OPTIONS = [
  "Poor",
  "Below average",
  "Average",
  "Very good",
  "Excellent",
] as const;

/** Shared Lead/Deal applicant picklists — options from quote-sheet applicant_core only. */
export const APPLICANT_CORE_CRM_FIELDS: CustomFieldDef[] = [
  {
    key: "applicant_gender",
    label: "Gender",
    type: "picklist",
    options: [...GENDER_OPTIONS],
  },
  {
    key: "applicant_occupation",
    label: "Occupation",
    type: "picklist",
    options: [...OCCUPATION_OPTIONS],
  },
  {
    key: "applicant_employment",
    label: "Employment",
    type: "picklist",
    options: [...EMPLOYMENT_STATUS_OPTIONS],
  },
  {
    key: "applicant_marital_status",
    label: "Marital status",
    type: "picklist",
    options: [...MARITAL_STATUS_OPTIONS],
  },
  {
    key: "applicant_education_level",
    label: "Education level",
    type: "picklist",
    options: [...EDUCATION_LEVEL_OPTIONS],
  },
  {
    key: "entity_type",
    label: "Entity type",
    type: "picklist",
    options: [...ENTITY_TYPE_OPTIONS],
  },
];

/** Deal Details personal extras — industry cascade, military, credit, paperless. */
export const APPLICANT_PERSONAL_FIELDS: CustomFieldDef[] = [
  {
    key: "applicant_industry",
    label: "Industry",
    type: "picklist",
    options: [...INDUSTRY_OPTIONS],
  },
  {
    key: "military_discount",
    label: "Military discount",
    type: "checkbox",
  },
  {
    key: "credit_permission",
    label: "Credit permission",
    type: "picklist",
    options: [...CREDIT_PERMISSION_OPTIONS],
  },
  {
    key: "assumed_credit_rating",
    label: "Assumed credit rating",
    type: "picklist",
    options: [...ASSUMED_CREDIT_RATING_OPTIONS],
  },
  {
    key: "epolicy",
    label: "ePolicy (paperless)",
    type: "checkbox",
  },
];

export const APPLICANT_CRM_FIELDS: CustomFieldDef[] = [
  ...APPLICANT_CORE_CRM_FIELDS,
  ...APPLICANT_PERSONAL_FIELDS,
];

/**
 * Applicant stack on Deal/Lead (entity type lives on Contact / main info).
 * Gender → marital → industry → occupation → credit/military → employment → education.
 */
export const APPLICANT_SECTION_FIELD_KEYS = [
  "applicant_gender",
  "applicant_marital_status",
  "applicant_industry",
  "applicant_occupation",
  "military_discount",
  "credit_permission",
  "assumed_credit_rating",
  "applicant_employment",
  "applicant_education_level",
] as const;

export const APPLICANT_CUSTOM_KEYS = [
  "applicant_gender",
  "applicant_occupation",
  "applicant_employment",
  "applicant_marital_status",
  "applicant_education_level",
  "entity_type",
  "applicant_industry",
  "military_discount",
  "credit_permission",
  "assumed_credit_rating",
  "epolicy",
] as const;

export const CONTACT_IDENTITY_FIELD_KEYS = [
  "entity_type",
  "first_name",
  "middle_name",
  "last_name",
  "date_of_birth",
  "phone",
  "email",
  "epolicy",
] as const;

export function applicantLayoutSection(): LayoutSection {
  return {
    id: "applicant",
    label: "Applicant",
    fieldKeys: [...APPLICANT_SECTION_FIELD_KEYS],
  };
}
