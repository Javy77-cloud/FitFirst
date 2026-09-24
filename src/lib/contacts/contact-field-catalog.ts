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

export const CONTACT_METHOD_OPTIONS = ["Phone", "Email", "Text", "Mail", "Calls", "SMS", "Any"] as const;
export const CONTACT_TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Anytime"] as const;
export const CONTACT_GENDER_OPTIONS = ["Female", "Male", "Other"] as const;
export const CONTACT_DEPENDENT_RELATION_OPTIONS = ["Child", "Other"] as const;
export const CONTACT_MAILING_SAME_OPTIONS = ["Same as above", "Different…"] as const;
export const CONTACT_SPOUSE_LINK_OPTIONS = ["None yet", "Create / link later…"] as const;
/** Layout revision that ships Contact Details sketch v4 (force-upgrade stock layouts). */
export const CONTACT_DETAILS_V4_REVISION = "contact-details-v4";

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

/** Label for existing_coverage_types — other carriers only, never this agency. */
export const CONTACT_EXTERNAL_COVERAGE_LABEL = "Coverage with other carriers";

/** Layout slot for the read-only generated Opportunities surface. */
export const CONTACT_GENERATED_OPPORTUNITIES_LABEL = "Opportunities";

/** Legacy labels kept for Settings → Picklists. Contact Details does not use this picklist. */
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

/** Other-carrier coverage multi-select — same labels as Global Lists → Policy sub-types. */
export const CONTACT_EXISTING_COVERAGE_OPTIONS = [...POLICY_SUB_TYPES];

/** Full Contact module field catalog — Edit Layout + bind transfer. */
export const CONTACT_MODULE_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First Name", type: "single_line", systemKey: "firstName", required: true },
  { key: "middle_name", label: "Middle Name", type: "single_line" },
  { key: "last_name", label: "Last Name", type: "single_line", systemKey: "lastName", required: true },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "nickname", label: "Nickname", type: "single_line", systemKey: "nickname" },
  { key: "secondary_phone", label: "Secondary Phone", type: "phone", systemKey: "secondaryPhone" },
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
  {
    key: "gender",
    label: "Gender",
    type: "picklist",
    options: [...CONTACT_GENDER_OPTIONS],
    systemKey: "gender",
  },
  { key: "mailing_address", label: "Street", type: "single_line", systemKey: "mailingAddress" },
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
    label: CONTACT_EXTERNAL_COVERAGE_LABEL,
    type: "multi_select",
    options: [...CONTACT_EXISTING_COVERAGE_OPTIONS],
  },
  /**
   * JSON map of CoverageLine → other. Not a layout field — Coverage section owns the UX.
   * “With us” is in-force Policies only.
   */
  { key: "coverage_carrier_of_record", label: "Carrier of Record", type: "single_line" },
  {
    key: "cross_selling_opportunity",
    label: CONTACT_GENERATED_OPPORTUNITIES_LABEL,
    type: "single_line",
  },
  { key: "is_homeowner", label: "Homeowner", type: "checkbox" },
  { key: "is_business_owner", label: "Business Owner", type: "checkbox" },
  { key: "dl_state", label: "DL State", type: "single_line", systemKey: "dlState" },
  {
    key: "drivers_license_number",
    label: "Driver's License #",
    type: "single_line",
    systemKey: "licenseNumberLast4",
  },
  {
    key: "dl_expiration",
    label: "DL Expiration",
    type: "single_line",
    systemKey: "licenseExpiration",
  },
  {
    key: "mailing_same_as_insured",
    label: "Mailing Address",
    type: "picklist",
    options: [...CONTACT_MAILING_SAME_OPTIONS],
  },
  { key: "spouse_name", label: "Spouse Name", type: "single_line", systemKey: "spouseName" },
  { key: "spouse_dob", label: "Spouse Date Of Birth", type: "dob", systemKey: "spouseDob" },
  {
    key: "spouse_link",
    label: "Link Spouse Contact",
    type: "picklist",
    options: [...CONTACT_SPOUSE_LINK_OPTIONS],
  },
  { key: "dependents", label: "Dependents", type: "multi_line", systemKey: "dependents" },
  { key: "campaign_tag", label: "Campaign / Tag", type: "single_line" },
  /** Options from Global List "Lead Source" — bound in contact-detail-picklists. */
  { key: "source", label: "Lead Source", type: "picklist", options: [], systemKey: "source" },
  { key: "referral", label: "Referred By", type: "single_line" },
  { key: "life_notes", label: "Life Notes (CRM Only)", type: "multi_line", systemKey: "lifeNotes" },
  { key: "health_notes", label: "Health Notes (CRM Only)", type: "multi_line", systemKey: "healthNotes" },
  { key: "pc_notes", label: "P&C Notes (CRM Only)", type: "multi_line" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
  { key: "client_status", label: "Client Status", type: "single_line", systemKey: "clientStatus" },
];

function section(
  id: string,
  label: string,
  fieldKeys: string[],
  density?: 1 | 2 | 3 | 4 | 5,
) {
  return density ? { id, label, fieldKeys, density } : { id, label, fieldKeys };
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
const DEFAULT_IDENTITY_KEYS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "date_of_birth",
  "marital_status",
  "mailing_address",
  "city",
  "state",
  "zip",
] as const;

function sameKeySet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const next = new Set(b);
  return a.every((key) => next.has(key));
}

/** Move Preferences next to Contact and pair DOB + marital so the five sections share one grid. */
export function rebalanceContactDetailLayout(layout: FieldLayout): FieldLayout {
  const left = layout.columns[0];
  const right = layout.columns[1];
  if (!left || !right) return layout;
  let nextLeft = left.sections.map((section) => {
    if (section.id !== "identity") return section;
    if (!sameKeySet(section.fieldKeys, DEFAULT_IDENTITY_KEYS)) return section;
    if (section.fieldKeys.join("|") === DEFAULT_IDENTITY_KEYS.join("|")) return section;
    return { ...section, fieldKeys: [...DEFAULT_IDENTITY_KEYS] };
  });
  let nextRight = right.sections;
  const leftIds = nextLeft.map((section) => section.id);
  const prefsOnRight = nextRight.find((section) => section.id === "prefs");
  if (leftIds.length === 1 && leftIds[0] === "identity" && prefsOnRight) {
    nextLeft = [...nextLeft, prefsOnRight];
    nextRight = nextRight.filter((section) => section.id !== "prefs");
  }
  const next = {
    ...layout,
    columns: [
      { ...left, sections: nextLeft },
      { ...right, sections: nextRight },
    ] as FieldLayout["columns"],
  };
  if (JSON.stringify(next.columns) === JSON.stringify(layout.columns)) return layout;
  return next;
}

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
 * Left: Contact + Preferences. Right: Coverage, Opportunities, Lead Source.
 * Fields inside each section use the same 2-col grid (city/state/zip is the only trio).
 */
/**
 * Contact Details sketch v4 — single stacked column, 4-field density.
 * Coverage / Opportunities live on their own page tabs (not inside Details).
 * Education / Title / ePolicy stay off Contact Details (education remains on Deal).
 */
export function contactCardLayout(): FieldLayout {
  return twoCol(
    [
      section(
        "identity",
        "Contact",
        [
          "first_name",
          "middle_name",
          "last_name",
          "nickname",
          "date_of_birth",
          "phone",
          "secondary_phone",
          "email",
          "mailing_address",
          "city",
          "state",
          "zip",
          "dl_state",
          "drivers_license_number",
          "dl_expiration",
          "mailing_same_as_insured",
          "contact_mailing_address",
          "contact_mailing_city",
          "contact_mailing_state",
          "contact_mailing_zip",
        ],
        4,
      ),
      section(
        "prefs",
        "Preferences & Household",
        [
          "preferred_language",
          "marital_status",
          "occupation",
          "gender",
          "preferred_contact_method",
          "preferred_contact_time",
          "spouse_name",
          "spouse_dob",
          "spouse_link",
          "dependents",
        ],
        4,
      ),
      section(
        "intake",
        "Lead Source",
        ["source", "referral", "campaign_tag", "notes"],
        4,
      ),
    ],
    [],
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


/** True when a saved Contact Details layout still needs the sketch v4 reseed. */
export function needsContactDetailsV4Upgrade(layout: FieldLayout): boolean {
  const keys = new Set(
    layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys)),
  );
  if (!keys.has("nickname")) return true;
  if (!keys.has("dependents")) return true;
  const sectionIds = layout.columns.flatMap((column) => column.sections.map((section) => section.id));
  if (sectionIds.includes("coverage") || sectionIds.includes("opportunities")) return true;
  const prefs = layout.columns
    .flatMap((column) => column.sections)
    .find((section) => section.id === "prefs");
  if (prefs?.fieldKeys.includes("education_level")) return true;
  return false;
}

/** Deal/Lead custom keys → Contact field keys for empty-only bind transfer. */
export const DEAL_TO_CONTACT_FIELD_MAP: Record<string, string> = {
  first_name: "first_name",
  middle_name: "middle_name",
  last_name: "last_name",
  email: "email",
  phone: "phone",
  date_of_birth: "date_of_birth",
  applicant_dob: "date_of_birth",
  insured_dob: "date_of_birth",
  dob: "date_of_birth",
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
  applicant_marital_status: "marital_status",
  applicant_education_level: "education_level",
  source: "source",
  referral: "referral",
  nickname: "nickname",
  secondary_phone: "secondary_phone",
  gender: "gender",
  spouse_name: "spouse_name",
  spouse_dob: "spouse_dob",
  dl_state: "dl_state",
  dl_expiration: "dl_expiration",
  campaign_tag: "campaign_tag",
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
  co_applicant_education_level: "education_level",
};
