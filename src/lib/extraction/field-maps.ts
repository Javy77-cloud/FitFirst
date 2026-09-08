/**
 * Per-form field maps — source label on the page → master sheet field.
 *
 * Deterministic only. Extraction never guesses an unmapped label onto a sheet
 * key. Unmapped labeled lines stay blank on the sheet and land in the existing
 * needs-review / yellow CHECK path.
 *
 * Accuracy targets (standardized OIR / 4-point / HO3 dec pages):
 * - Wind mit (OIR-B1-1802) and four-point maps: 95%+ labeled-field hit rate.
 * - Property API enrichment (ATTOM / Estated / Florida Property): 90%+ on
 *   year built / exterior / roof type when a BYO key is present. Remaining
 *   fields stay in the agent review bucket.
 *
 * Paid property APIs are stubbed with env key walls. No Zillow. No county HTML.
 */

export const FIELD_MAP_DOC_TYPES = ["wind_mit", "four_point", "dec", "policy"] as const;
export type FieldMapDocType = (typeof FIELD_MAP_DOC_TYPES)[number];

export type FieldMapRow = {
  /** Label as printed on the form. */
  sourceLabel: string;
  /** Master sheet / extract key. */
  sheetField: string;
  /** Extra printed variants; compact-normalized at lookup. */
  aliases?: string[];
};

export function normalizeMapLabel(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Wind mitigation — OIR-B1-1802. Required rows first. */
export const WIND_MIT_FIELD_MAP: FieldMapRow[] = [
  { sourceLabel: "Roof covering", sheetField: "roof_covering", aliases: ["Roof cov", "Roof type", "Roof material", "Roof Surfacing Material"] },
  { sourceLabel: "Roof deck attachment", sheetField: "roof_deck", aliases: ["Roof deck", "Wood Deck (Type II or III)"] },
  { sourceLabel: "Roof-to-wall connection", sheetField: "roof_to_wall", aliases: ["Roof to wall connection", "Roof to wall", "Roof to Wall Attachment"] },
  { sourceLabel: "Opening protection", sheetField: "opening_protection", aliases: ["Opn prot", "Shutters"] },
  { sourceLabel: "Roof geometry", sheetField: "roof_shape", aliases: ["Roof shape", "Roof Shape:"] },
  { sourceLabel: "Secondary water resistance", sheetField: "swr", aliases: ["SWR", "Secondary water"] },
  { sourceLabel: "Year built", sheetField: "year_built", aliases: ["Yr Blt", "Yr Built", "Year of construction", "Year Built / Updated"] },
  { sourceLabel: "Roof year", sheetField: "roof_year", aliases: ["Year of roof", "Roof installed", "Year of Roof/Updated", "Roof Replaced"] },
  { sourceLabel: "Construction", sheetField: "construction", aliases: ["Construction Type", "Frame", "Masonry"] },
  { sourceLabel: "Occupancy", sheetField: "occupancy" },
  { sourceLabel: "Stories", sheetField: "stories" },
  { sourceLabel: "Location", sheetField: "address", aliases: ["Property address", "Insured location", "Residence Premises", "Property Street Address", "Mailing Address"] },
  { sourceLabel: "City", sheetField: "city", aliases: ["City, State, and Zip Code"] },
  { sourceLabel: "County", sheetField: "county" },
  { sourceLabel: "Named insured", sheetField: "named_insured", aliases: ["Insured Name and Mailing", "Applicant's Legal Name", "Name"] },
  { sourceLabel: "Miles to coast", sheetField: "miles_to_coast" },
  { sourceLabel: "Pool", sheetField: "pool" },
  { sourceLabel: "Wind mitigation form", sheetField: "wind_mit_form", aliases: ["Wind mit form", "Wind Mitigation Form"] },
  { sourceLabel: "Wind mit date", sheetField: "wind_mit_date" },
  { sourceLabel: "Wind mit inspector", sheetField: "wind_mit_inspector" },
  { sourceLabel: "Terrain", sheetField: "terrain" },
  { sourceLabel: "Design wind speed", sheetField: "wind_speed", aliases: ["Region"] },
  { sourceLabel: "Owner Name", sheetField: "applicant_name", aliases: ["Owner's Name"] },
  { sourceLabel: "Address Inspected", sheetField: "applicant_address", aliases: ["Address"] },
  { sourceLabel: "Qualified Inspector Name", sheetField: "wind_mit_inspector", aliases: ["Inspector Name"] },
  { sourceLabel: "License or Certificate #", sheetField: "license_or_certificate_number", aliases: ["License or Certificate Number"] },
  { sourceLabel: "Inspection Company", sheetField: "inspection_company" },
  { sourceLabel: "Building Code", sheetField: "building_code" },
  { sourceLabel: "Cell Phone", sheetField: "phone" },
  { sourceLabel: "Year of Home", sheetField: "year_built" },
  { sourceLabel: "#", sheetField: "stories", aliases: ["# of Stories"] },
];

/** Four-point inspection. Required rows first. */
export const FOUR_POINT_FIELD_MAP: FieldMapRow[] = [
  { sourceLabel: "Age of electrical panel", sheetField: "electrical_year", aliases: ["Electrical year"] },
  { sourceLabel: "Year last updated", sheetField: "electrical_updated", aliases: ["Electrical updated"] },
  { sourceLabel: "Age of piping supply system", sheetField: "plumbing_year", aliases: ["Plumbing year"] },
  { sourceLabel: "Age of water heater", sheetField: "water_heater_year", aliases: ["Water heater year", "Water heater"] },
  { sourceLabel: "HVAC year", sheetField: "hvac_year", aliases: ["Age of HVAC"] },
  { sourceLabel: "Actual year built", sheetField: "year_built", aliases: ["Year built", "Year of construction"] },
  { sourceLabel: "4-point date", sheetField: "four_point_date", aliases: ["4 point date", "Four point date", "Four-point date"] },
  { sourceLabel: "4-point result", sheetField: "four_point_result", aliases: ["4 point result", "Four point result", "Four-point result"] },
  { sourceLabel: "Roof year", sheetField: "roof_year" },
  { sourceLabel: "Roof covering", sheetField: "roof_covering" },
  { sourceLabel: "Roof condition", sheetField: "roof_condition" },
  { sourceLabel: "Construction", sheetField: "construction" },
  { sourceLabel: "Occupancy", sheetField: "occupancy" },
  { sourceLabel: "Stories", sheetField: "stories" },
  { sourceLabel: "Location", sheetField: "address", aliases: ["Property address"] },
  { sourceLabel: "Named insured", sheetField: "named_insured" },
  { sourceLabel: "City", sheetField: "city" },
  { sourceLabel: "County", sheetField: "county" },
  { sourceLabel: "Electrical", sheetField: "four_point_electrical" },
  { sourceLabel: "Plumbing", sheetField: "four_point_plumbing" },
  { sourceLabel: "HVAC", sheetField: "four_point_hvac" },
  { sourceLabel: "Roof", sheetField: "roof_condition" },
  { sourceLabel: "Insured/Applicant Name", sheetField: "applicant_name", aliases: ["Insured Name", "Applicant Name"] },
  { sourceLabel: "Address Inspected", sheetField: "applicant_address" },
  { sourceLabel: "Four-Point Date", sheetField: "date_inspected", aliases: ["Four Point Date", "4-Point Date"] },
  { sourceLabel: "Panel Age", sheetField: "panel_age" },
  { sourceLabel: "Covering Material", sheetField: "roof_covering" },
  { sourceLabel: "Date of Last Roofing Permit", sheetField: "roof_year", aliases: ["Covering Date"] },
  { sourceLabel: "Original to Home", sheetField: "plumbing_original" },
];

/** HO3 declaration page — reasonable printed labels → sheet fields. */
export const DEC_PAGE_FIELD_MAP: FieldMapRow[] = [
  { sourceLabel: "Named insured", sheetField: "named_insured", aliases: ["Primary named insured", "Insured", "Insured Name and Mailing", "Applicant's Legal Name", "Applicant Last Name", "Name"] },
  { sourceLabel: "Additional named insured", sheetField: "secondary_named_insured", aliases: ["Secondary named insured"] },
  { sourceLabel: "Location", sheetField: "address", aliases: ["Property address", "Insured location", "Residence premises"] },
  { sourceLabel: "Mailing address", sheetField: "mailing_address" },
  { sourceLabel: "City", sheetField: "city", aliases: ["Location city"] },
  { sourceLabel: "County", sheetField: "county" },
  { sourceLabel: "State", sheetField: "state" },
  { sourceLabel: "ZIP", sheetField: "zip", aliases: ["Zip code", "Postal code"] },
  { sourceLabel: "Year built", sheetField: "year_built", aliases: ["Yr Blt", "Year of construction", "Built"] },
  { sourceLabel: "Construction", sheetField: "construction", aliases: ["Const"] },
  { sourceLabel: "Occupancy", sheetField: "occupancy", aliases: ["Occ"] },
  { sourceLabel: "Stories", sheetField: "stories", aliases: ["Story"] },
  { sourceLabel: "Square feet", sheetField: "square_feet", aliases: ["Sq ft", "Living area", "Heated sq ft", "Total Square Footage", "Sq Footage"] },
  { sourceLabel: "Bedrooms", sheetField: "beds", aliases: ["Beds"] },
  { sourceLabel: "Bathrooms", sheetField: "baths", aliases: ["Baths"] },
  { sourceLabel: "Coverage A", sheetField: "coverage_a", aliases: ["Coverage A Dwelling", "Coverage A – Dwelling", "Cov A", "Dwelling", "Dwelling limit", "Building limit"] },
  { sourceLabel: "Coverage B", sheetField: "coverage_b", aliases: ["Coverage B Other Structures", "Coverage B – Other Structures", "Cov B", "Other structures"] },
  { sourceLabel: "Coverage C", sheetField: "coverage_c", aliases: ["Coverage C Personal Property", "Coverage C – Personal Property", "Cov C", "Personal property", "Contents"] },
  { sourceLabel: "Coverage D", sheetField: "coverage_d", aliases: ["Coverage D Loss of Use", "Coverage D – Loss of Use", "Cov D", "Loss of use", "Additional living"] },
  { sourceLabel: "Coverage E", sheetField: "coverage_e", aliases: ["Personal liability"] },
  { sourceLabel: "Coverage F", sheetField: "coverage_f", aliases: ["Medical payments"] },
  { sourceLabel: "Hurricane deductible", sheetField: "hurricane_deductible", aliases: ["Hurricane"] },
  { sourceLabel: "AOP deductible", sheetField: "aop_deductible", aliases: ["AOP", "All other perils"] },
  { sourceLabel: "Wind deductible", sheetField: "wind_deductible", aliases: ["Wind/hail deductible", "Wind hail"] },
  { sourceLabel: "Roof year", sheetField: "roof_year", aliases: ["Year of roof"] },
  { sourceLabel: "Roof covering", sheetField: "roof_covering", aliases: ["Roof type", "Roof material"] },
  { sourceLabel: "Roof shape", sheetField: "roof_shape", aliases: ["Roof geometry"] },
  { sourceLabel: "Opening protection", sheetField: "opening_protection", aliases: ["Shutters"] },
  { sourceLabel: "Protection class", sheetField: "protection_class", aliases: ["PPC", "Prot class"] },
  { sourceLabel: "Miles to coast", sheetField: "miles_to_coast" },
  { sourceLabel: "Flood zone", sheetField: "flood_zone", aliases: ["FEMA zone", "NFIP zone"] },
  { sourceLabel: "Pool", sheetField: "pool", aliases: ["Swimming pool"] },
  { sourceLabel: "Mobile home", sheetField: "mobile_home", aliases: ["Manufactured home"] },
  { sourceLabel: "Current carrier", sheetField: "current_carrier", aliases: ["Writing company", "Insurance company", "Company", "Incumbent"] },
  { sourceLabel: "Current premium", sheetField: "current_premium", aliases: ["Annual premium", "Total premium", "Premium", "Total Annual Policy Premium"] },
  { sourceLabel: "Policy number", sheetField: "policy_number", aliases: ["Policy no"] },
  { sourceLabel: "Form", sheetField: "form", aliases: ["Policy form", "HO form"] },
  { sourceLabel: "Effective date", sheetField: "effective_date", aliases: ["Policy effective", "Inception"] },
  { sourceLabel: "Expiration date", sheetField: "expiration_date", aliases: ["Policy expiration", "Expires"] },
  { sourceLabel: "Mortgagee", sheetField: "mortgagee", aliases: ["First mortgagee", "Mortgagee clause"] },
  { sourceLabel: "Ordinance or law", sheetField: "ordinance_or_law" },
  { sourceLabel: "Water backup", sheetField: "water_backup" },
  { sourceLabel: "Replacement cost estimate", sheetField: "replacement_cost_estimate", aliases: ["RCE", "MSB", "Replacement cost"] },
  { sourceLabel: "4-point date", sheetField: "four_point_date" },
  { sourceLabel: "4-point result", sheetField: "four_point_result" },
  { sourceLabel: "Wind mit form", sheetField: "wind_mit_form", aliases: ["Wind mitigation form"] },
  { sourceLabel: "Insured Name", sheetField: "mailing_address" },
  { sourceLabel: "Type of Residence", sheetField: "usage" },
  { sourceLabel: "Months occupied", sheetField: "months_occupied" },
  { sourceLabel: "Personal Property Replacement Cost", sheetField: "scheduled_personal_property" },
  { sourceLabel: "Windstorm or Hail", sheetField: "wind_hail_deductible", aliases: ["Other Than Hurricane", "Wind/Hail"] },
  { sourceLabel: "Name Insured", sheetField: "current_policy_named_insured" },
  { sourceLabel: "Loan Number", sheetField: "loan_number", aliases: ["Loan #"] },
  { sourceLabel: "Additional Interest", sheetField: "mortgagee" },
  { sourceLabel: "Water Backup and Sump Overflow Coverage", sheetField: "water_backup" },
  { sourceLabel: "Loss assessment", sheetField: "loss_assessment" },
  { sourceLabel: "Deadbolts", sheetField: "deadbolts" },
];

/** Policy page scaffold — same HO3 sheet keys; do not block on this after dec. */
export const POLICY_FIELD_MAP: FieldMapRow[] = [
  { sourceLabel: "Policy number", sheetField: "policy_number", aliases: ["Policy no"] },
  { sourceLabel: "Form", sheetField: "form", aliases: ["Policy form"] },
  { sourceLabel: "Writing company", sheetField: "current_carrier", aliases: ["Current carrier", "Company"] },
  { sourceLabel: "Named insured", sheetField: "named_insured" },
  { sourceLabel: "Additional named insured", sheetField: "secondary_named_insured" },
  { sourceLabel: "Effective date", sheetField: "effective_date" },
  { sourceLabel: "Expiration date", sheetField: "expiration_date" },
  { sourceLabel: "Current premium", sheetField: "current_premium", aliases: ["Annual premium"] },
  { sourceLabel: "Location", sheetField: "address", aliases: ["Residence premises"] },
  { sourceLabel: "Mailing address", sheetField: "mailing_address" },
  { sourceLabel: "Year built", sheetField: "year_built" },
  { sourceLabel: "Coverage A", sheetField: "coverage_a", aliases: ["Dwelling", "Dwelling limit"] },
  { sourceLabel: "Coverage B", sheetField: "coverage_b" },
  { sourceLabel: "Coverage C", sheetField: "coverage_c" },
  { sourceLabel: "Coverage D", sheetField: "coverage_d" },
  { sourceLabel: "Hurricane deductible", sheetField: "hurricane_deductible" },
  { sourceLabel: "AOP deductible", sheetField: "aop_deductible" },
  { sourceLabel: "Mortgagee", sheetField: "mortgagee" },
];

export const FIELD_MAPS: Record<FieldMapDocType, FieldMapRow[]> = {
  wind_mit: WIND_MIT_FIELD_MAP,
  four_point: FOUR_POINT_FIELD_MAP,
  dec: DEC_PAGE_FIELD_MAP,
  policy: POLICY_FIELD_MAP,
};

const REQUIRED_WIND_MIT: Array<[string, string]> = [
  ["Roof covering", "roof_covering"],
  ["Roof deck attachment", "roof_deck"],
  ["Roof-to-wall connection", "roof_to_wall"],
  ["Opening protection", "opening_protection"],
  ["Roof geometry", "roof_shape"],
  ["Secondary water resistance", "swr"],
];

const REQUIRED_FOUR_POINT: Array<[string, string]> = [
  ["Age of electrical panel", "electrical_year"],
  ["Year last updated", "electrical_updated"],
  ["Age of piping supply system", "plumbing_year"],
  ["Age of water heater", "water_heater_year"],
  ["HVAC year", "hvac_year"],
  ["Actual year built", "year_built"],
];

export function requiredMapPairs(docType: FieldMapDocType): Array<[string, string]> {
  if (docType === "wind_mit") return REQUIRED_WIND_MIT;
  if (docType === "four_point") return REQUIRED_FOUR_POINT;
  return [];
}

function indexFor(docType: FieldMapDocType): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of FIELD_MAPS[docType]) {
    index.set(normalizeMapLabel(row.sourceLabel), row.sheetField);
    for (const alias of row.aliases ?? []) {
      index.set(normalizeMapLabel(alias), row.sheetField);
    }
  }
  return index;
}

const LOOKUP: Record<FieldMapDocType, Map<string, string>> = {
  wind_mit: indexFor("wind_mit"),
  four_point: indexFor("four_point"),
  dec: indexFor("dec"),
  policy: indexFor("policy"),
};

/** Deterministic map lookup. Unknown labels return null — never inferred. */
export function lookupSheetField(docType: FieldMapDocType, sourceLabel: string): string | null {
  const compact = normalizeMapLabel(sourceLabel);
  if (!compact) return null;
  return LOOKUP[docType].get(compact) ?? null;
}

export function sheetFieldsForDocType(docType: FieldMapDocType): Set<string> {
  return new Set(FIELD_MAPS[docType].map((row) => row.sheetField));
}

export function isFieldMapDocType(value: string | null | undefined): value is FieldMapDocType {
  return value === "wind_mit" || value === "four_point" || value === "dec" || value === "policy";
}

/**
 * Resolve which form map applies. Explicit upload type wins.
 * Auto packets stay on the generic extract path (no HO3 map).
 */
export function inferFieldMapDocType(text: string, docType?: string | null): FieldMapDocType | null {
  const declared = (docType ?? "").trim().toLowerCase();
  if (declared === "current_policy" || declared === "policy") return "policy";
  if (isFieldMapDocType(declared)) return declared;

  const blob = text.slice(0, 2400);
  if (/personal\s+auto|vehicle\s+year|\bvin\s*[:#]/i.test(blob) && !/homeowners/i.test(blob)) {
    return null;
  }
  if (/homeowners\s+declarations|declaration(?:s)?\s+page/i.test(blob)) return "dec";
  if (/wind\s*mit|oir[\s-]?b[\s-]?1[\s-]?1?802/i.test(blob)) return "wind_mit";
  if (/4[\s-]*point|four[\s-]*point/i.test(blob)) return "four_point";
  return null;
}

export function allFieldMapRows(): Array<FieldMapRow & { docType: FieldMapDocType }> {
  return (FIELD_MAP_DOC_TYPES as readonly FieldMapDocType[]).flatMap((docType) =>
    FIELD_MAPS[docType].map((row) => ({ ...row, docType })),
  );
}
