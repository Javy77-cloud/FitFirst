import type { ShopLine } from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { APPLICANT_CORE_FIELDS, type QuoteFieldDef } from "./applicant-core";
import type { SheetProduct } from "./products";
import {
  AOP_DEDUCTIBLE_OPTIONS,
  CONSTRUCTION_OPTIONS,
  EXTERIOR_OPTIONS,
  FOUNDATION_OPTIONS,
  HURRICANE_DEDUCTIBLE_OPTIONS,
  DISTANCE_TO_HYDRANT_OPTIONS,
  DISTANCE_TO_STATION_OPTIONS,
  MONTHS_OCCUPIED_OPTIONS,
  USAGE_OPTIONS,
  WIND_HAIL_DEDUCTIBLE_OPTIONS,
  YES_NO_OPTIONS,
  applyMasterSheetDefaults,
} from "./sheet-defaults";

export type { QuoteFieldDef } from "./applicant-core";
export { APPLICANT_CORE_FIELDS } from "./applicant-core";

const HO_LL = ["homeowners", "landlord"] as const;
const RENT = ["renters"] as const;
const LL = ["landlord"] as const;

export const HOME_FIELDS: QuoteFieldDef[] = [
  { key: "address1", label: "Property address", group: "Property", extractKey: "address" },
  { key: "city", label: "City", group: "Property", extractKey: "city" },
  { key: "county", label: "County", group: "Property", extractKey: "county" },
  { key: "state", label: "State", group: "Property", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", extractKey: "zip" },
  { key: "mailing_address", label: "Mailing address", group: "Property", extractKey: "mailing_address" },
  { key: "legal_description", label: "Legal description", group: "Property" },
  { key: "parcel_id", label: "Parcel ID", group: "Property" },
  { key: "assessed_value", label: "Assessed value", group: "Property", input: "number" },
  { key: "land_value", label: "Land value", group: "Property", input: "number" },
  { key: "improvement_value", label: "Improvement value", group: "Property", input: "number" },
  { key: "sale_price", label: "Sale price", group: "Property", input: "number" },
  { key: "assessment_year", label: "Assessment year", group: "Property", input: "number" },
  { key: "homestead", label: "Homestead", group: "Property" },
  { key: "zoning", label: "Zoning", group: "Property" },
  { key: "land_use", label: "Land use", group: "Property" },
  { key: "records_check", label: "Records check", group: "Property", input: "textarea" },
  { key: "subdivision", label: "Subdivision", group: "Property" },
  { key: "year_purchased", label: "Year purchased", group: "Property", input: "number" },
  { key: "occupancy", label: "Occupancy", group: "Property", extractKey: "occupancy" },
  { key: "usage", label: "Usage", group: "Property", input: "select", options: [...USAGE_OPTIONS], extractKey: "usage" },
  { key: "months_occupied", label: "Months occupied", group: "Property", input: "select", options: [...MONTHS_OCCUPIED_OPTIONS], extractKey: "months_occupied" },
  { key: "number_of_families", label: "Number of families", group: "Property", input: "number" },
  { key: "year_built", label: "Year built", group: "Dwelling", input: "number", extractKey: "year_built", products: [...HO_LL] },
  { key: "year_effective", label: "Effective year", group: "Dwelling", input: "number", products: [...HO_LL] },
  { key: "stories", label: "Stories", group: "Dwelling", input: "number", extractKey: "stories", products: [...HO_LL] },
  { key: "square_feet", label: "Square footage", group: "Dwelling", input: "number", extractKey: "square_feet", products: [...HO_LL] },
  { key: "beds", label: "Bedrooms", group: "Dwelling", input: "number", extractKey: "beds" },
  { key: "baths", label: "Bathrooms", group: "Dwelling", input: "number", extractKey: "baths" },
  { key: "construction", label: "Construction", group: "Dwelling", input: "select", options: [...CONSTRUCTION_OPTIONS], extractKey: "construction", products: [...HO_LL] },
  { key: "exterior", label: "Exterior", group: "Dwelling", input: "select", options: [...EXTERIOR_OPTIONS], extractKey: "exterior", products: [...HO_LL] },
  { key: "foundation", label: "Foundation", group: "Dwelling", input: "select", options: [...FOUNDATION_OPTIONS], products: [...HO_LL] },
  { key: "living_units", label: "Living units", group: "Dwelling", input: "number", products: [...HO_LL] },
  { key: "basement", label: "Basement", group: "Dwelling", input: "select", options: [...YES_NO_OPTIONS], products: [...HO_LL] },
  { key: "garage_type", label: "Garage", group: "Dwelling", extractKey: "garage", products: [...HO_LL] },
  { key: "carport", label: "Carport", group: "Dwelling", input: "select", options: [...YES_NO_OPTIONS], products: [...HO_LL] },
  { key: "roof_year", label: "Roof year", group: "Roof / wind", input: "number", extractKey: "roof_year", products: [...HO_LL] },
  { key: "roof_covering", label: "Roof covering", group: "Roof / wind", extractKey: "roof_covering", products: [...HO_LL] },
  { key: "roof_shape", label: "Roof shape", group: "Roof / wind", extractKey: "roof_shape", products: [...HO_LL] },
  { key: "roof_deck", label: "Roof deck", group: "Roof / wind", extractKey: "roof_deck", products: [...HO_LL] },
  { key: "roof_deck_attachment", label: "Roof deck attachment", group: "Roof / wind", extractKey: "roof_deck_attachment", products: [...HO_LL] },
  { key: "roof_to_wall", label: "Roof-to-wall connection", group: "Roof / wind", extractKey: "roof_to_wall", products: [...HO_LL] },
  {
    key: "opening_protection",
    label: "Opening protection",
    group: "Roof / wind",
    extractKey: "opening_protection",
    products: [...HO_LL],
  },
  { key: "secondary_water", label: "Secondary water resistance", group: "Roof / wind", extractKey: "swr", products: [...HO_LL] },
  { key: "terrain", label: "Terrain", group: "Roof / wind", extractKey: "terrain", products: [...HO_LL] },
  { key: "wind_speed", label: "Design wind speed", group: "Roof / wind", extractKey: "wind_speed", products: [...HO_LL] },
  { key: "wind_mit_form", label: "Wind mit form", group: "Roof / wind", extractKey: "wind_mit_form", products: [...HO_LL] },
  { key: "wind_mit_date", label: "Wind mit date", group: "Roof / wind", extractKey: "wind_mit_date", products: [...HO_LL] },
  { key: "wind_mit_inspector", label: "Wind mit inspector", group: "Roof / wind", extractKey: "wind_mit_inspector", products: [...HO_LL] },
  { key: "building_code", label: "Building code", group: "Roof / wind", extractKey: "building_code", products: [...HO_LL] },
  { key: "inspection_company", label: "Inspection company", group: "Roof / wind", extractKey: "inspection_company", products: [...HO_LL] },
  { key: "license_or_certificate_number", label: "License or certificate #", group: "Roof / wind", extractKey: "license_or_certificate_number", products: [...HO_LL] },
  { key: "date_inspected", label: "Date inspected", group: "4-point", extractKey: "date_inspected", products: [...HO_LL] },
  {
    key: "protection_class",
    label: "Protection class",
    group: "Protection",
    extractKey: "protection_class",
  },
  { key: "fire_district", label: "Fire district", group: "Protection" },
  { key: "hydrant", label: "Distance to hydrant", group: "Protection", input: "select", options: [...DISTANCE_TO_HYDRANT_OPTIONS] },
  { key: "miles_to_fire_station", label: "Distance to station", group: "Protection", input: "select", options: [...DISTANCE_TO_STATION_OPTIONS] },
  { key: "central_alarm", label: "Central alarm", group: "Protection", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "sprinkler", label: "Sprinkler", group: "Protection", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "smoke_detectors", label: "Smoke detectors", group: "Protection", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "deadbolts", label: "Deadbolts", group: "Protection", input: "select", options: [...YES_NO_OPTIONS], extractKey: "deadbolts" },
  {
    key: "miles_to_coast",
    label: "Miles to coast",
    group: "Coastal / flood",
    input: "number",
    extractKey: "miles_to_coast",
  },
  { key: "flood_zone", label: "Flood zone", group: "Coastal / flood", extractKey: "flood_zone" },
  { key: "firm_panel", label: "FIRM panel", group: "Coastal / flood" },
  { key: "firm_effective_date", label: "FIRM effective date", group: "Coastal / flood" },
  { key: "bfe", label: "Base flood elevation", group: "Coastal / flood", input: "number" },
  { key: "flood_policy", label: "Flood policy in force", group: "Coastal / flood" },
  { key: "elevation", label: "Elevation", group: "Coastal / flood" },
  { key: "pool", label: "Pool", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS], extractKey: "pool" },
  { key: "pool_fence", label: "Pool fence", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "trampoline", label: "Trampoline", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "animals", label: "Animals", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "dog_breed", label: "Dog breed", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "business_on_premises", label: "Business on premises", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "mobile_home", label: "Mobile / manufactured", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS], extractKey: "mobile_home", products: [...HO_LL] },
  { key: "acres", label: "Acres", group: "Hazards", input: "number" },
  { key: "four_point_date", label: "4-point date", group: "4-point", extractKey: "four_point_date", products: [...HO_LL] },
  { key: "four_point_result", label: "4-point result", group: "4-point", extractKey: "four_point_result", products: [...HO_LL] },
  { key: "plumbing_year", label: "Plumbing year", group: "4-point", input: "number", extractKey: "plumbing_year", products: [...HO_LL] },
  { key: "electrical_year", label: "Electrical year", group: "4-point", input: "number", extractKey: "electrical_year", products: [...HO_LL] },
  { key: "electrical_updated", label: "Electrical last updated", group: "4-point", input: "number", extractKey: "electrical_updated", products: [...HO_LL] },
  { key: "electrical_circuit_amps", label: "Electrical Circuit Amps", group: "4-point", input: "number", extractKey: "electrical_circuit_amps", products: [...HO_LL] },
  { key: "water_heater_year", label: "Water heater year", group: "4-point", input: "number", extractKey: "water_heater_year", products: [...HO_LL] },
  { key: "hvac_year", label: "HVAC year", group: "4-point", input: "number", extractKey: "hvac_year", products: [...HO_LL] },
  { key: "roof_condition", label: "Roof condition (4-point)", group: "4-point", products: [...HO_LL] },
  { key: "coverage_a", label: "Coverage A (dwelling)", group: "Coverages", input: "number", extractKey: "coverage_a", products: [...HO_LL] },
  { key: "coverage_b", label: "Coverage B (other structures)", group: "Coverages", input: "number", extractKey: "coverage_b", products: [...HO_LL] },
  { key: "coverage_c", label: "Coverage C (contents)", group: "Coverages", input: "number", extractKey: "coverage_c" },
  { key: "coverage_d", label: "Coverage D (loss of use)", group: "Coverages", input: "number", extractKey: "coverage_d" },
  { key: "coverage_e", label: "Coverage E (liability)", group: "Coverages", input: "number", extractKey: "coverage_e" },
  { key: "coverage_f", label: "Coverage F (medical payments)", group: "Coverages", input: "number", extractKey: "coverage_f" },
  { key: "ordinance_or_law", label: "Ordinance or law", group: "Coverages", extractKey: "ordinance_or_law" },
  { key: "water_backup", label: "Water backup", group: "Coverages", extractKey: "water_backup" },
  { key: "scheduled_personal", label: "Scheduled personal property", group: "Coverages", extractKey: "scheduled_personal_property" },
  { key: "jewelry_limit", label: "Jewelry limit", group: "Coverages" },
  { key: "identity_theft", label: "Identity theft", group: "Coverages" },
  { key: "loss_assessment", label: "Loss assessment", group: "Coverages", extractKey: "loss_assessment" },
  {
    key: "hurricane_deductible",
    label: "Hurricane deductible",
    group: "Coverages",
    input: "select",
    options: [...HURRICANE_DEDUCTIBLE_OPTIONS],
    extractKey: "hurricane_deductible",
  },
  { key: "aop_deductible", label: "AOP deductible", group: "Coverages", input: "select", options: [...AOP_DEDUCTIBLE_OPTIONS], extractKey: "aop_deductible" },
  {
    key: "wind_hail_deductible",
    label: "Wind / hail deductible",
    group: "Coverages",
    input: "select",
    options: [...WIND_HAIL_DEDUCTIBLE_OPTIONS],
    extractKey: "wind_hail_deductible",
  },
  { key: "sinkhole_deductible", label: "Sinkhole deductible", group: "Coverages" },
  {
    key: "replacement_cost_estimate",
    label: "RCE / MSB (not Zillow)",
    group: "Coverages",
    input: "number",
    extractKey: "replacement_cost_estimate",
    products: [...HO_LL],
  },
  { key: "rce_source", label: "RCE source", group: "Coverages", products: [...HO_LL] },
  { key: "named_insured", label: "Named insured (from dec)", group: "Current policy", extractKey: "named_insured" },
  { key: "current_policy_named_insured", label: "Name insured (policy)", group: "Current policy", extractKey: "current_policy_named_insured" },
  {
    key: "secondary_named_insured",
    label: "Additional named insured (from dec)",
    group: "Current policy",
    extractKey: "secondary_named_insured",
  },
  { key: "current_carrier", label: "Current carrier", group: "Current policy", extractKey: "current_carrier" },
  { key: "policy_number", label: "Policy number", group: "Current policy", extractKey: "policy_number" },
  { key: "form", label: "Form", group: "Current policy", extractKey: "form" },
  { key: "current_premium", label: "Current premium", group: "Current policy", input: "number", extractKey: "current_premium" },
  { key: "effective_date", label: "Effective date", group: "Current policy", extractKey: "effective_date" },
  { key: "expiration_date", label: "Expiration date", group: "Current policy", extractKey: "expiration_date" },
  { key: "years_with_carrier", label: "Years with carrier", group: "Current policy", input: "number" },
  { key: "claims_5yr", label: "Claims last 5 years", group: "Current policy", input: "number" },
  { key: "mortgagee_name", label: "Mortgagee", group: "Mortgagee", extractKey: "mortgagee" },
  { key: "mortgagee_address", label: "Mortgagee address", group: "Mortgagee", extractKey: "mortgagee_address" },
  { key: "loan_number", label: "Loan number", group: "Mortgagee", extractKey: "loan_number" },
  { key: "tenant_name", label: "Tenant name", group: "Landlord", products: [...LL] },
  { key: "lease_term", label: "Lease term", group: "Landlord", products: [...LL] },
  { key: "landlord_liability", label: "Landlord liability", group: "Landlord", products: [...LL] },
  { key: "loss_of_rents", label: "Loss of rents", group: "Landlord", products: [...LL] },
  { key: "contents_limit", label: "Contents limit", group: "Renters", input: "number", products: [...RENT] },
  { key: "renters_liability", label: "Renters liability", group: "Renters", products: [...RENT] },
  { key: "additional_living", label: "Additional living expense", group: "Renters", products: [...RENT] },
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
  { key: "vehicle_2_vin", label: "Vehicle 2 VIN", group: "Vehicle" },
  { key: "vehicle_2_year", label: "Vehicle 2 year", group: "Vehicle", input: "number" },
  { key: "vehicle_2_make", label: "Vehicle 2 make", group: "Vehicle" },
  { key: "vehicle_2_model", label: "Vehicle 2 model", group: "Vehicle" },
  { key: "driver_1_name", label: "Driver 1 name", group: "Drivers" },
  { key: "driver_1_dob", label: "Driver 1 DOB", group: "Drivers" },
  { key: "driver_1_license", label: "Driver 1 license", group: "Drivers" },
  { key: "driver_1_status", label: "Driver 1 status", group: "Drivers" },
  { key: "driver_1_years_licensed", label: "Driver 1 years licensed", group: "Drivers", input: "number" },
  { key: "driver_2_name", label: "Driver 2 name", group: "Drivers" },
  { key: "driver_2_dob", label: "Driver 2 DOB", group: "Drivers" },
  { key: "driver_2_license", label: "Driver 2 license", group: "Drivers" },
  { key: "accidents_3yr", label: "Accidents last 3 years", group: "Drivers", input: "number" },
  { key: "violations_3yr", label: "Violations last 3 years", group: "Drivers", input: "number" },
  { key: "liability_bi", label: "BI limits", group: "Coverages" },
  { key: "liability_pd", label: "PD limit", group: "Coverages" },
  { key: "um_uim", label: "UM / UIM", group: "Coverages" },
  { key: "pip", label: "PIP", group: "Coverages" },
  { key: "comp_deductible", label: "Comp deductible", group: "Coverages" },
  { key: "collision_deductible", label: "Collision deductible", group: "Coverages" },
  { key: "motorcycle_cc", label: "Engine CC", group: "Motorcycle", products: ["motorcycle"] },
  { key: "motorcycle_type", label: "Motorcycle type", group: "Motorcycle", products: ["motorcycle"] },
  { key: "endorsed_rider", label: "Endorsed rider", group: "Motorcycle", products: ["motorcycle"] },
  { key: "radius", label: "Radius", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "gvw", label: "GVW", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "vehicle_class", label: "Vehicle class", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "fleet_size", label: "Fleet size", group: "Commercial auto", input: "number", products: ["commercial_auto"] },
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
  { key: "length_feet", label: "Length (ft)", group: "Unit", input: "number" },
  { key: "slideouts", label: "Slide-outs", group: "Unit" },
  { key: "full_timer", label: "Full-timer", group: "Unit" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const FLOOD_FIELDS: QuoteFieldDef[] = [
  { key: "flood_zone", label: "Flood zone", group: "Flood", extractKey: "flood_zone" },
  { key: "community_number", label: "NFIP community number", group: "Flood" },
  { key: "elevation", label: "Elevation", group: "Flood" },
  { key: "bfe", label: "Base flood elevation", group: "Flood" },
  { key: "foundation", label: "Foundation", group: "Flood" },
  { key: "flood_vents", label: "Flood vents", group: "Flood" },
  { key: "lowest_floor", label: "Lowest floor", group: "Flood" },
  { key: "nfip_policy", label: "NFIP policy number", group: "Flood" },
  { key: "building_limit", label: "Building limit", group: "Coverages", input: "number" },
  { key: "contents_limit", label: "Contents limit", group: "Coverages", input: "number" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const UMBRELLA_FIELDS: QuoteFieldDef[] = [
  { key: "limit", label: "Umbrella limit", group: "Coverages" },
  { key: "underlying_home", label: "Underlying home", group: "Underlying" },
  { key: "underlying_auto", label: "Underlying auto", group: "Underlying" },
  { key: "um_uim", label: "UM / UIM", group: "Underlying" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const LIFE_FIELDS: QuoteFieldDef[] = [
  { key: "face_amount", label: "Face amount", group: "CRM" },
  { key: "product_type", label: "Product type", group: "CRM" },
  { key: "notes", label: "Life notes (CRM only — no rating)", group: "CRM", input: "textarea" },
];

export const HEALTH_FIELDS: QuoteFieldDef[] = [
  { key: "plan_type", label: "Plan type", group: "CRM" },
  { key: "members", label: "Members", group: "CRM", input: "number" },
  { key: "notes", label: "Health notes (CRM only — no rating)", group: "CRM", input: "textarea" },
];

export const WC_FIELDS: QuoteFieldDef[] = [
  { key: "class_code", label: "Class code", group: "Payroll by class" },
  { key: "payroll", label: "Payroll", group: "Payroll by class", input: "number" },
  { key: "class_code_2", label: "Class code 2", group: "Payroll by class" },
  { key: "payroll_2", label: "Payroll 2", group: "Payroll by class", input: "number" },
  { key: "class_code_3", label: "Class code 3", group: "Payroll by class" },
  { key: "payroll_3", label: "Payroll 3", group: "Payroll by class", input: "number" },
  { key: "employees", label: "Employees", group: "Risk", input: "number" },
  { key: "officers", label: "Officers included", group: "Risk" },
  { key: "experience_mod", label: "Experience mod", group: "Risk" },
  { key: "states", label: "States", group: "Risk" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "notes", label: "Notes", group: "Notes", input: "textarea" },
];

export const GL_FIELDS: QuoteFieldDef[] = [
  { key: "occupancy", label: "Occupancy / operations", group: "Risk" },
  { key: "class_code", label: "Class code", group: "Class codes" },
  { key: "class_code_2", label: "Class code 2", group: "Class codes" },
  { key: "class_code_3", label: "Class code 3", group: "Class codes" },
  { key: "payroll", label: "Payroll", group: "Class codes", input: "number" },
  { key: "annual_sales", label: "Annual sales", group: "Risk", input: "number" },
  { key: "employees", label: "Employees", group: "Risk", input: "number" },
  { key: "years_in_business", label: "Years in business", group: "Risk", input: "number" },
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

function dedupeFields(fields: QuoteFieldDef[]): QuoteFieldDef[] {
  const seen = new Set<string>();
  const out: QuoteFieldDef[] = [];
  for (const field of fields) {
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    out.push(field);
  }
  return out;
}

export function fieldsForLine(line: ShopLine, product?: SheetProduct): QuoteFieldDef[] {
  const raw = dedupeFields([...APPLICANT_CORE_FIELDS, ...(CATALOG[line] ?? [])]);
  if (!product) return raw;
  return raw.filter((field) => !field.products || field.products.includes(product));
}

export function emptySheetValues(
  line: ShopLine,
  product?: SheetProduct,
): Record<string, QuoteSheetFieldValue> {
  const values: Record<string, QuoteSheetFieldValue> = {};
  for (const field of fieldsForLine(line, product)) {
    values[field.key] = { value: "", status: "missing", source: "blank" };
  }
  return values;
}

/** New blank master sheet with protection/hazard starters (empty-only defaults). */
export function blankSheetWithDefaults(
  line: ShopLine,
  product?: SheetProduct,
): Record<string, QuoteSheetFieldValue> {
  return applyMasterSheetDefaults(emptySheetValues(line, product)).values;
}

const EXTRACT_ALIASES: Record<string, string> = {
  wind_hail_deductible: "wind_hail_deductible",
  wind_deductible: "wind_hail_deductible",
  address: "address",
  swr: "secondary_water",
  garage: "garage_type",
  roof_material: "roof_covering",
  construction_type: "construction",
  living_area: "square_feet",
  square_footage: "square_feet",
  design_wind_speed: "wind_speed",
  date_inspected: "date_inspected",
  four_point_date: "four_point_date",
  exterior_wall: "exterior",
  foundation_type: "foundation",
  current_carrier: "current_carrier",
  mortgagee_address: "mortgagee_address",
  secondary_named_insured: "secondary_named_insured",
  scheduled_personal_property: "scheduled_personal",
  mortgagee: "mortgagee_name",
};

export function extractKeyToSheetKey(line: ShopLine, extractKey: string): string | null {
  const aliased = EXTRACT_ALIASES[extractKey] ?? extractKey;
  const fields = fieldsForLine(line);
  const exact = fields.find((field) => field.key === extractKey || field.key === aliased);
  if (exact) return exact.key;
  const match = fields.find(
    (field) => field.extractKey === extractKey || field.extractKey === aliased,
  );
  return match?.key ?? null;
}

export function groupFields(
  line: ShopLine,
  product?: SheetProduct,
): { group: string; fields: QuoteFieldDef[] }[] {
  const groups: { group: string; fields: QuoteFieldDef[] }[] = [];
  for (const field of fieldsForLine(line, product)) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return groups;
}

export function homeFieldCount(): number {
  return fieldsForLine("home", "homeowners").length;
}
