import type { LineOfBusiness } from "@/lib/domain";
import type { CustomFieldDef, FieldLayout, LayoutSection } from "./types";

function section(id: string, label: string, fieldKeys: string[]): LayoutSection {
  return { id, label, fieldKeys };
}

const CORE_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First name", type: "single_line", systemKey: "firstName" },
  { key: "middle_name", label: "Middle name", type: "single_line", systemKey: "middleName" },
  { key: "last_name", label: "Last name", type: "single_line", systemKey: "lastName" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "date_of_birth", label: "Date of birth", type: "date", systemKey: "dateOfBirth" },
  { key: "mailing_address", label: "Address", type: "single_line", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
  { key: "named_insured", label: "Named insured", type: "single_line", systemKey: "primaryNamedInsured" },
];

const LOB_FIELDS: Record<string, CustomFieldDef[]> = {
  HO: [
    { key: "year_built", label: "Year built", type: "number" },
    { key: "roof_year", label: "Roof year", type: "number" },
    { key: "construction", label: "Construction", type: "picklist", options: ["Frame", "Masonry", "Masonry veneer", "Superior"] },
    { key: "coverage_a", label: "Coverage A", type: "currency" },
    { key: "stories", label: "Stories", type: "number" },
    { key: "roof_photo", label: "Roof photo", type: "image" },
    { key: "dwell_pct", label: "Other structures %", type: "formula", formula: "coverage_a * 0.1" },
  ],
  AUTO: [
    { key: "vin", label: "VIN", type: "single_line" },
    { key: "vehicle_year", label: "Year", type: "number" },
    { key: "make", label: "Make", type: "single_line" },
    { key: "model", label: "Model", type: "single_line" },
  ],
  FLOOD: [
    { key: "flood_zone", label: "Flood zone", type: "single_line" },
    { key: "elevation", label: "Elevation", type: "number" },
  ],
  UMBRELLA: [
    { key: "umbrella_limit", label: "Umbrella limit", type: "currency" },
    { key: "underlying", label: "Underlying carriers", type: "multi_line" },
  ],
  GL: [
    { key: "legal_name", label: "Legal name", type: "single_line" },
    { key: "class_code", label: "Class code", type: "single_line" },
    { key: "employees", label: "Employees", type: "number" },
    { key: "operations", label: "Operations", type: "multi_line" },
    { key: "occupancy", label: "Occupancy", type: "single_line" },
    { key: "sqft", label: "Square footage", type: "number" },
  ],
  BOP: [
    { key: "legal_name", label: "Legal name", type: "single_line" },
    { key: "class_code", label: "Class code", type: "single_line" },
    { key: "employees", label: "Employees", type: "number" },
    { key: "sales", label: "Annual sales", type: "currency" },
  ],
  LIFE: [
    { key: "face_amount", label: "Face amount", type: "currency" },
    { key: "tobacco", label: "Tobacco", type: "checkbox" },
    { key: "beneficiary", label: "Beneficiary", type: "lookup", lookupModule: "contacts" },
  ],
  HEALTH: [
    { key: "plan_type", label: "Plan type", type: "picklist", options: ["PPO", "HMO", "EPO", "HDHP"] },
    { key: "dependents", label: "Dependents", type: "number" },
  ],
  RV: [
    { key: "rv_year", label: "Year", type: "number" },
    { key: "rv_make", label: "Make", type: "single_line" },
    { key: "length_ft", label: "Length (ft)", type: "number" },
  ],
  WC: [
    { key: "payroll", label: "Payroll", type: "currency" },
    { key: "class_code", label: "Class code", type: "single_line" },
    { key: "employees", label: "Employees", type: "number" },
  ],
};

export const ESSENTIAL_CONTACT_KEYS = ["first_name", "last_name", "email", "phone"] as const;
export const ESSENTIAL_ADDRESS_KEYS = ["mailing_address", "city", "state", "zip"] as const;
export const OPTIONAL_CONTACT_KEYS = ["middle_name", "date_of_birth"] as const;

/** Old sep7as default sections that no longer belong on Deal Details. */
export const STRIPPED_DEAL_SECTION_IDS = [
  "property",
  "photos",
  "notes",
  "vehicle",
  "flood",
  "umbrella",
  "business",
  "operations",
  "life",
  "health",
  "rv",
  "wc",
] as const;

function essentialSections(): { left: LayoutSection[]; right: LayoutSection[] } {
  return {
    left: [section("contact", "Contact", [...ESSENTIAL_CONTACT_KEYS])],
    right: [section("address", "Address", [...ESSENTIAL_ADDRESS_KEYS])],
  };
}

export function defaultFieldsForLine(line: string): CustomFieldDef[] {
  const extra = LOB_FIELDS[line] ?? LOB_FIELDS.HO;
  const seen = new Set<string>();
  const out: CustomFieldDef[] = [];
  for (const field of [...CORE_FIELDS, ...extra]) {
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    out.push(field);
  }
  return out;
}

export function defaultLayoutForLine(_line?: string): FieldLayout {
  const { left, right } = essentialSections();
  return {
    columns: [
      { id: "left", sections: left },
      { id: "right", sections: right },
    ],
  };
}

export function catalogForLines(lines: readonly string[]): CustomFieldDef[] {
  const seen = new Set<string>();
  const out: CustomFieldDef[] = [];
  for (const line of lines) {
    for (const field of defaultFieldsForLine(line)) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      out.push(field);
    }
  }
  return out;
}

export const DEAL_LAYOUT_LINES: LineOfBusiness[] = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "GL",
  "BOP",
  "LIFE",
  "HEALTH",
  "RV",
  "WC",
];
