import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";
import { POLICY_SUB_TYPES } from "@/lib/commissions/zoho-fields";

export const CONTACT_EDUCATION_OPTIONS = [
  "High School",
  "Some College",
  "Associate's",
  "Bachelor's",
  "Master's",
  "Doctorate",
  "Other",
] as const;

const EDUCATION_ASSOCIATE_ALIASES = new Set([
  "associate's",
  "associates",
  "associate",
  "associate degree",
  "associate's degree",
  "associates degree",
]);

const EDUCATION_BACHELOR_ALIASES = new Set([
  "bachelor's",
  "bachelors",
  "bachelor",
  "bachelor's degree",
  "bachelor degree",
  "bachelors degree",
]);

function educationOptionLabel(option: string | { value: string }): string {
  return typeof option === "string" ? option : option.value;
}

/** True when the list already has an associate-level value (any common wording). */
export function educationOptionsIncludeAssociate(
  options: ReadonlyArray<string | { value: string }>,
): boolean {
  return options.some((option) =>
    EDUCATION_ASSOCIATE_ALIASES.has(educationOptionLabel(option).trim().toLowerCase()),
  );
}

/**
 * Insert Associate's before Bachelor's when missing.
 * Leaves custom agency values and order alone — never replaces the list.
 */
export function insertAssociatesEducationOption<T extends string | { value: string }>(
  options: readonly T[],
): T[] {
  if (educationOptionsIncludeAssociate(options)) return options as T[];
  const insert = (
    options.some((option) => typeof option !== "string")
      ? { value: "Associate's" }
      : "Associate's"
  ) as T;
  const at = options.findIndex((option) =>
    EDUCATION_BACHELOR_ALIASES.has(educationOptionLabel(option).trim().toLowerCase()),
  );
  if (at < 0) return [...options, insert];
  return [...options.slice(0, at), insert, ...options.slice(at)];
}

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

/** Starter options for Settings → Picklists → Recent Life Events. */
export const CONTACT_RECENT_LIFE_EVENT_OPTIONS = [
  "Marriage",
  "Divorce",
  "New Baby",
  "New Home Purchase",
  "Moved",
  "Remodel / Renovation",
  "Job Change",
  "Retirement",
  "Death In Family",
  "Empty Nest",
  "Other",
] as const;

/** Starter options for Settings → Picklists → Cross-Selling Opportunities. */
export const CONTACT_CROSS_SELL_OPTIONS = [
  "Auto",
  "Home",
  "Flood",
  "Umbrella",
  "Life",
  "Health",
  "Renters",
  "Condo",
  "Boat",
  "Motorcycle",
  "Business / Commercial",
  "Other",
] as const;

/** Existing coverage multi-select — same labels as Global Lists → Policy sub-types. */
export const CONTACT_EXISTING_COVERAGE_OPTIONS = [...POLICY_SUB_TYPES];

/** Full Contact module field catalog — Edit Layout + bind transfer. */
export const CONTACT_MODULE_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First Name", type: "single_line", systemKey: "firstName", required: true },
  { key: "middle_name", label: "Middle Name", type: "single_line" },
  { key: "last_name", label: "Last Name", type: "single_line", systemKey: "lastName", required: true },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "date_of_birth", label: "Date Of Birth", type: "dob", systemKey: "dateOfBirth" },
  /** Options come from global Settings picklist "Occupations" — never hardcode in UI. */
  { key: "occupation", label: "Occupation", type: "picklist", options: [] },
  {
    key: "education_level",
    label: "Education Level",
    type: "picklist",
    options: [...CONTACT_EDUCATION_OPTIONS],
  },
  /**
   * Options from Global List "Marital Status" — bound in contact-detail-picklists.
   * Live DB may still be single_line until ensure upgrades the field type.
   */
  {
    key: "marital_status",
    label: "Marital Status",
    type: "picklist",
    options: [],
    systemKey: "maritalStatus",
  },
  {
    key: "employment_status",
    label: "Employment Status",
    type: "picklist",
    options: [...CONTACT_EMPLOYMENT_OPTIONS],
  },
  { key: "mailing_address", label: "Address", type: "address", systemKey: "mailingAddress" },
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
  {
    key: "recent_life_events",
    label: "Recent Life Events",
    type: "multi_select",
    options: [...CONTACT_RECENT_LIFE_EVENT_OPTIONS],
  },
  {
    key: "existing_coverage_types",
    label: "Existing Coverage Type",
    type: "multi_select",
    options: [...CONTACT_EXISTING_COVERAGE_OPTIONS],
  },
  {
    key: "cross_selling_opportunity",
    label: "Cross-Selling Opportunity",
    type: "picklist",
    options: [...CONTACT_CROSS_SELL_OPTIONS],
  },
  { key: "is_homeowner", label: "Homeowner", type: "checkbox" },
  { key: "is_business_owner", label: "Business Owner", type: "checkbox" },
  /** Options from Global List "Lead Source" — bound in contact-detail-picklists. */
  { key: "source", label: "Lead Source", type: "picklist", options: [], systemKey: "source" },
  { key: "referral", label: "Referred By", type: "single_line" },
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

/** In-force book cues on Contact Details — not policy-limit fields. */
export const CONTACT_COVERAGE_FIELD_KEYS = [
  "existing_coverage_types",
  "is_homeowner",
  "is_business_owner",
] as const;

/** Cross-sell / life-event cues on Contact Details — not the Deals list. */
export const CONTACT_OPPORTUNITY_FIELD_KEYS = [
  "recent_life_events",
  "cross_selling_opportunity",
] as const;

export function isCombinedCoverageOpportunitiesSection(section: {
  id: string;
  label: string;
  fieldKeys: string[];
}): boolean {
  if (section.label.trim() === "Coverage & Opportunities") return true;
  return (
    section.id === "opportunities" &&
    section.fieldKeys.includes("existing_coverage_types") &&
    section.fieldKeys.includes("cross_selling_opportunity")
  );
}

/** Split the old combined CRM section so Coverage and Opportunities stay on Contact. */
export function splitCoverageOpportunitiesLayout(layout: FieldLayout): FieldLayout {
  const splitColumn = (column: FieldLayout["columns"][number]) => ({
    ...column,
    sections: column.sections.flatMap((sec) => {
      if (!isCombinedCoverageOpportunitiesSection(sec)) return [sec];
      const coverageKeys = sec.fieldKeys.filter((key) =>
        (CONTACT_COVERAGE_FIELD_KEYS as readonly string[]).includes(key),
      );
      const opportunityKeys = sec.fieldKeys.filter((key) =>
        (CONTACT_OPPORTUNITY_FIELD_KEYS as readonly string[]).includes(key),
      );
      const leftover = sec.fieldKeys.filter(
        (key) =>
          !(CONTACT_COVERAGE_FIELD_KEYS as readonly string[]).includes(key) &&
          !(CONTACT_OPPORTUNITY_FIELD_KEYS as readonly string[]).includes(key),
      );
      const next: typeof sec[] = [];
      if (coverageKeys.length || leftover.length) {
        next.push({
          ...sec,
          id: "coverage",
          label: "Coverage",
          fieldKeys: [...coverageKeys, ...leftover],
        });
      }
      if (opportunityKeys.length) {
        next.push({
          id: "opportunities",
          label: "Opportunities",
          fieldKeys: opportunityKeys,
          density: sec.density,
        });
      }
      return next.length > 0 ? next : [sec];
    }),
  });
  return {
    ...layout,
    columns: [splitColumn(layout.columns[0]), splitColumn(layout.columns[1])],
  };
}

/**
 * Contact Details / Edit Layout default — two even columns.
 * Left: identity + address + marital. Right: prefs, Coverage, Opportunities, lead source.
 * Coverage / Opportunities belong on Contact (household book + cross-sell), not Policy.
 */
export function contactCardLayout(): FieldLayout {
  return twoCol(
    [
      section("identity", "Contact", [
        "first_name",
        "last_name",
        "email",
        "phone",
        "date_of_birth",
        "mailing_address",
        "city",
        "state",
        "zip",
        "marital_status",
      ]),
    ],
    [
      section("prefs", "Preferences", [
        "occupation",
        "education_level",
        "preferred_contact_method",
        "preferred_contact_time",
      ]),
      section("coverage", "Coverage", [...CONTACT_COVERAGE_FIELD_KEYS]),
      section("opportunities", "Opportunities", [...CONTACT_OPPORTUNITY_FIELD_KEYS]),
      section("intake", "Lead Source", ["source", "referral"]),
    ],
  );
}

/**
 * Classic (Dense) — one column for narrower monitors.
 * All card sections stack in the left column; right stays empty so the
 * record form can render as a true single column.
 */
export function contactClassicLayout(): FieldLayout {
  const card = contactCardLayout();
  const stacked = [
    ...card.columns[0].sections,
    ...card.columns[1].sections,
  ];
  return twoCol(stacked, []);
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
