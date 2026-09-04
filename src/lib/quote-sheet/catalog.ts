import type { ShopLine } from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

export type QuoteFieldDef = {
  key: string;
  label: string;
  group: string;
  input?: "text" | "number" | "textarea";
  /** Maps an extraction fieldKey onto this sheet key. */
  extractKey?: string;
};

export const HOME_FIELDS: QuoteFieldDef[] = [
  { key: "address1", label: "Property address", group: "Property", extractKey: "address" },
  { key: "city", label: "City", group: "Property", extractKey: "city" },
  { key: "county", label: "County", group: "Property", extractKey: "county" },
  { key: "state", label: "State", group: "Property", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", extractKey: "zip" },
  { key: "year_built", label: "Year built", group: "Dwelling", input: "number", extractKey: "year_built" },
  { key: "stories", label: "Stories", group: "Dwelling", input: "number", extractKey: "stories" },
  { key: "square_feet", label: "Square feet", group: "Dwelling", input: "number", extractKey: "square_feet" },
  { key: "construction", label: "Construction", group: "Dwelling", extractKey: "construction" },
  { key: "occupancy", label: "Occupancy", group: "Dwelling", extractKey: "occupancy" },
  { key: "roof_year", label: "Roof year", group: "Roof / wind", input: "number", extractKey: "roof_year" },
  { key: "roof_covering", label: "Roof covering", group: "Roof / wind", extractKey: "roof_covering" },
  { key: "roof_shape", label: "Roof shape", group: "Roof / wind", extractKey: "roof_shape" },
  {
    key: "opening_protection",
    label: "Opening protection",
    group: "Roof / wind",
    extractKey: "opening_protection",
  },
  {
    key: "protection_class",
    label: "Protection class",
    group: "Roof / wind",
    extractKey: "protection_class",
  },
  {
    key: "miles_to_coast",
    label: "Miles to coast",
    group: "Roof / wind",
    input: "number",
    extractKey: "miles_to_coast",
  },
  { key: "pool", label: "Pool", group: "Roof / wind", extractKey: "pool" },
  { key: "mobile_home", label: "Mobile / manufactured", group: "Roof / wind", extractKey: "mobile_home" },
  { key: "coverage_a", label: "Coverage A (dwelling)", group: "Coverages", input: "number", extractKey: "coverage_a" },
  { key: "coverage_b", label: "Coverage B (other structures)", group: "Coverages", input: "number", extractKey: "coverage_b" },
  { key: "coverage_c", label: "Coverage C (contents)", group: "Coverages", input: "number", extractKey: "coverage_c" },
  { key: "coverage_d", label: "Coverage D (loss of use)", group: "Coverages", input: "number", extractKey: "coverage_d" },
  { key: "coverage_e", label: "Coverage E (liability)", group: "Coverages", input: "number", extractKey: "coverage_e" },
  { key: "coverage_f", label: "Coverage F (medical payments)", group: "Coverages", input: "number", extractKey: "coverage_f" },
  {
    key: "hurricane_deductible",
    label: "Hurricane deductible",
    group: "Coverages",
    extractKey: "hurricane_deductible",
  },
  {
    key: "aop_deductible",
    label: "AOP deductible",
    group: "Coverages",
    extractKey: "aop_deductible",
  },
  {
    key: "wind_hail_deductible",
    label: "Wind / hail deductible",
    group: "Coverages",
    extractKey: "wind_deductible",
  },
  {
    key: "replacement_cost_estimate",
    label: "RCE / MSB (not Zillow)",
    group: "Coverages",
    input: "number",
    extractKey: "replacement_cost_estimate",
  },
  {
    key: "named_insured",
    label: "Named insured (from dec)",
    group: "Current policy",
    extractKey: "named_insured",
  },
  {
    key: "secondary_named_insured",
    label: "Additional named insured (from dec)",
    group: "Current policy",
    extractKey: "secondary_named_insured",
  },
  {
    key: "mailing_address",
    label: "Mailing address",
    group: "Property",
    extractKey: "mailing_address",
  },
  {
    key: "ordinance_or_law",
    label: "Ordinance or law",
    group: "Coverages",
    extractKey: "ordinance_or_law",
  },
  {
    key: "water_backup",
    label: "Water backup",
    group: "Coverages",
    extractKey: "water_backup",
  },
  { key: "current_carrier", label: "Current carrier", group: "Current policy", extractKey: "current_carrier" },
  { key: "policy_number", label: "Policy number", group: "Current policy", extractKey: "policy_number" },
  { key: "form", label: "Form", group: "Current policy", extractKey: "form" },
  { key: "current_premium", label: "Current premium", group: "Current policy", input: "number", extractKey: "current_premium" },
  { key: "effective_date", label: "Effective date", group: "Current policy", extractKey: "effective_date" },
  { key: "expiration_date", label: "Expiration date", group: "Current policy", extractKey: "expiration_date" },
  { key: "four_point_date", label: "4-point date", group: "Inspections", extractKey: "four_point_date" },
  { key: "four_point_result", label: "4-point result", group: "Inspections", extractKey: "four_point_result" },
  { key: "wind_mit_form", label: "Wind mit form", group: "Inspections", extractKey: "wind_mit_form" },
  { key: "notes", label: "Shop notes", group: "Notes", input: "textarea" },
];

export const AUTO_FIELDS: QuoteFieldDef[] = [
  { key: "vin", label: "VIN", group: "Vehicle" },
  { key: "vehicle_year", label: "Year", group: "Vehicle", input: "number" },
  { key: "vehicle_make", label: "Make", group: "Vehicle" },
  { key: "vehicle_model", label: "Model", group: "Vehicle" },
  { key: "vehicle_usage", label: "Usage", group: "Vehicle" },
  { key: "garaging_zip", label: "Garaging ZIP", group: "Vehicle" },
  { key: "garaging_address", label: "Garaging address", group: "Vehicle" },
  { key: "liability_bi", label: "BI limits", group: "Coverages" },
  { key: "liability_pd", label: "PD limit", group: "Coverages" },
  { key: "um_uim", label: "UM / UIM", group: "Coverages" },
  { key: "pip", label: "PIP", group: "Coverages" },
  { key: "comp_deductible", label: "Comp deductible", group: "Coverages" },
  { key: "collision_deductible", label: "Collision deductible", group: "Coverages" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy", extractKey: "current_carrier" },
  { key: "current_premium", label: "Current premium", group: "Current policy", input: "number" },
  { key: "notes", label: "Shop notes", group: "Notes", input: "textarea" },
];

export const REC_RV_FIELDS: QuoteFieldDef[] = [
  { key: "unit_year", label: "Year", group: "Unit", input: "number" },
  { key: "make", label: "Make", group: "Unit" },
  { key: "model", label: "Model", group: "Unit" },
  { key: "vin", label: "VIN / HIN", group: "Unit" },
  { key: "value", label: "Value", group: "Unit", input: "number" },
  { key: "usage", label: "Usage", group: "Unit" },
  { key: "storage", label: "Storage", group: "Unit" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const FLOOD_FIELDS: QuoteFieldDef[] = [
  { key: "flood_zone", label: "Flood zone", group: "Risk" },
  { key: "elevation", label: "Elevation", group: "Risk" },
  { key: "building_limit", label: "Building limit", group: "Coverages", input: "number" },
  { key: "contents_limit", label: "Contents limit", group: "Coverages", input: "number" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const UMBRELLA_FIELDS: QuoteFieldDef[] = [
  { key: "limit", label: "Umbrella limit", group: "Coverages" },
  { key: "underlying_home", label: "Underlying home", group: "Underlying" },
  { key: "underlying_auto", label: "Underlying auto", group: "Underlying" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const LIFE_FIELDS: QuoteFieldDef[] = [
  { key: "notes", label: "Life notes (CRM only — no rating)", group: "CRM", input: "textarea" },
];

export const HEALTH_FIELDS: QuoteFieldDef[] = [
  { key: "notes", label: "Health notes (CRM only — no rating)", group: "CRM", input: "textarea" },
];

export const WC_FIELDS: QuoteFieldDef[] = [
  { key: "class_code", label: "Class code", group: "Risk" },
  { key: "payroll", label: "Payroll", group: "Risk", input: "number" },
  { key: "employees", label: "Employees", group: "Risk", input: "number" },
  { key: "experience_mod", label: "Experience mod", group: "Risk" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const GL_FIELDS: QuoteFieldDef[] = [
  { key: "occupancy", label: "Occupancy / operations", group: "Risk" },
  { key: "limit", label: "Limit", group: "Coverages" },
  { key: "deductible", label: "Deductible", group: "Coverages" },
  { key: "operations", label: "Operations", group: "Risk" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

const CATALOG: Record<ShopLine, QuoteFieldDef[]> = {
  home: HOME_FIELDS,
  auto: AUTO_FIELDS,
  rec_rv: REC_RV_FIELDS,
  flood: FLOOD_FIELDS,
  umbrella: UMBRELLA_FIELDS,
  life: LIFE_FIELDS,
  health: HEALTH_FIELDS,
  workers_comp: WC_FIELDS,
  general_liability: GL_FIELDS,
};

export function fieldsForLine(line: ShopLine): QuoteFieldDef[] {
  return CATALOG[line] ?? [];
}

export function emptySheetValues(line: ShopLine): Record<string, QuoteSheetFieldValue> {
  const values: Record<string, QuoteSheetFieldValue> = {};
  for (const field of fieldsForLine(line)) {
    values[field.key] = { value: "", status: "missing", source: "blank" };
  }
  return values;
}

const EXTRACT_ALIASES: Record<string, string> = {
  wind_hail_deductible: "wind_deductible",
  address: "address",
};

export function extractKeyToSheetKey(line: ShopLine, extractKey: string): string | null {
  const aliased = EXTRACT_ALIASES[extractKey] ?? extractKey;
  const match = fieldsForLine(line).find(
    (field) =>
      field.extractKey === extractKey ||
      field.extractKey === aliased ||
      field.key === extractKey ||
      field.key === aliased,
  );
  return match?.key ?? null;
}

export function groupFields(line: ShopLine): { group: string; fields: QuoteFieldDef[] }[] {
  const groups: { group: string; fields: QuoteFieldDef[] }[] = [];
  for (const field of fieldsForLine(line)) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return groups;
}
