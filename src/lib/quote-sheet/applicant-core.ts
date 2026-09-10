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

/** Broad occupation picklist — always ends with Other. */
export const OCCUPATION_OPTIONS = [
  "Accountant",
  "Actor",
  "Administrative assistant",
  "Architect",
  "Artist",
  "Attorney",
  "Banker",
  "Bartender",
  "Business owner",
  "Caregiver",
  "Carpenter",
  "Cashier",
  "Chef / Cook",
  "Childcare worker",
  "Civil servant",
  "Clergy",
  "Construction worker",
  "Consultant",
  "Contractor",
  "Customer service",
  "Dentist",
  "Designer",
  "Developer / Programmer",
  "Doctor / Physician",
  "Driver",
  "Educator / Teacher",
  "Electrician",
  "Engineer",
  "Esthetician",
  "Executive",
  "Farmer",
  "Financial advisor",
  "Firefighter",
  "Fitness trainer",
  "Hair stylist",
  "Homemaker",
  "Hospitality worker",
  "HVAC technician",
  "Insurance agent",
  "IT specialist",
  "Janitor / Custodian",
  "Laborer",
  "Lawyer",
  "Legal assistant",
  "Manager",
  "Marketing",
  "Mechanic",
  "Medical assistant",
  "Military",
  "Musician",
  "Nurse",
  "Office manager",
  "Optician",
  "Painter",
  "Paralegal",
  "Pharmacist",
  "Photographer",
  "Pilot",
  "Plumber",
  "Police officer",
  "Real estate agent",
  "Receptionist",
  "Retired",
  "Sales",
  "Scientist",
  "Security guard",
  "Self-employed",
  "Social worker",
  "Student",
  "Technician",
  "Therapist",
  "Truck driver",
  "Unemployed",
  "Veterinarian",
  "Waiter / Server",
  "Warehouse worker",
  "Writer",
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
    key: "applicant_marital_status",
    label: "Marital status",
    group: "Applicant",
    input: "select",
    options: [...MARITAL_STATUS_OPTIONS],
    extractKey: "applicant_marital_status",
  },
  {
    key: "applicant_occupation",
    label: "Occupation",
    group: "Applicant",
    input: "select",
    options: [...OCCUPATION_OPTIONS],
    extractKey: "applicant_occupation",
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
    key: "co_applicant_marital_status",
    label: "Marital status",
    group: "Co-applicant",
    input: "select",
    options: [...MARITAL_STATUS_OPTIONS],
    extractKey: "co_applicant_marital_status",
  },
  {
    key: "co_applicant_occupation",
    label: "Occupation",
    group: "Co-applicant",
    input: "select",
    options: [...OCCUPATION_OPTIONS],
    extractKey: "co_applicant_occupation",
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
): boolean {
  return isMarriedStatus(values.applicant_marital_status?.value);
}
