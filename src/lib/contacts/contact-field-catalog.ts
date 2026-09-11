import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";

export const CONTACT_EDUCATION_OPTIONS = [
  "High School",
  "Some College",
  "Bachelor's",
  "Master's",
  "Doctorate",
  "Other",
] as const;

export const CONTACT_MARITAL_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
] as const;

export const CONTACT_EMPLOYMENT_OPTIONS = [
  "Employed",
  "Self-employed",
  "Retired",
  "Unemployed",
  "Student",
] as const;

export const CONTACT_METHOD_OPTIONS = ["Phone", "Email", "Text", "Mail"] as const;
export const CONTACT_TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Anytime"] as const;

/** Full Contact module field catalog — Edit Layout + bind transfer. */
export const CONTACT_MODULE_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First Name", type: "single_line", systemKey: "firstName", required: true },
  { key: "middle_name", label: "Middle Name", type: "single_line" },
  { key: "last_name", label: "Last Name", type: "single_line", systemKey: "lastName", required: true },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "date_of_birth", label: "Date Of Birth", type: "dob", systemKey: "dateOfBirth" },
  { key: "occupation", label: "Occupation", type: "single_line" },
  {
    key: "education_level",
    label: "Education Level",
    type: "picklist",
    options: [...CONTACT_EDUCATION_OPTIONS],
  },
  {
    key: "marital_status",
    label: "Marital Status",
    type: "picklist",
    options: [...CONTACT_MARITAL_OPTIONS],
    systemKey: "maritalStatus",
  },
  {
    key: "employment_status",
    label: "Employment Status",
    type: "picklist",
    options: [...CONTACT_EMPLOYMENT_OPTIONS],
  },
  { key: "mailing_address", label: "Insured Address", type: "address", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
  { key: "contact_mailing_address", label: "Mailing Address", type: "address" },
  { key: "contact_mailing_city", label: "Mailing City", type: "single_line" },
  { key: "contact_mailing_state", label: "Mailing State", type: "single_line" },
  { key: "contact_mailing_zip", label: "Mailing ZIP", type: "single_line" },
  {
    key: "preferred_contact_method",
    label: "Preferred Contact Method",
    type: "picklist",
    options: [...CONTACT_METHOD_OPTIONS],
  },
  {
    key: "preferred_contact_time",
    label: "Preferred Contact Time",
    type: "picklist",
    options: [...CONTACT_TIME_OPTIONS],
  },
  { key: "preferred_language", label: "Preferred Language", type: "single_line", systemKey: "preferredLanguage" },
  { key: "source", label: "Source", type: "single_line", systemKey: "source" },
  { key: "referral", label: "Referral", type: "single_line" },
  { key: "life_notes", label: "Life Notes (CRM Only)", type: "multi_line", systemKey: "lifeNotes" },
  { key: "health_notes", label: "Health Notes (CRM Only)", type: "multi_line", systemKey: "healthNotes" },
  { key: "pc_notes", label: "P&C Notes (CRM Only)", type: "multi_line" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
  { key: "client_status", label: "Client Status", type: "single_line", systemKey: "clientStatus" },
];

function section(id: string, label: string, fieldKeys: string[]) {
  return { id, label, fieldKeys };
}

function twoCol(left: ReturnType<typeof section>[], right: ReturnType<typeof section>[]): FieldLayout {
  return {
    columns: [
      { id: "left", sections: left },
      { id: "right", sections: right },
    ],
  };
}

/** Card template — two column spacious. */
export function contactCardLayout(): FieldLayout {
  return twoCol(
    [
      section("identity", "Contact", [
        "first_name",
        "middle_name",
        "last_name",
        "email",
        "phone",
        "date_of_birth",
      ]),
      section("demographics", "Demographics", [
        "occupation",
        "employment_status",
        "marital_status",
        "education_level",
      ]),
      section("insured", "Insured Address", ["mailing_address", "city", "state", "zip"]),
      section("mailing", "Mailing Address", [
        "contact_mailing_address",
        "contact_mailing_city",
        "contact_mailing_state",
        "contact_mailing_zip",
      ]),
    ],
    [
      section("prefs", "Preferences", [
        "preferred_contact_method",
        "preferred_contact_time",
        "preferred_language",
        "source",
        "referral",
      ]),
      section("crm_notes", "CRM Notes", ["life_notes", "health_notes", "pc_notes", "notes"]),
    ],
  );
}

/** Classic template — dense primary column + empty right (FieldLayout is always two-col). */
export function contactClassicLayout(): FieldLayout {
  return twoCol(
    [
      section("identity", "Contact", [
        "first_name",
        "middle_name",
        "last_name",
        "email",
        "phone",
        "date_of_birth",
        "occupation",
        "employment_status",
        "marital_status",
        "education_level",
        "mailing_address",
        "city",
        "state",
        "zip",
        "contact_mailing_address",
        "contact_mailing_city",
        "contact_mailing_state",
        "contact_mailing_zip",
        "preferred_contact_method",
        "preferred_contact_time",
        "source",
        "referral",
        "life_notes",
        "health_notes",
        "pc_notes",
      ]),
    ],
    [],
  );
}

/** Deal/Lead custom keys → Contact field keys for empty-only bind transfer. */
export const DEAL_TO_CONTACT_FIELD_MAP: Record<string, string> = {
  first_name: "first_name",
  middle_name: "middle_name",
  last_name: "last_name",
  email: "email",
  phone: "phone",
  date_of_birth: "date_of_birth",
  mailing_address: "mailing_address",
  city: "city",
  state: "state",
  zip: "zip",
  contact_mailing_address: "contact_mailing_address",
  contact_mailing_city: "contact_mailing_city",
  contact_mailing_state: "contact_mailing_state",
  contact_mailing_zip: "contact_mailing_zip",
  preferred_language: "preferred_language",
  preferred_contact_method: "preferred_contact_method",
  preferred_contact_time: "preferred_contact_time",
  applicant_occupation: "occupation",
  applicant_employment: "employment_status",
  applicant_marital_status: "marital_status",
  applicant_education_level: "education_level",
  source: "source",
  referral: "referral",
  life_notes: "life_notes",
  health_notes: "health_notes",
  pc_notes: "pc_notes",
  notes: "notes",
};

/** Deal/Lead co-applicant custom keys → Contact field keys (second contact only). */
export const CO_APPLICANT_TO_CONTACT_FIELD_MAP: Record<string, string> = {
  co_applicant_first_name: "first_name",
  co_applicant_last_name: "last_name",
  co_applicant_email: "email",
  co_applicant_phone: "phone",
  co_applicant_dob: "date_of_birth",
  co_applicant_marital_status: "marital_status",
  co_applicant_occupation: "occupation",
  co_applicant_employment: "employment_status",
  co_applicant_education_level: "education_level",
};
