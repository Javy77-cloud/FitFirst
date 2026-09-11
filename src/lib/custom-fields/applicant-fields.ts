import type { CustomFieldDef, LayoutSection } from "./types";
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
} from "@/lib/quote-sheet/applicant-core";

/** Shared Lead/Deal applicant picklists — options from quote-sheet applicant_core only. */
export const APPLICANT_CRM_FIELDS: CustomFieldDef[] = [
  {
    key: "applicant_gender",
    label: "Gender",
    type: "picklist",
    options: [...GENDER_OPTIONS],
  },
  {
    key: "applicant_marital_status",
    label: "Marital status",
    type: "picklist",
    options: [...MARITAL_STATUS_OPTIONS],
  },
  {
    key: "applicant_employment",
    label: "Employment",
    type: "picklist",
    options: [...EMPLOYMENT_STATUS_OPTIONS],
  },
  {
    key: "applicant_occupation",
    label: "Occupation",
    type: "picklist",
    options: [...OCCUPATION_OPTIONS],
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

/** Layout order: DOB then gender → marital → employment → occupation → education → entity. */
export const APPLICANT_SECTION_FIELD_KEYS = [
  "date_of_birth",
  "applicant_gender",
  "applicant_marital_status",
  "applicant_employment",
  "applicant_occupation",
  "applicant_education_level",
  "entity_type",
] as const;

export const APPLICANT_CUSTOM_KEYS = [
  "applicant_gender",
  "applicant_marital_status",
  "applicant_employment",
  "applicant_occupation",
  "applicant_education_level",
  "entity_type",
] as const;

export function applicantLayoutSection(): LayoutSection {
  return {
    id: "applicant",
    label: "Applicant",
    fieldKeys: [...APPLICANT_SECTION_FIELD_KEYS],
  };
}
