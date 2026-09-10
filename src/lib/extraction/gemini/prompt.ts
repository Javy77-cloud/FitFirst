/**
 * System instructions for FL insurance source-doc extraction (Gemini).
 * Field meanings follow the archived synonym / checkbox / field-map brief.
 */

export const GEMINI_EXTRACT_JSON_KEYS = [
  "applicant_name",
  "property_address",
  "year_built",
  "stories",
  "phone",
  "email",
  "wind_mit_inspector",
  "license_number",
  "inspection_company",
  "roof_covering",
  "roof_deck_attachment",
  "roof_to_wall",
  "roof_shape",
  "swr",
  "opening_protection",
  "building_code",
  "design_wind_speed",
  "mailing_address",
  "months_occupied",
  "occupancy",
  "usage",
  "entity_type",
  "construction_type",
  "coverage_a",
  "ordinance_law",
  "water_backup",
  "hurricane_deductible",
  "aop_deductible",
  "wind_hail_deductible",
  "current_policy_name_insured",
  "policy_number",
  "current_premium",
  "effective_date",
  "expiration_date",
  "mortgagee",
  "loan_number",
  // helpful extras often on the same forms
  "city",
  "state",
  "zip",
  "county",
  "roof_year",
  "named_insured",
  "wind_mit_form",
  "wind_mit_date",
  "terrain",
  // four-point system years / ages (MUST be listed or Gemini omits them)
  "electrical_year",
  "plumbing_year",
  "hvac_year",
  "water_heater_year",
  "electrical_updated",
  "electrical_circuit_amps",
  "roof_condition",
  "four_point_date",
  "date_inspected",
  // dec coverages / carrier / mortgage / NI extras (Mario feel-pass)
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
  "sinkhole_deductible",
  "current_carrier",
  "secondary_named_insured",
  "mortgagee_address",
] as const;

/** Personal Auto dec / ID card / photo of auto dec. */
export const GEMINI_AUTO_EXTRACT_JSON_KEYS = [
  "applicant_name",
  "named_insured",
  "current_policy_name_insured",
  "secondary_named_insured",
  "phone",
  "email",
  "mailing_address",
  "city",
  "state",
  "zip",
  "vin",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "vehicle_usage",
  "garaging_zip",
  "garaging_address",
  "vehicle_2_vin",
  "vehicle_2_year",
  "vehicle_2_make",
  "vehicle_2_model",
  "vehicle_3_vin",
  "vehicle_3_year",
  "vehicle_3_make",
  "vehicle_3_model",
  "vehicle_4_vin",
  "vehicle_4_year",
  "vehicle_4_make",
  "vehicle_4_model",
  "driver_1_name",
  "driver_1_dob",
  "driver_1_license",
  "driver_1_status",
  "driver_1_years_licensed",
  "driver_2_name",
  "driver_2_dob",
  "driver_2_license",
  "driver_2_status",
  "driver_2_years_licensed",
  "driver_3_name",
  "driver_3_dob",
  "driver_3_license",
  "driver_4_name",
  "driver_4_dob",
  "driver_4_license",
  "accidents_3yr",
  "violations_3yr",
  "liability_bi",
  "liability_pd",
  "um_uim",
  "pip",
  "comp_deductible",
  "collision_deductible",
  "policy_number",
  "current_premium",
  "current_carrier",
  "effective_date",
  "expiration_date",
] as const;

export type GeminiExtractKey =
  | (typeof GEMINI_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_AUTO_EXTRACT_JSON_KEYS)[number];

export function geminiKeysForShopLine(shopLine?: string | null): readonly string[] {
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    return GEMINI_AUTO_EXTRACT_JSON_KEYS;
  }
  return GEMINI_EXTRACT_JSON_KEYS;
}

export function buildGeminiSystemPrompt(docType?: string | null, shopLine?: string | null): string {
  const kind = (docType ?? "").trim() || "insurance source document";
  const line = (shopLine ?? "").trim().toLowerCase();
  const keys = geminiKeysForShopLine(shopLine);
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    return `You extract structured fields from Florida personal Auto insurance documents
(auto declaration page, ID card, declarations photos, related insured).

Document type hint: ${kind}
Shop line: Auto

Rules:
- Return ONLY a single JSON object. No markdown fences, no commentary.
- Keys MUST be exactly from this list (omit unknown keys or set value null):
  ${keys.join(", ")}
- Each present key maps to an object: { "value": string|null, "confidence": number }
  where confidence is 0..1 (1 = clearly printed on the page).
- Extract ONLY what is written on the page. Never invent.
- If unknown or not present: value null and low confidence.
- VIN: full 17 characters when printed. Year/make/model per vehicle.
- Drivers: name, DOB, license # when printed. Number vehicles/drivers in order (1 = first listed).
- Money: digits only (no $). Dates: keep as printed.
- named_insured / current_policy_name_insured: primary named insured on the auto dec.
- liability_bi / liability_pd / um_uim / pip / comp_deductible / collision_deductible when printed.
`;
  }
  return `You extract structured fields from Florida personal-lines insurance documents
(wind mitigation OIR-B1-1802, four-point inspection, HO3/dec page, related insured).

Document type hint: ${kind}

Rules:
- Return ONLY a single JSON object. No markdown fences, no commentary.
- Keys MUST be exactly from this list (omit unknown keys or set value null):
  ${keys.join(", ")}
- Each present key maps to an object: { "value": string|null, "confidence": number }
  where confidence is 0..1 (1 = clearly printed / checked on the form).
- Extract ONLY what is written or clearly checked on the page. Never invent.
- If unknown, illegible, unchecked, or not present: value null and low confidence.
- OIR wind-mit checkbox sections: store the LETTER CODE ONLY in value
  (A, B, C, D, F, N, X, ATC, etc.) — never the long printable sentence.
  Examples: roof_shape "A" (not "hip" / not "A. Hip Roof…"); roof_deck_attachment "C"
  (not "C. Plywood/OSB…"); roof_to_wall "A"; swr "A"|"B"|"C"; opening_protection "A";
  building_code "A"|"B"|"C"|"D" (or short form digit if that is what the form shows);
  terrain "B"|"C"|"D". Full label text may be omitted; do not put it in value.
- design_wind_speed: use mph number when Region is checked (110 / 120 / 140 region).
- property_address / mailing_address: full street line; include city/state/zip separately when clear.
- current_policy_name_insured: named insured on a dec/policy.
- construction_type: frame / masonry / manufactured when stated.
- license_number: inspector license or certificate # on wind mit.
- Money: digits only (no $). Dates: keep as printed. Stories / year_built: integers as strings.

Field meaning guidance (from desk synonym brief):
- Wind mit: Owner Name→applicant_name; Address Inspected→property_address; Qualified Inspector→wind_mit_inspector;
  License or Certificate #→license_number; Inspection Company; Roof covering / deck / roof-to-wall / shape / SWR /
  Opening protection / Building Code / Design wind speed (Region); Terrain Exposure; form id→wind_mit_form;
  inspection/form date→wind_mit_date; Roof covering year→roof_year. Checkbox sections: letter only.
- Four-point: Insured/Applicant Name; Address Inspected; year built; stories (MUST when labeled); roof covering / year; construction_type; electrical_year / plumbing_year / hvac_year / water_heater_year (MUST when labeled — year of last update, age, or approx year); electrical_updated (MUST when labeled); electrical_circuit_amps (MUST when labeled — total/circuit amps as digits only, e.g. 200); occupancy / months_occupied when on the form; roof_condition; date_inspected (prefer label "Date Inspected" at top of 4pt — not a stale form stamp); four_point_date; license_number; inspection_company.
- Dec: Named insured; Residence premises / Location; Coverage A; hurricane / AOP / wind-hail deductibles;
  policy number; premium; effective/expiration; mortgagee + mortgagee_address; loan number; ordinance or law; water backup; scheduled personal property;
  Cov B–F when printed; sinkhole_deductible; current_carrier (company/writing company); secondary_named_insured.
`;
}

export function buildGeminiUserPrompt(docType?: string | null, shopLine?: string | null): string {
  const kind = (docType ?? "").trim().toLowerCase();
  let focus =
    "Extract every listed key that is clearly printed or checked. Prefer a non-empty value when the form shows one.";
  if (kind === "wind_mit" || kind.includes("wind")) {
    focus =
      "This is a wind mitigation (OIR-B1-1802). MUST fill when present: applicant_name, property_address, wind_mit_inspector, license_number, inspection_company, roof_covering, roof_deck_attachment, roof_to_wall, roof_shape, swr, opening_protection, building_code, design_wind_speed (110/120/140 region), year_built, wind_mit_form, wind_mit_date, terrain, roof_year. OIR checkbox fields: LETTER CODES ONLY (A/B/C/…). wind_mit_form is typically OIR-B1-1802; wind_mit_date is the inspection/form date; terrain is Terrain Exposure Category (B/C/D); roof_year is the year roof covering installed when printed.";
  } else if (kind === "four_point" || kind.includes("four") || kind.includes("4pt") || kind.includes("4-point")) {
    focus =
      "This is a four-point inspection. MUST fill when labeled on the form: date_inspected (top 'Date Inspected' / 'Date of Inspection' — NOT a footer form-revision stamp), four_point_date (same value when only one date), applicant_name, property_address, year_built, stories, roof_covering, roof_year, construction_type, electrical_year, plumbing_year, hvac_year, water_heater_year, electrical_updated, electrical_circuit_amps, license_number, inspection_company, occupancy, months_occupied. Also fill when present: roof_condition, usage. Prefer date_inspected from the top Date Inspected label over any other date stamp. stories / water_heater_year / electrical_updated / electrical_circuit_amps are required when the form shows them. electrical_circuit_amps: digits only from Total Amps / Circuit Amps / Amps = N (e.g. 200 amps → 200). For system years use the printed year of last update / age / approx year (convert age-in-years to an approximate calendar year when the form shows age only).";
  } else if (kind === "dec" || kind.includes("dec") || kind.includes("declar") || kind === "policy") {
    focus =
      "This is a dec/policy. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, property_address, coverage_a, coverage_b, coverage_c, coverage_d, coverage_e, coverage_f, hurricane_deductible, aop_deductible, wind_hail_deductible, ordinance_law, water_backup, sinkhole_deductible, policy_number, current_premium, current_carrier, effective_date, expiration_date, mortgagee, mortgagee_address, loan_number. Cov A alone is OK when B–F are missing. If the image is actually a four-point (or clearly shows Date Inspected / Date of Inspection), ALSO fill date_inspected and four_point_date from that top inspection date — do not ignore it just because the upload type said dec.";
  } else if (kind === "photo" || kind.includes("photo") || kind === "inspection" || kind.includes("inspect")) {
    focus =
      "This may be a phone photo (JPEG/PNG/HEIC) of a dec, wind mit, 4-point, or inspection — not a PDF. Read the visible text from the image and fill every labeled field you can see. Prefer the same keys as dec / wind mit / four-point when the form type is clear from the page.";
  }
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    focus =
      "This is a personal Auto declaration / ID card / photo of an auto dec. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, phone, email, mailing_address, city, state, zip, vin, vehicle_year, vehicle_make, vehicle_model, vehicle_usage, garaging_zip, garaging_address, vehicle_2_* / vehicle_3_* / vehicle_4_* for additional vehicles, driver_1_* / driver_2_* (and 3/4 when listed), accidents_3yr, violations_3yr, liability_bi, liability_pd, um_uim, pip, comp_deductible, collision_deductible, policy_number, current_premium, current_carrier, effective_date, expiration_date. Read every vehicle and driver block you can see. Do not treat this as homeowners / Coverage A.";
  }
  return `Extract the JSON field object from this ${docType || "insurance"} document. ${focus} Invent nothing. Do not return an empty object when fields are visible.`;
}
