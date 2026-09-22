import type { ShopLine } from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  APPLICANT_CORE_FIELDS,
  CO_APPLICANT_FIELDS,
  GENDER_OPTIONS,
  OCCUPATION_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  RELATIONSHIP_TO_INSURED_OPTIONS,
  type QuoteFieldDef,
} from "./applicant-core";
import type { SheetProduct } from "./products";
import { isRepeatableSheetKey } from "./repeatable-units";
import {
  AOP_DEDUCTIBLE_OPTIONS,
  COVERAGE_B_OPTIONS,
  COVERAGE_C_OPTIONS,
  COVERAGE_D_OPTIONS,
  COVERAGE_E_OPTIONS,
  COVERAGE_F_OPTIONS,
  ORDINANCE_OR_LAW_OPTIONS,
  CONSTRUCTION_OPTIONS,
  EXTERIOR_OPTIONS,
  FOUNDATION_OPTIONS,
  HURRICANE_DEDUCTIBLE_OPTIONS,
  DISTANCE_TO_HYDRANT_OPTIONS,
  DISTANCE_TO_STATION_OPTIONS,
  MONTHS_OCCUPIED_OPTIONS,
  OCCUPANCY_OPTIONS,
  OWN_RENT_OPTIONS,
  VEHICLE_OWNERSHIP_OPTIONS,
  VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
  COMMUTE_DAYS_WEEK_OPTIONS,
  VEHICLE_LIENHOLDER_OPTIONS,
  PRIMARY_HEAT_OPTIONS,
  INSURANCE_SCORE_RANGE_OPTIONS,
  WATER_BACKUP_OPTIONS,
  CLAIMS_5YR_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  ROOF_TO_WALL_OPTIONS,
  WIND_SPEED_OPTIONS,
  BUILDING_CODE_OPTIONS,
  ROOF_COVERING_OPTIONS,
  ROOF_SHAPE_OPTIONS,
  ROOF_DECK_ATTACHMENT_OPTIONS,
  OPENING_PROTECTION_OPTIONS,
  TERRAIN_OPTIONS,
  STORIES_OPTIONS,
  PROTECTION_CLASS_OPTIONS,
  BCEG_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  POOL_TYPE_OPTIONS,
  FOUR_POINT_UPDATE_TYPE_OPTIONS,
  ROOF_UPDATE_TYPE_OPTIONS,
  WATER_HEATER_LOCATION_OPTIONS,
  PRIMARY_PLUMBING_OPTIONS,
  USAGE_OPTIONS,
  SCREEN_ENCLOSURE_OPTIONS,
  GARAGE_TYPE_OPTIONS,
  AAA_MEMBER_OPTIONS,
  PASSIVE_RESTRAINT_OPTIONS,
  AUTO_VEHICLE_USAGE_OPTIONS,
  AUTO_CURRENTLY_INSURED_OPTIONS,
  AUTO_ANNUAL_MILES_OPTIONS,
  AUTO_INCIDENT_COUNT_OPTIONS,
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
  AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  AUTO_BI_LIMIT_OPTIONS,
  AUTO_PD_LIMIT_OPTIONS,
  AUTO_UM_UIM_OPTIONS,
  AUTO_PIP_OPTIONS,
  AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS,
  LICENSE_STATUS_OPTIONS,
  FLOOD_OCCUPANCY_USE_OPTIONS,
  FLOOD_BUILDING_TYPE_OPTIONS,
  FLOOD_EFFECTIVE_DATE_TYPE_OPTIONS,
  FLOOD_QUOTE_REASON_OPTIONS,
  FLOOD_DEDUCTIBLE_OPTIONS,
  WIND_HAIL_DEDUCTIBLE_OPTIONS,
  YES_NO_OPTIONS,
  FLOOD_OCCUPANCY_OPTIONS,
  FLOOD_FOUNDATION_OPTIONS,
  LIFE_PRODUCT_TYPE_OPTIONS,
  LIFE_TERM_YEARS_OPTIONS,
  LIFE_PREMIUM_MODE_OPTIONS,
  LIFE_PURPOSE_OPTIONS,
  LIFE_HEIGHT_FT_OPTIONS,
  LIFE_HEIGHT_IN_OPTIONS,
  LIFE_MEDICAL_CONDITION_OPTIONS,
  TOBACCO_STATUS_OPTIONS,
  TOBACCO_TYPE_OPTIONS,
  HEALTH_PLAN_TYPE_OPTIONS,
  HEALTH_METAL_LEVEL_OPTIONS,
  HEALTH_COST_PREF_OPTIONS,
  HEALTH_MEDICAL_CONDITION_OPTIONS,
  HEALTH_QLE_TYPE_OPTIONS,
  HEALTH_DEPENDENT_SLOT_COUNT,
  HOUSEHOLD_SIZE_OPTIONS,
  MEDICARE_COVERAGE_SHOW_VALUES,
  applyMasterSheetDefaults,
  emptyDefaultsForLine,
} from "./sheet-defaults";
import { INDUSTRY_OPTIONS } from "@/lib/custom-fields/industry-occupation";
import { COMMERCIAL_RISK_PROFILE_FIELDS, isCommercialSheetLine } from "./commercial-risk-profile";
import { isInspectionSectionGroup, orderHomeGroups } from "./home-inspections";
import { manufacturedHomeFieldsFor } from "./mho-risk-profile";
import { RECORDS_CHECK_KEY, recordsCheckHiddenOnRiskProfile } from "./records-check";
import { fieldIsVisible, visibleQuoteFields } from "./sheet-visibility";
import type { SheetValueBag } from "./sheet-visibility";

export type { QuoteFieldDef } from "./applicant-core";
export {
  APPLICANT_CORE_FIELDS,
  CO_APPLICANT_FIELDS,
  CO_APPLICANT_RELATIONSHIP_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  RELATIONSHIP_TO_INSURED_OPTIONS,
} from "./applicant-core";

const HO_LL = ["homeowners", "landlord"] as const;
const RENT = ["renters"] as const;
const LL = ["landlord"] as const;

export const HOME_FIELDS: QuoteFieldDef[] = [
  { key: "address1", label: "Property address", group: "Property", extractKey: "address" },
  { key: "city", label: "City", group: "Property", extractKey: "city" },
  { key: "state", label: "State", group: "Property", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", extractKey: "zip" },
  { key: "county", label: "County", group: "Property", extractKey: "county" },
  { key: "mailing_address", label: "Mailing address", group: "Property", extractKey: "mailing_address" },
  { key: "legal_description", label: "Legal description", group: "Property" },
  { key: "parcel_id", label: "Parcel ID", group: "Property" },
  { key: "assessed_value", label: "Assessed value", group: "Property", input: "number" },
  { key: "land_value", label: "Land value", group: "Property", input: "number" },
  { key: "improvement_value", label: "Improvement value", group: "Property", input: "number" },
  { key: "sale_price", label: "Purchase price", group: "Property", input: "number" },
  { key: "assessment_year", label: "Assessment year", group: "Property", input: "number" },
  { key: "homestead", label: "Homestead", group: "Property" },
  { key: "zoning", label: "Zoning", group: "Property" },
  { key: "land_use", label: "Land use", group: "Property" },
  { key: RECORDS_CHECK_KEY, label: "Records check", group: "Property", input: "textarea" },
  { key: "subdivision", label: "Subdivision", group: "Property" },
  { key: "year_purchased", label: "Year purchased", group: "Property", input: "number" },
  {
    key: "new_purchase",
    label: "New purchase?",
    group: "Property",
    input: "select",
    options: [...YES_NO_OPTIONS],
    products: [...HO_LL],
  },
  {
    key: "purchase_date",
    label: "Purchase date",
    group: "Property",
    products: [...HO_LL],
    showWhen: { key: "new_purchase", values: ["yes"] },
  },
  {
    key: "within_city_limits",
    label: "City within city limits",
    group: "Property",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  { key: "occupancy", label: "Occupancy", group: "Property", input: "select", options: [...OCCUPANCY_OPTIONS], extractKey: "occupancy" },
  { key: "usage", label: "Usage", group: "Property", input: "select", options: [...USAGE_OPTIONS], extractKey: "usage" },
  { key: "months_occupied", label: "Months occupied", group: "Property", input: "select", options: [...MONTHS_OCCUPIED_OPTIONS], extractKey: "months_occupied" },
  { key: "resided_under_2_years", label: "Resided at risk address under 2 years?", group: "Property", input: "select", options: [...YES_NO_OPTIONS] },
  {
    key: "prior_residence_address",
    label: "Prior residence address",
    group: "Property",
    showWhen: { key: "resided_under_2_years", values: ["yes"] },
  },
  {
    key: "prior_residence_city",
    label: "Prior residence city",
    group: "Property",
    showWhen: { key: "resided_under_2_years", values: ["yes"] },
  },
  {
    key: "prior_residence_state",
    label: "Prior residence state",
    group: "Property",
    showWhen: { key: "resided_under_2_years", values: ["yes"] },
  },
  {
    key: "prior_residence_zip",
    label: "Prior residence ZIP",
    group: "Property",
    showWhen: { key: "resided_under_2_years", values: ["yes"] },
  },
  { key: "number_of_families", label: "Number of families", group: "Property", input: "number" },
  { key: "year_built", label: "Year built", group: "Dwelling", input: "number", extractKey: "year_built", products: [...HO_LL] },
  { key: "year_effective", label: "Effective year", group: "Dwelling", input: "number", products: [...HO_LL] },
  { key: "structure_type", label: "Structure type", group: "Dwelling", input: "select", options: [...STRUCTURE_TYPE_OPTIONS], products: [...HO_LL] },
  {
    key: "tie_downs",
    label: "Tie-downs",
    group: "Dwelling",
    input: "select",
    options: [...YES_NO_OPTIONS],
    products: [...HO_LL],
    showWhen: { key: "mobile_home", values: ["yes"] },
  },
  {
    key: "hud_label",
    label: "HUD label",
    group: "Dwelling",
    products: [...HO_LL],
    showWhen: { key: "mobile_home", values: ["yes"] },
  },
  {
    key: "mh_make",
    label: "Make (unit)",
    group: "Dwelling",
    products: [...HO_LL],
    showWhen: { key: "mobile_home", values: ["yes"] },
  },
  {
    key: "mh_model",
    label: "Model (unit)",
    group: "Dwelling",
    products: [...HO_LL],
    showWhen: { key: "mobile_home", values: ["yes"] },
  },
  {
    key: "mh_year",
    label: "Year (unit)",
    group: "Dwelling",
    input: "number",
    products: [...HO_LL],
    showWhen: { key: "mobile_home", values: ["yes"] },
  },
  { key: "stories", label: "Stories", group: "Dwelling", input: "select", options: [...STORIES_OPTIONS], extractKey: "stories", products: [...HO_LL] },
  { key: "square_feet", label: "Square footage", group: "Dwelling", input: "number", extractKey: "square_feet", products: [...HO_LL] },
  { key: "beds", label: "Bedrooms", group: "Dwelling", input: "number", extractKey: "beds" },
  { key: "baths", label: "Bathrooms", group: "Dwelling", input: "number", extractKey: "baths" },
  { key: "construction", label: "Construction", group: "Dwelling", input: "select", options: [...CONSTRUCTION_OPTIONS], extractKey: "construction", products: [...HO_LL] },
  { key: "exterior", label: "Exterior", group: "Dwelling", input: "select", options: [...EXTERIOR_OPTIONS], extractKey: "exterior", products: [...HO_LL] },
  { key: "foundation", label: "Foundation", group: "Dwelling", input: "select", options: [...FOUNDATION_OPTIONS], products: [...HO_LL] },
  { key: "living_units", label: "Living units", group: "Dwelling", input: "number", products: [...HO_LL] },
  { key: "basement", label: "Basement", group: "Dwelling", input: "select", options: [...YES_NO_OPTIONS], products: [...HO_LL] },
  { key: "garage_spaces", label: "Garage spaces", group: "Dwelling", input: "number", extractKey: "garage_spaces", products: [...HO_LL] },
  {
    key: "garage_type",
    label: "Garage type",
    group: "Dwelling",
    input: "select",
    options: [...GARAGE_TYPE_OPTIONS],
    extractKey: "garage",
    products: [...HO_LL],
  },
  { key: "carport", label: "Carport", group: "Dwelling", input: "select", options: [...YES_NO_OPTIONS], products: [...HO_LL] },
  { key: "roof_year", label: "Roof year", group: "Wind Mitigation", input: "number", extractKey: "roof_year", products: [...HO_LL] },
  { key: "roof_covering", label: "Roof covering", group: "Wind Mitigation", input: "select", options: [...ROOF_COVERING_OPTIONS], extractKey: "roof_covering", products: [...HO_LL] },
  { key: "roof_shape", label: "Roof shape", group: "Wind Mitigation", input: "select", options: [...ROOF_SHAPE_OPTIONS], extractKey: "roof_shape", products: [...HO_LL] },
  { key: "roof_deck", label: "Roof deck", group: "Wind Mitigation", input: "select", options: [...ROOF_DECK_ATTACHMENT_OPTIONS], extractKey: "roof_deck", products: [...HO_LL] },
  { key: "roof_deck_attachment", label: "Roof deck attachment", group: "Wind Mitigation", input: "select", options: [...ROOF_DECK_ATTACHMENT_OPTIONS], extractKey: "roof_deck_attachment", products: [...HO_LL] },
  { key: "roof_to_wall", label: "Roof-to-wall connection", group: "Wind Mitigation", input: "select", options: [...ROOF_TO_WALL_OPTIONS], extractKey: "roof_to_wall", products: [...HO_LL] },
  {
    key: "opening_protection",
    label: "Opening protection",
    group: "Wind Mitigation",
    input: "select",
    options: [...OPENING_PROTECTION_OPTIONS],
    extractKey: "opening_protection",
    products: [...HO_LL],
  },
  { key: "secondary_water", label: "Secondary water resistance", group: "Wind Mitigation", input: "select", options: [...YES_NO_UNKNOWN_OPTIONS], extractKey: "swr", products: [...HO_LL] },
  { key: "terrain", label: "Terrain", group: "Wind Mitigation", input: "select", options: [...TERRAIN_OPTIONS], extractKey: "terrain", products: [...HO_LL] },
  { key: "wind_speed", label: "Design wind speed", group: "Wind Mitigation", input: "select", options: [...WIND_SPEED_OPTIONS], extractKey: "wind_speed", products: [...HO_LL] },
  { key: "wind_mit_form", label: "Wind mit form", group: "Wind Mitigation", extractKey: "wind_mit_form", products: [...HO_LL] },
  { key: "wind_mit_date", label: "Wind mit date", group: "Wind Mitigation", extractKey: "wind_mit_date", products: [...HO_LL] },
  { key: "wind_mit_inspector", label: "Wind mit inspector", group: "Wind Mitigation", extractKey: "wind_mit_inspector", products: [...HO_LL] },
  { key: "inspection_company", label: "Inspection company", group: "Wind Mitigation", extractKey: "inspection_company", products: [...HO_LL] },
  { key: "license_or_certificate_number", label: "License or certificate #", group: "Wind Mitigation", extractKey: "license_or_certificate_number", products: [...HO_LL] },
  { key: "building_code", label: "Building code", group: "Wind Mitigation", input: "select", options: [...BUILDING_CODE_OPTIONS], extractKey: "building_code", products: [...HO_LL] },
  {
    key: "protection_class",
    label: "Protection class",
    group: "Protection",
    input: "select",
    options: [...PROTECTION_CLASS_OPTIONS],
    extractKey: "protection_class",
  },
  { key: "bceg_grade", label: "BCEG", group: "Protection", input: "select", options: [...BCEG_OPTIONS], extractKey: "bceg_grade" },
  { key: "fire_district", label: "Fire district", group: "Protection" },
  { key: "hydrant", label: "Distance to hydrant", group: "Protection", input: "select", options: [...DISTANCE_TO_HYDRANT_OPTIONS] },
  { key: "miles_to_fire_station", label: "Distance to station", group: "Protection", input: "select", options: [...DISTANCE_TO_STATION_OPTIONS] },
  { key: "central_alarm", label: "Central alarm", group: "Protection", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "fire_alarm", label: "Fire alarm", group: "Protection", input: "select", options: [...YES_NO_OPTIONS], extractKey: "fire_alarm" },
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
  { key: "flood_zone", label: "Flood zone", group: "Coastal / flood", input: "select", options: [...FLOOD_ZONE_OPTIONS], extractKey: "flood_zone" },
  { key: "firm_panel", label: "FIRM panel", group: "Coastal / flood" },
  { key: "firm_effective_date", label: "FIRM effective date", group: "Coastal / flood" },
  { key: "bfe", label: "Base flood elevation", group: "Coastal / flood", input: "number" },
  { key: "flood_policy", label: "Flood policy in force", group: "Coastal / flood" },
  { key: "elevation", label: "Elevation", group: "Coastal / flood" },
  { key: "pool", label: "Pool", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS], extractKey: "pool" },
  { key: "pool_type", label: "Pool type", group: "Hazards", input: "select", options: [...POOL_TYPE_OPTIONS] },
  { key: "pool_fence", label: "Pool fence", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "trampoline", label: "Trampoline", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "animals", label: "Animals", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "dog_breed", label: "Restricted / vicious breed?", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "business_on_premises", label: "Business on premises", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "mobile_home", label: "Mobile / manufactured", group: "Hazards", input: "select", options: [...YES_NO_OPTIONS], extractKey: "mobile_home", products: [...HO_LL] },
  { key: "acres", label: "Acres", group: "Hazards", input: "number" },
  { key: "date_inspected", label: "Date inspected", group: "Four-Point Inspection", extractKey: "date_inspected", products: [...HO_LL] },
  { key: "four_point_date", label: "Four-Point date", group: "Four-Point Inspection", extractKey: "four_point_date", products: [...HO_LL] },
  { key: "four_point_result", label: "Four-Point result", group: "Four-Point Inspection", extractKey: "four_point_result", products: [...HO_LL] },
  { key: "plumbing_year", label: "Plumbing year", group: "Four-Point Inspection", input: "number", extractKey: "plumbing_year", products: [...HO_LL] },
  { key: "electrical_year", label: "Electrical year", group: "Four-Point Inspection", input: "number", extractKey: "electrical_year", products: [...HO_LL] },
  { key: "electrical_updated", label: "Electrical last updated", group: "Four-Point Inspection", input: "number", extractKey: "electrical_updated", products: [...HO_LL] },
  { key: "electrical_update_type", label: "Electrical update type", group: "Four-Point Inspection", input: "select", options: [...FOUR_POINT_UPDATE_TYPE_OPTIONS], products: [...HO_LL] },
  { key: "electrical_circuit_amps", label: "Electrical Circuit Amps", group: "Four-Point Inspection", input: "number", extractKey: "electrical_circuit_amps", products: [...HO_LL] },
  { key: "primary_plumbing_type", label: "Primary plumbing type", group: "Four-Point Inspection", input: "select", options: [...PRIMARY_PLUMBING_OPTIONS], extractKey: "primary_plumbing_type", products: [...HO_LL] },
  { key: "plumbing_update_type", label: "Plumbing update type", group: "Four-Point Inspection", input: "select", options: [...FOUR_POINT_UPDATE_TYPE_OPTIONS], products: [...HO_LL] },
  { key: "water_heater_year", label: "Water heater year", group: "Four-Point Inspection", input: "number", extractKey: "water_heater_year", products: [...HO_LL] },
  { key: "water_heater_location", label: "Water heater location", group: "Four-Point Inspection", input: "select", options: [...WATER_HEATER_LOCATION_OPTIONS], products: [...HO_LL] },
  { key: "primary_heat", label: "Primary heat", group: "Four-Point Inspection", input: "select", options: [...PRIMARY_HEAT_OPTIONS], extractKey: "primary_heat", products: [...HO_LL] },
  { key: "heat_update_type", label: "Heat update type", group: "Four-Point Inspection", input: "select", options: [...FOUR_POINT_UPDATE_TYPE_OPTIONS], products: [...HO_LL] },
  { key: "hvac_year", label: "HVAC year", group: "Four-Point Inspection", input: "number", extractKey: "hvac_year", products: [...HO_LL] },
  { key: "roof_condition", label: "Roof condition (Four-Point)", group: "Four-Point Inspection", products: [...HO_LL] },
  { key: "roof_update_type", label: "Roof update type", group: "Four-Point Inspection", input: "select", options: [...ROOF_UPDATE_TYPE_OPTIONS], products: [...HO_LL] },
  { key: "coverage_a", label: "Coverage A (dwelling)", group: "Coverages", input: "number", extractKey: "coverage_a", products: [...HO_LL] },
  { key: "coverage_b", label: "Coverage B (other structures)", group: "Coverages", input: "text", extractKey: "coverage_b", products: [...HO_LL] },
  { key: "coverage_c", label: "Coverage C (contents)", group: "Coverages", input: "text", extractKey: "coverage_c" },
  { key: "coverage_d", label: "Coverage D (loss of use)", group: "Coverages", input: "text", extractKey: "coverage_d" },
  { key: "coverage_e", label: "Coverage E (liability)", group: "Coverages", input: "text", extractKey: "coverage_e" },
  { key: "coverage_f", label: "Coverage F (medical payments)", group: "Coverages", input: "text", extractKey: "coverage_f" },
  { key: "ordinance_or_law", label: "Ordinance or law", group: "Coverages", input: "select", options: [...ORDINANCE_OR_LAW_OPTIONS], extractKey: "ordinance_or_law" },
  { key: "water_backup", label: "Water backup", group: "Coverages", input: "select", options: [...WATER_BACKUP_OPTIONS], extractKey: "water_backup" },
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
    key: "screen_enclosure",
    label: "Screen enclosure coverage",
    group: "Coverages",
    input: "select",
    options: [...SCREEN_ENCLOSURE_OPTIONS],
    extractKey: "screen_enclosure",
    products: [...HO_LL],
  },
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
    group: "Cost",
    input: "number",
    extractKey: "replacement_cost_estimate",
    products: [...HO_LL],
  },
  { key: "rce_source", label: "RCE source", group: "Cost", products: [...HO_LL] },
  { key: "named_insured", label: "Named insured (from dec)", group: "Current Policy", extractKey: "named_insured" },
  { key: "current_policy_named_insured", label: "Name insured (policy)", group: "Current Policy", extractKey: "current_policy_named_insured" },
  {
    key: "secondary_named_insured",
    label: "Additional named insured (from dec)",
    group: "Current Policy",
    extractKey: "secondary_named_insured",
  },
  { key: "current_carrier", label: "Current carrier", group: "Current Policy", extractKey: "current_carrier" },
  { key: "policy_number", label: "Policy number", group: "Current Policy", extractKey: "policy_number" },
  { key: "current_premium", label: "Current premium", group: "Current Policy", input: "number", extractKey: "current_premium" },
  { key: "effective_date", label: "Effective date", group: "Current Policy", extractKey: "effective_date" },
  { key: "expiration_date", label: "Expiration date", group: "Current Policy", extractKey: "expiration_date" },
  { key: "years_with_carrier", label: "Years with carrier", group: "Current Policy", input: "number" },
  { key: "claims_5yr", label: "Claims last 5 years", group: "Current Policy", input: "select", options: [...CLAIMS_5YR_OPTIONS] },
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
  {
    key: "insurance_score_range",
    label: "Insurance score range",
    group: "Authorizations",
    input: "select",
    options: [...INSURANCE_SCORE_RANGE_OPTIONS],
  },
  { key: "notes", label: "Shop notes", group: "Notes", input: "textarea" },
];

export const AUTO_FIELDS: QuoteFieldDef[] = [
  {
    key: "own_rent",
    label: "Own / Rent",
    group: "Residence",
    input: "select",
    options: [...OWN_RENT_OPTIONS],
  },
  {
    key: "years_at_address",
    label: "Years at address",
    group: "Residence",
    input: "number",
  },
  {
    key: "address_same_6_months",
    label: "Same address 6+ months?",
    group: "Residence",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "prior_address",
    label: "Prior address (if No)",
    group: "Residence",
  },
  { key: "vin", label: "VIN", group: "Vehicle" },
  { key: "vehicle_year", label: "Year", group: "Vehicle", input: "number" },
  { key: "vehicle_make", label: "Make", group: "Vehicle" },
  { key: "vehicle_model", label: "Model", group: "Vehicle" },
  { key: "vehicle_body_class", label: "Body class", group: "Vehicle" },
  { key: "vehicle_fuel_type", label: "Fuel type", group: "Vehicle" },
  { key: "vehicle_engine", label: "Engine", group: "Vehicle" },
  { key: "vehicle_usage", label: "Usage", group: "Vehicle", input: "select", options: [...AUTO_VEHICLE_USAGE_OPTIONS] },
  {
    key: "vehicle_ownership",
    label: "Ownership",
    group: "Vehicle",
    input: "select",
    options: [...VEHICLE_OWNERSHIP_OPTIONS],
  },
  {
    key: "vehicle_ownership_length",
    label: "Length of ownership",
    group: "Vehicle",
    input: "select",
    options: [...VEHICLE_OWNERSHIP_LENGTH_OPTIONS],
  },
  {
    key: "vehicle_lienholder",
    label: "Lienholder",
    group: "Vehicle",
    input: "select",
    options: [...VEHICLE_LIENHOLDER_OPTIONS],
  },
  {
    key: "vehicle_lienholder_other",
    label: "Lienholder (other / custom)",
    group: "Vehicle",
  },
  {
    key: "vehicle_purchase_date",
    label: "Purchase date",
    group: "Vehicle",
  },
  {
    key: "purchased_new",
    label: "Purchased new?",
    group: "Vehicle",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "original_cost_new",
    label: "Original cost new (OCN)",
    group: "Vehicle",
    input: "number",
    // Portals also call this OCN / cost new — leave blank OK (no forced default).
  },
  {
    key: "annual_miles",
    label: "Annual miles",
    group: "Vehicle",
    input: "select",
    options: [...AUTO_ANNUAL_MILES_OPTIONS],
  },
  {
    key: "commute_days_week",
    label: "Commute days / week",
    group: "Vehicle",
    input: "select",
    options: [...COMMUTE_DAYS_WEEK_OPTIONS],
  },
  {
    key: "commute_miles_daily",
    label: "Miles driven daily",
    group: "Vehicle",
    input: "number",
  },
  {
    key: "rideshare",
    label: "Used for rideshare (Uber / Lyft)?",
    group: "Vehicle",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "aftermarket_parts",
    label: "Any non-factory / aftermarket parts?",
    group: "Vehicle",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "passive_restraints",
    label: "Passive restraints (airbags)?",
    group: "Vehicle",
    input: "select",
    options: [...PASSIVE_RESTRAINT_OPTIONS],
  },
  {
    key: "garaging_at_residence",
    label: "Garaged at residence?",
    group: "Vehicle",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  { key: "garaging_address", label: "Garaging address", group: "Vehicle" },
  { key: "garaging_zip", label: "Garaging ZIP", group: "Vehicle" },
  { key: "vehicle_2_vin", label: "Vehicle 2 VIN", group: "Vehicle" },
  { key: "vehicle_2_year", label: "Vehicle 2 year", group: "Vehicle", input: "number" },
  { key: "vehicle_2_make", label: "Vehicle 2 make", group: "Vehicle" },
  { key: "vehicle_2_model", label: "Vehicle 2 model", group: "Vehicle" },
  { key: "vehicle_2_body_class", label: "Vehicle 2 body class", group: "Vehicle" },
  { key: "vehicle_2_fuel_type", label: "Vehicle 2 fuel type", group: "Vehicle" },
  { key: "vehicle_2_engine", label: "Vehicle 2 engine", group: "Vehicle" },
  { key: "driver_1_name", label: "Driver 1 name", group: "Drivers" },
  { key: "driver_1_dob", label: "Driver 1 DOB", group: "Drivers" },
  {
    key: "driver_1_gender",
    label: "Driver 1 gender",
    group: "Drivers",
    input: "select",
    options: [...GENDER_OPTIONS],
  },
  {
    key: "driver_1_industry",
    label: "Industry",
    group: "Drivers",
    input: "select",
    options: [...INDUSTRY_OPTIONS],
  },
  {
    key: "driver_1_occupation",
    label: "Occupation",
    group: "Drivers",
    input: "select",
    options: [...OCCUPATION_OPTIONS],
  },
  {
    key: "driver_1_education_level",
    label: "Driver 1 education level",
    group: "Drivers",
    input: "select",
    options: [...EDUCATION_LEVEL_OPTIONS],
  },
  {
    key: "driver_1_marital_status",
    label: "Driver 1 marital status",
    group: "Drivers",
    input: "select",
    options: [...MARITAL_STATUS_OPTIONS],
  },
  { key: "driver_1_license", label: "Driver 1 license", group: "Drivers" },
  {
    key: "driver_1_status",
    label: "Driver 1 license status",
    group: "Drivers",
    input: "select",
    options: [...LICENSE_STATUS_OPTIONS],
  },
  { key: "driver_1_years_licensed", label: "Driver 1 years licensed", group: "Drivers", input: "number" },
  {
    key: "driver_1_household_status",
    label: "Household status",
    group: "Drivers",
    input: "select",
    options: [...AUTO_HOUSEHOLD_STATUS_OPTIONS],
  },
  {
    key: "driver_1_exclude_reason",
    label: "Exclude reason",
    group: "Drivers",
    input: "select",
    options: [...AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS],
  },
  {
    key: "driver_1_age_first_licensed",
    label: "Age first licensed",
    group: "Drivers",
  },
  {
    key: "driver_1_suspension_5yr",
    label: "Suspension in last 5 years",
    group: "Drivers",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  { key: "driver_2_name", label: "Driver 2 name", group: "Drivers" },
  { key: "driver_2_dob", label: "Driver 2 DOB", group: "Drivers" },
  { key: "driver_2_license", label: "Driver 2 license", group: "Drivers" },
  {
    key: "accidents_3yr",
    label: "Accidents last 3 years",
    group: "Driving record",
    input: "select",
    options: [...AUTO_INCIDENT_COUNT_OPTIONS],
  },
  {
    key: "violations_3yr",
    label: "Violations last 3 years",
    group: "Driving record",
    input: "select",
    options: [...AUTO_INCIDENT_COUNT_OPTIONS],
  },
  {
    key: "clean_record",
    label: "Clean record (no reportable accidents/violations)?",
    group: "Driving record",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "incident_details",
    label: "Incident details (if any)",
    group: "Driving record",
  },
  {
    key: "reportable_incidents",
    label: "Reportable incidents (via MVR pull — do not paste manually)",
    group: "Driving record",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "permission_pull_driving_history",
    label: "Permission to pull driving history / MVR",
    group: "Authorizations",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "permission_pull_credit_history",
    label: "Permission to pull credit history",
    group: "Authorizations",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  // Auto household block is folded into Drivers. Home/Health keep household_size/income.
  {
    key: "liability_bi",
    label: "BI limits",
    group: "Coverages",
    input: "select",
    options: [...AUTO_BI_LIMIT_OPTIONS],
  },
  {
    key: "liability_pd",
    label: "PD limit",
    group: "Coverages",
    input: "select",
    options: [...AUTO_PD_LIMIT_OPTIONS],
  },
  {
    key: "um_uim",
    label: "UM / UIM",
    group: "Coverages",
    input: "select",
    options: [...AUTO_UM_UIM_OPTIONS],
  },
  {
    key: "pip",
    label: "PIP",
    group: "Coverages",
    input: "select",
    options: [...AUTO_PIP_OPTIONS],
  },
  {
    key: "comp_deductible",
    label: "Comprehensive deductible",
    group: "Coverages",
    input: "select",
    options: [...AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS],
  },
  {
    key: "collision_deductible",
    label: "Collision deductible",
    group: "Coverages",
    input: "select",
    options: [...AUTO_PHYS_DAM_DEDUCTIBLE_OPTIONS],
  },
  { key: "motorcycle_cc", label: "Engine CC", group: "Motorcycle", products: ["motorcycle"] },
  { key: "motorcycle_type", label: "Motorcycle type", group: "Motorcycle", products: ["motorcycle"] },
  {
    key: "endorsed_rider",
    label: "Endorsed rider",
    group: "Motorcycle",
    input: "select",
    options: [...YES_NO_OPTIONS],
    products: ["motorcycle"],
  },
  { key: "radius", label: "Radius", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "gvw", label: "GVW", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "vehicle_class", label: "Vehicle class", group: "Commercial auto", products: ["commercial_auto"] },
  { key: "fleet_size", label: "Fleet size", group: "Commercial auto", input: "number", products: ["commercial_auto"] },
  { key: "current_carrier", label: "Current carrier", group: "Current policy", extractKey: "current_carrier" },
  { key: "current_premium", label: "Current premium", group: "Current policy", input: "number" },
  { key: "years_with_carrier", label: "Years with carrier", group: "Current policy", input: "number" },
  { key: "effective_date", label: "Effective date", group: "Current policy", extractKey: "effective_date" },
  { key: "expiration_date", label: "Expiration date", group: "Current policy", extractKey: "expiration_date" },
  { key: "policy_number", label: "Current policy ID", group: "Current policy", extractKey: "policy_number" },
  {
    key: "currently_insured",
    label: "Currently insured",
    group: "Current policy",
    input: "select",
    options: [...AUTO_CURRENTLY_INSURED_OPTIONS],
  },
  {
    key: "aaa_member",
    label: "AAA member",
    group: "Current policy",
    input: "select",
    options: [...AAA_MEMBER_OPTIONS],
  },
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
  // Property / NFIP map (FEMA FF-206 + Floodsmart app)
  { key: "property_address", label: "Property address (one-line)", group: "Property", extractKey: "property_address" },
  { key: "address1", label: "Street", group: "Property", extractKey: "address" },
  { key: "city", label: "City", group: "Property", extractKey: "city" },
  { key: "state", label: "State", group: "Property", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", extractKey: "zip" },
  { key: "county", label: "County", group: "Property", extractKey: "county" },
  { key: "mailing_address", label: "Mailing address", group: "Property", extractKey: "mailing_address" },
  { key: "parcel_id", label: "Parcel ID", group: "Property" },
  { key: "acres", label: "Acres", group: "Property", input: "number" },
  { key: "assessed_value", label: "Assessed value", group: "Property", input: "number" },
  { key: "land_value", label: "Land value", group: "Property", input: "number" },
  { key: "improvement_value", label: "Improvement value", group: "Property", input: "number" },
  { key: "year_effective", label: "Effective year", group: "Property", input: "number" },
  { key: "miles_to_coast", label: "Miles to coast", group: "Property", input: "number", extractKey: "miles_to_coast" },
  { key: "mobile_home", label: "Mobile / manufactured", group: "Property", input: "select", options: [...YES_NO_OPTIONS], extractKey: "mobile_home" },
  {
    key: "flood_zone",
    label: "Flood zone",
    group: "Property",
    input: "select",
    options: [...FLOOD_ZONE_OPTIONS],
    extractKey: "flood_zone",
  },
  { key: "community_number", label: "NFIP community number", group: "Property" },
  { key: "firm_panel", label: "FIRM panel", group: "Property" },
  { key: "firm_effective_date", label: "FIRM effective date", group: "Property" },
  {
    key: "flood_occupancy",
    label: "Building occupancy",
    group: "Property",
    input: "select",
    options: [...FLOOD_OCCUPANCY_OPTIONS],
  },
  {
    key: "dwelling_type",
    label: "Dwelling type",
    group: "Property",
    input: "select",
    options: [...FLOOD_BUILDING_TYPE_OPTIONS],
  },
  {
    key: "occupancy_use",
    label: "Occupancy use",
    group: "Property",
    input: "select",
    options: [...FLOOD_OCCUPANCY_USE_OPTIONS],
  },
  { key: "year_built", label: "Year built", group: "Property", input: "number", extractKey: "year_built" },
  { key: "building_sqft", label: "Building square footage", group: "Property", input: "number", extractKey: "square_feet" },
  { key: "number_of_floors", label: "Number of floors (excl. basement)", group: "Property", input: "number", extractKey: "stories" },
  { key: "construction_type", label: "Construction type", group: "Property", input: "select", options: [...CONSTRUCTION_OPTIONS], extractKey: "construction" },
  { key: "has_garage", label: "Garage / attached garage", group: "Property", input: "select", options: [...YES_NO_OPTIONS] },
  {
    key: "building_type",
    label: "Building type",
    group: "Property",
    input: "select",
    options: [...FLOOD_BUILDING_TYPE_OPTIONS],
  },
  { key: "live_over_50_pct", label: "Insured lives in building >50% of year", group: "Property", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "building_description", label: "Building description", group: "Property", input: "textarea" },
  {
    key: "foundation",
    label: "Foundation type",
    group: "Foundation / elevation",
    input: "select",
    options: [...FLOOD_FOUNDATION_OPTIONS],
  },
  { key: "enclosure_present", label: "Enclosure / crawlspace present", group: "Foundation / elevation", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "proper_flood_openings", label: "Proper flood openings / engineered openings", group: "Foundation / elevation", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "flood_openings_count", label: "Number of flood openings", group: "Foundation / elevation", input: "number" },
  { key: "flood_openings_sq_in", label: "Total opening area (sq in)", group: "Foundation / elevation", input: "number" },
  { key: "enclosed_area_sqft", label: "Total enclosed area (sq ft)", group: "Foundation / elevation", input: "number" },
  { key: "elevation_certificate", label: "Elevation certificate on file", group: "Foundation / elevation", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "ec_date", label: "Elevation certificate date", group: "Foundation / elevation" },
  { key: "building_diagram", label: "Building diagram number", group: "Foundation / elevation" },
  { key: "lag", label: "Lowest adjacent grade (ft)", group: "Foundation / elevation", input: "number" },
  { key: "lowest_floor", label: "Lowest floor elevation (ft)", group: "Foundation / elevation", input: "number" },
  { key: "first_floor_height", label: "First floor height (ft)", group: "Foundation / elevation", input: "number" },
  { key: "bfe", label: "Base flood elevation (BFE)", group: "Foundation / elevation", input: "number" },
  { key: "under_construction", label: "Building under construction", group: "Building", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "substantially_improved", label: "Substantially improved", group: "Building", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "over_water", label: "Building over water", group: "Building", input: "select", options: ["no", "partially", "entirely"] },
  { key: "floodproofed", label: "Properly floodproofed", group: "Building", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "me_mitigation", label: "Machinery & equipment mitigation discount", group: "Building", input: "select", options: [...YES_NO_OPTIONS] },
  // Coverages: building|contents limits then deductibles (pairs at density 2).
  { key: "building_limit", label: "Building coverage", group: "Coverages", input: "number" },
  { key: "contents_limit", label: "Contents coverage", group: "Coverages", input: "number" },
  {
    key: "building_deductible",
    label: "Building deductible",
    group: "Coverages",
    input: "select",
    options: [...FLOOD_DEDUCTIBLE_OPTIONS],
  },
  {
    key: "contents_deductible",
    label: "Contents deductible",
    group: "Coverages",
    input: "select",
    options: [...FLOOD_DEDUCTIBLE_OPTIONS],
  },
  { key: "loss_of_use", label: "Loss of use / ALE", group: "Coverages", input: "number" },
  { key: "coverage_a", label: "Building coverage (Cov A)", group: "Coverages", input: "number", extractKey: "coverage_a" },
  { key: "purchased_within_last_year", label: "Building purchased within last year?", group: "Loss history", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "prior_owner_nfip_at_closing", label: "Prior owner had active NFIP at closing?", group: "Loss history", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "prior_flood_losses", label: "Any prior flood losses?", group: "Loss history", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "effective_date", label: "Effective date (≈ app + 30 days unless new house)", group: "Current policy" },
  {
    key: "effective_date_type",
    label: "Effective date type",
    group: "Current policy",
    input: "select",
    options: [...FLOOD_EFFECTIVE_DATE_TYPE_OPTIONS],
  },
  {
    key: "flood_quote_reason",
    label: "Why are you requesting this quote?",
    group: "Current policy",
    input: "select",
    options: [...FLOOD_QUOTE_REASON_OPTIONS],
  },
  { key: "has_nfip", label: "Currently have flood/NFIP?", group: "Current policy", input: "select", options: [...YES_NO_OPTIONS] },
  { key: "nfip_policy", label: "Current NFIP / flood policy number", group: "Current policy" },
  { key: "current_carrier", label: "Current carrier", group: "Current policy" },
  { key: "current_premium", label: "Current premium", group: "Current policy", input: "number" },
  { key: "expiration_date", label: "Expiration date", group: "Current policy" },
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

/** Identity stays on Deal Details — Life Risk Profile is quote/track only. */
export const LIFE_FIELDS: QuoteFieldDef[] = [
  {
    key: "product_type",
    label: "Product type",
    group: "Product",
    input: "select",
    options: [...LIFE_PRODUCT_TYPE_OPTIONS],
    extractKey: "product_type",
  },
  { key: "face_amount", label: "Face amount", group: "Product", input: "number", extractKey: "face_amount" },
  {
    key: "term_years",
    label: "Term length",
    group: "Product",
    input: "select",
    options: [...LIFE_TERM_YEARS_OPTIONS],
    showWhen: { key: "product_type", values: ["Term", "Term Life"] },
  },
  { key: "premium_budget", label: "Premium budget", group: "Product", input: "number" },
  {
    key: "premium_mode",
    label: "Payment mode",
    group: "Product",
    input: "select",
    options: [...LIFE_PREMIUM_MODE_OPTIONS],
  },
  {
    key: "purpose_of_insurance",
    label: "Purpose of coverage",
    group: "Product",
    input: "select",
    options: [...LIFE_PURPOSE_OPTIONS],
  },
  {
    key: "height_ft",
    label: "Height (feet)",
    group: "Build & tobacco",
    input: "select",
    options: [...LIFE_HEIGHT_FT_OPTIONS],
  },
  {
    key: "height_in",
    label: "Height (inches)",
    group: "Build & tobacco",
    input: "select",
    options: [...LIFE_HEIGHT_IN_OPTIONS],
  },
  { key: "weight", label: "Weight (lbs)", group: "Build & tobacco", input: "number" },
  {
    key: "tobacco_status",
    label: "Tobacco use",
    group: "Build & tobacco",
    input: "select",
    options: [...TOBACCO_STATUS_OPTIONS],
    extractKey: "tobacco",
  },
  {
    key: "tobacco_type",
    label: "Tobacco type",
    group: "Build & tobacco",
    input: "select",
    options: [...TOBACCO_TYPE_OPTIONS],
    showWhen: { key: "tobacco_status", values: ["Former", "Current"] },
  },
  {
    key: "last_tobacco_date",
    label: "Last tobacco date",
    group: "Build & tobacco",
    showWhen: { key: "tobacco_status", values: ["Former", "Current"] },
  },
  {
    key: "medical_conditions",
    label: "Medical conditions",
    group: "Health",
    input: "multiselect",
    options: [...LIFE_MEDICAL_CONDITION_OPTIONS],
  },
  { key: "notes", label: "Health notes", group: "Health", input: "textarea" },
  {
    key: "existing_coverage",
    label: "Has existing life coverage?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "existing_carrier",
    label: "Current company",
    group: "Existing coverage",
    showWhen: { key: "existing_coverage", values: ["yes", "Yes"] },
  },
  {
    key: "existing_face_amount",
    label: "Existing face amount",
    group: "Existing coverage",
    input: "number",
    showWhen: { key: "existing_coverage", values: ["yes", "Yes"] },
  },
  {
    key: "existing_coverage_type",
    label: "Existing type",
    group: "Existing coverage",
    input: "select",
    options: [...LIFE_PRODUCT_TYPE_OPTIONS],
    showWhen: { key: "existing_coverage", values: ["yes", "Yes"] },
  },
  {
    key: "replacement",
    label: "Intent to replace?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "pending_applications",
    label: "Pending applications elsewhere?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  { key: "beneficiary_name", label: "Primary name", group: "Beneficiaries", extractKey: "beneficiary" },
  {
    key: "beneficiary_relationship",
    label: "Primary relationship",
    group: "Beneficiaries",
    input: "select",
    options: [...RELATIONSHIP_TO_INSURED_OPTIONS],
  },
  { key: "beneficiary_share", label: "Primary share (%)", group: "Beneficiaries", input: "number" },
  { key: "contingent_beneficiary_name", label: "Contingent name", group: "Beneficiaries" },
  {
    key: "contingent_beneficiary_relationship",
    label: "Contingent relationship",
    group: "Beneficiaries",
    input: "select",
    options: [...RELATIONSHIP_TO_INSURED_OPTIONS],
  },
  { key: "contingent_beneficiary_share", label: "Contingent share (%)", group: "Beneficiaries", input: "number" },
];

const SHOW_WHEN_YES = (key: string): { key: string; values: readonly string[] } => ({
  key,
  values: ["yes", "Yes"],
});

const MEDICARE_SHOW = {
  key: "plan_type",
  values: [...MEDICARE_COVERAGE_SHOW_VALUES],
};

const MARKETPLACE_SHOW = { key: "plan_type", values: ["Marketplace"] };
const TOBACCO_USED_SHOW = { key: "tobacco_status", values: ["Former", "Current"] };

function healthDependentFields(): QuoteFieldDef[] {
  const fields: QuoteFieldDef[] = [];
  for (let index = 1; index <= HEALTH_DEPENDENT_SLOT_COUNT; index += 1) {
    fields.push(
      {
        key: `dependent_${index}_name`,
        label: `Dependent ${index} name`,
        group: "Household",
        showWhen: SHOW_WHEN_YES("dependents_under_26"),
      },
      {
        key: `dependent_${index}_dob`,
        label: `Dependent ${index} DOB`,
        group: "Household",
        showWhen: SHOW_WHEN_YES("dependents_under_26"),
      },
      {
        key: `dependent_${index}_student`,
        label: `Dependent ${index} student?`,
        group: "Household",
        input: "select",
        options: [...YES_NO_OPTIONS],
        showWhen: SHOW_WHEN_YES("dependents_under_26"),
      },
    );
  }
  return fields;
}

/** Identity stays on Deal Details — Health Risk Profile is enrollment / quote track only. */
export const HEALTH_FIELDS: QuoteFieldDef[] = [
  {
    key: "using_healthsherpa",
    label: "Using HealthSherpa",
    group: "Coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "plan_type",
    label: "Coverage type",
    group: "Coverage",
    input: "select",
    options: [...HEALTH_PLAN_TYPE_OPTIONS],
    extractKey: "plan_type",
  },
  {
    key: "metal_level",
    label: "Metal level preference",
    group: "Marketplace",
    input: "select",
    options: [...HEALTH_METAL_LEVEL_OPTIONS],
    showWhen: MARKETPLACE_SHOW,
  },
  {
    key: "deductible_preference",
    label: "Deductible preference",
    group: "Coverage",
    input: "select",
    options: [...HEALTH_COST_PREF_OPTIONS],
  },
  {
    key: "oop_max_preference",
    label: "Out-of-pocket max preference",
    group: "Coverage",
    input: "select",
    options: [...HEALTH_COST_PREF_OPTIONS],
  },
  { key: "medicare_number", label: "Medicare number", group: "Medicare", showWhen: MEDICARE_SHOW },
  { key: "part_a_start", label: "Part A start date", group: "Medicare", showWhen: MEDICARE_SHOW },
  { key: "part_b_start", label: "Part B start date", group: "Medicare", showWhen: MEDICARE_SHOW },
  {
    key: "current_ma_plan",
    label: "Current Medicare Advantage plan",
    group: "Medicare",
    showWhen: MEDICARE_SHOW,
  },
  {
    key: "current_medigap_letter",
    label: "Current Medigap plan letter",
    group: "Medicare",
    showWhen: MEDICARE_SHOW,
  },
  {
    key: "medicaid_eligibility",
    label: "Medicaid eligibility",
    group: "Medicare",
    input: "select",
    options: [...YES_NO_OPTIONS],
    showWhen: MEDICARE_SHOW,
  },
  {
    key: "lis_extra_help",
    label: "LIS / Extra Help",
    group: "Medicare",
    input: "select",
    options: [...YES_NO_OPTIONS],
    showWhen: MEDICARE_SHOW,
  },
  {
    key: "household_size",
    label: "Household size",
    group: "Household",
    input: "select",
    options: [...HOUSEHOLD_SIZE_OPTIONS],
  },
  { key: "household_income", label: "Household income (annual)", group: "Household", input: "number" },
  {
    key: "expected_tax_credit",
    label: "Expected tax credit eligibility",
    group: "Household",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "spouse_on_application",
    label: "Spouse on application",
    group: "Household",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "spouse_name",
    label: "Spouse name",
    group: "Household",
    showWhen: SHOW_WHEN_YES("spouse_on_application"),
  },
  {
    key: "spouse_dob",
    label: "Spouse DOB",
    group: "Household",
    showWhen: SHOW_WHEN_YES("spouse_on_application"),
  },
  {
    key: "dependents_under_26",
    label: "Dependents under 26",
    group: "Household",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  ...healthDependentFields(),
  {
    key: "pregnancy",
    label: "Pregnancy",
    group: "Household",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "pregnancy_due_date",
    label: "Pregnancy due date",
    group: "Household",
    showWhen: SHOW_WHEN_YES("pregnancy"),
  },
  {
    key: "tobacco_status",
    label: "Tobacco use",
    group: "Tobacco",
    input: "select",
    options: [...TOBACCO_STATUS_OPTIONS],
    extractKey: "tobacco",
  },
  {
    key: "tobacco_type",
    label: "Tobacco type",
    group: "Tobacco",
    input: "select",
    options: [...TOBACCO_TYPE_OPTIONS],
    showWhen: TOBACCO_USED_SHOW,
  },
  {
    key: "last_tobacco_date",
    label: "Last tobacco date",
    group: "Tobacco",
    showWhen: TOBACCO_USED_SHOW,
  },
  {
    key: "medical_conditions",
    label: "Medical conditions",
    group: "Health",
    input: "multiselect",
    options: [...HEALTH_MEDICAL_CONDITION_OPTIONS],
  },
  { key: "notes", label: "Health notes", group: "Health", input: "textarea" },
  {
    key: "employer_plan",
    label: "Current employer plan",
    group: "Employer / QLE",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "employer_plan_name",
    label: "Employer plan name",
    group: "Employer / QLE",
    showWhen: SHOW_WHEN_YES("employer_plan"),
  },
  {
    key: "employer_plan_premium",
    label: "Employer monthly premium",
    group: "Employer / QLE",
    input: "number",
    showWhen: SHOW_WHEN_YES("employer_plan"),
  },
  {
    key: "cobra_eligibility",
    label: "COBRA eligibility",
    group: "Employer / QLE",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "qualifying_life_event",
    label: "Qualifying life event",
    group: "Employer / QLE",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "qle_type",
    label: "QLE type",
    group: "Employer / QLE",
    input: "select",
    options: [...HEALTH_QLE_TYPE_OPTIONS],
    showWhen: SHOW_WHEN_YES("qualifying_life_event"),
  },
  {
    key: "qle_date",
    label: "QLE date",
    group: "Employer / QLE",
    showWhen: SHOW_WHEN_YES("qualifying_life_event"),
  },
  {
    key: "existing_coverage",
    label: "Has current health coverage?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "existing_carrier",
    label: "Current carrier",
    group: "Existing coverage",
    showWhen: SHOW_WHEN_YES("existing_coverage"),
  },
  {
    key: "existing_plan_type",
    label: "Current plan type",
    group: "Existing coverage",
    input: "select",
    options: [...HEALTH_PLAN_TYPE_OPTIONS],
    showWhen: SHOW_WHEN_YES("existing_coverage"),
  },
  {
    key: "replacement",
    label: "Intent to replace?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "pending_applications",
    label: "Pending applications?",
    group: "Existing coverage",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
];

/** Lean Commercial Risk Profile (WC / GL / BOP share one catalog; BOP like Medicare). */
export const WC_FIELDS: QuoteFieldDef[] = COMMERCIAL_RISK_PROFILE_FIELDS;
export const GL_FIELDS: QuoteFieldDef[] = COMMERCIAL_RISK_PROFILE_FIELDS;
export const BOP_FIELDS: QuoteFieldDef[] = COMMERCIAL_RISK_PROFILE_FIELDS;

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
  bop: BOP_FIELDS,
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

/**
 * Deal Details already owns personal identity (name / DOB / contact / co-applicant).
 * Home / Auto / Flood / Life / Health / Commercial Risk Profiles do not re-ask those keys.
 * Stored sheet JSON keeps any previously saved applicant_* values — Fill still updates them
 * when they already exist on the row.
 */
const LINES_WITHOUT_SHEET_IDENTITY = new Set<ShopLine>(["life", "health", "home", "auto", "flood"]);

export function fieldsForLine(
  line: ShopLine,
  product?: SheetProduct,
  quotingForm?: string | null,
): QuoteFieldDef[] {
  const skipIdentity = LINES_WITHOUT_SHEET_IDENTITY.has(line) || isCommercialSheetLine(line);
  const identity = skipIdentity ? [] : [...APPLICANT_CORE_FIELDS, ...CO_APPLICANT_FIELDS];
  const raw = dedupeFields([...identity, ...(CATALOG[line] ?? [])]);
  const filtered = !product
    ? raw
    : raw.filter((field) => {
        if (!field.products || field.products.includes(product)) return true;
        // HO4 / renters / MDP share the inspection sections with HO and DP forms.
        return line === "home" && product === "renters" && isInspectionSectionGroup(field.group);
      });
  if (line === "home" && (!product || product === "homeowners")) {
    return manufacturedHomeFieldsFor(filtered, quotingForm);
  }
  return filtered;
}

export function sheetFieldIsVisible(
  field: QuoteFieldDef,
  liveValues: Record<string, string | undefined | null>,
): boolean {
  return fieldIsVisible(field, liveValues);
}

/** Hide a section header when every field is cascaded off (Medicare, lived-5-years style). */
export function sheetGroupIsVisible(
  fields: readonly QuoteFieldDef[],
  liveValues: Record<string, string | undefined | null>,
): boolean {
  return fields.some((field) => sheetFieldIsVisible(field, liveValues));
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
  return applyMasterSheetDefaults(
    emptySheetValues(line, product),
    emptyDefaultsForLine(line),
  ).values;
}

const EXTRACT_ALIASES: Record<string, string> = {
  // Auto vehicle: Original cost new — portals say OCN / cost new
  ocn: "original_cost_new",
  cost_new: "original_cost_new",
  original_cost: "original_cost_new",
  wind_hail_deductible: "wind_hail_deductible",
  wind_deductible: "wind_hail_deductible",
  address: "address",
  swr: "secondary_water",
  garage: "garage_type",
  garage_spaces: "garage_spaces",
  screen_enclosure: "screen_enclosure",
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
  mortgagee: "mortgagee_name",
  // Identity lives on Deal Details; owner/dec name reuses Current policy named insured.
  applicant_name: "named_insured",
  purchase_price: "sale_price",
  city_limits: "within_city_limits",
  city_within_city_limits: "within_city_limits",
  aaa: "aaa_member",
  aaa_membership: "aaa_member",
  passive_restraint: "passive_restraints",
  screen_enclosure_limit: "screen_enclosure",
  household_1_status: "driver_1_household_status",
  household_1_exclude_reason: "driver_1_exclude_reason",
  household_1_age_first_licensed: "driver_1_age_first_licensed",
  household_1_suspension_5yr: "driver_1_suspension_5yr",
};

/** Home-style property keys → Flood catalog keys (GetParcel / county PA emit Home names). */
const COMMERCIAL_EXTRACT_ALIASES: Record<string, string> = {
  fein: "ein",
  legal_name: "business_name",
  annual_revenue: "annual_sales",
  sales: "annual_sales",
  gross_sales: "annual_sales",
  revenue: "annual_sales",
  employees: "employee_count",
  business_description: "operations",
  operations_description: "operations",
  annual_payroll: "payroll",
  payroll_w2: "payroll",
};

const LINE_SHEET_KEY_ALIASES: Partial<Record<ShopLine, Record<string, string>>> = {
  flood: {
    construction: "construction_type",
    square_feet: "building_sqft",
    living_area: "building_sqft",
    square_footage: "building_sqft",
    stories: "number_of_floors",
    num_stories: "number_of_floors",
    number_of_stories: "number_of_floors",
    floors: "number_of_floors",
  },
  workers_comp: COMMERCIAL_EXTRACT_ALIASES,
  general_liability: COMMERCIAL_EXTRACT_ALIASES,
  bop: COMMERCIAL_EXTRACT_ALIASES,
};

export function extractKeyToSheetKey(line: ShopLine, extractKey: string): string | null {
  const lineAlias = LINE_SHEET_KEY_ALIASES[line]?.[extractKey];
  if (lineAlias) {
    const fields = fieldsForLine(line);
    if (fields.some((field) => field.key === lineAlias)) return lineAlias;
  }
  const aliased = EXTRACT_ALIASES[extractKey] ?? extractKey;
  const fields = fieldsForLine(line);
  const exact = fields.find((field) => field.key === extractKey || field.key === aliased);
  if (exact) return exact.key;
  const match = fields.find(
    (field) => field.extractKey === extractKey || field.extractKey === aliased,
  );
  if (match) return match.key;
  if (line === "auto" && isRepeatableSheetKey(aliased)) return aliased;
  return null;
}

export function groupFields(
  line: ShopLine,
  product?: SheetProduct,
  values?: SheetValueBag,
  quotingForm?: string | null,
): { group: string; fields: QuoteFieldDef[] }[] {
  const listed = values
    ? visibleQuoteFields(fieldsForLine(line, product, quotingForm), values)
    : fieldsForLine(line, product, quotingForm);
  const source = recordsCheckHiddenOnRiskProfile(line)
    ? listed.filter((field) => field.key !== RECORDS_CHECK_KEY)
    : listed;
  const groups: { group: string; fields: QuoteFieldDef[] }[] = [];
  for (const field of source) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return line === "home" ? orderHomeGroups(groups) : groups;
}

export function homeFieldCount(): number {
  return fieldsForLine("home", "homeowners").length;
}

/** Legacy sheet `form` — cascade owns quoting form. Do not wipe stored values. */
export function legacySheetFormValue(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
): string {
  return String(values?.form?.value ?? "").trim();
}
