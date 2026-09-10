import type { SheetProduct } from "./products";

export type QuoteFieldDef = {
  key: string;
  label: string;
  group: string;
  input?: "text" | "number" | "textarea" | "select";
  /** Picklist options when input is select (or options are set). */
  options?: string[];
  /** Maps an extraction fieldKey onto this sheet key. */
  extractKey?: string;
  /** When set, the field only shows for these products. */
  products?: SheetProduct[];
};

/** Relationship picklist for applicant ↔ co-applicant (Home, Auto, every LOB). */
export const CO_APPLICANT_RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Domestic partner",
  "Brother",
  "Sister",
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Grandparent",
  "Grandchild",
  "Uncle",
  "Aunt",
  "Nephew",
  "Niece",
  "Cousin",
  "Other relative",
  "Friend",
  "Other",
] as const;

/** Shared applicant block on every master sheet. One deal, one product. */
export const APPLICANT_CORE_FIELDS: QuoteFieldDef[] = [
  { key: "applicant_name", label: "Applicant name", group: "Applicant", extractKey: "applicant_name" },
  { key: "applicant_address", label: "Applicant address", group: "Applicant", extractKey: "applicant_address" },
  { key: "applicant_phone", label: "Phone", group: "Applicant", extractKey: "phone" },
  { key: "applicant_email", label: "Email", group: "Applicant", extractKey: "email" },
  { key: "applicant_dob", label: "Date of birth", group: "Applicant", extractKey: "dob" },
  { key: "entity_type", label: "Entity type", group: "Applicant", extractKey: "entity_type" },
];

/**
 * Optional co-applicant — added on the master sheet when needed (Home, Auto, any LOB).
 * Shown via CoApplicantBlock (+ Add co-applicant), not as empty slots.
 */
export const CO_APPLICANT_FIELDS: QuoteFieldDef[] = [
  {
    key: "applicant_relationship_to_co_applicant",
    label: "Applicant relationship to co-applicant",
    group: "Co-applicant",
    input: "select",
    options: [...CO_APPLICANT_RELATIONSHIP_OPTIONS],
  },
  { key: "co_applicant_name", label: "Co-applicant name", group: "Co-applicant", extractKey: "co_applicant_name" },
  {
    key: "co_applicant_relationship",
    label: "Co-applicant relationship to applicant",
    group: "Co-applicant",
    input: "select",
    options: [...CO_APPLICANT_RELATIONSHIP_OPTIONS],
  },
  { key: "co_applicant_dob", label: "Date of birth", group: "Co-applicant", extractKey: "co_applicant_dob" },
  { key: "co_applicant_email", label: "Email", group: "Co-applicant", extractKey: "co_applicant_email" },
  { key: "co_applicant_phone", label: "Phone", group: "Co-applicant", extractKey: "co_applicant_phone" },
  {
    key: "co_applicant_share_address",
    label: "Share address with applicant",
    group: "Co-applicant",
    input: "select",
    options: ["Yes", "No"],
  },
  { key: "co_applicant_address", label: "Co-applicant address", group: "Co-applicant", extractKey: "co_applicant_address" },
];

export function coApplicantHasValue(values: Record<string, { value?: string; status?: string } | undefined>): boolean {
  return CO_APPLICANT_FIELDS.some((field) => {
    const cell = values[field.key];
    const raw = cell?.value?.trim() ?? "";
    return Boolean(raw) && cell?.status !== "missing";
  });
}
