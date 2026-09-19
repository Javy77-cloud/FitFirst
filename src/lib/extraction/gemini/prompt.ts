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
  "location_description",
  "property_information",
  "insured_property",
  "residence_premises",
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
  "protection_class",
  "number_of_families",
  // DP3 / Southern Oak / UPCIC dec rating block extras
  "form",
  "sprinkler",
  "fire_alarm",
  "central_alarm",
  "bceg_grade",
  "loss_of_rents",
  "landlord_liability",
  "fair_rental_value",
  // issued-policy mint (Rosa / HO3 dec) — copy onto the book record
  "premium",
  "selling_agency",
  "renewal_date",
  "producer",
  "insurance_type",
  "roof_age",
  "billing_frequency",
  "next_due",
  "payment_method",
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
  "vehicle_body_class",
  "vehicle_fuel_type",
  "vehicle_engine",
  "vehicle_usage",
  "annual_miles",
  "rideshare",
  "aftermarket_parts",
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
  "driver_1_gender",
  "driver_1_industry",
  "driver_1_occupation",
  "driver_1_education_level",
  "driver_1_marital_status",
  "driver_1_license",
  "driver_1_status",
  "driver_1_years_licensed",
  "driver_1_household_status",
  "driver_1_exclude_reason",
  "driver_1_age_first_licensed",
  "driver_1_suspension_5yr",
  "applicant_gender",
  "applicant_industry",
  "applicant_occupation",
  "driver_2_name",
  "driver_2_dob",
  "driver_2_gender",
  "driver_2_industry",
  "driver_2_occupation",
  "driver_2_education_level",
  "driver_2_marital_status",
  "driver_2_relationship",
  "driver_2_license",
  "driver_2_status",
  "driver_2_years_licensed",
  "driver_2_household_status",
  "driver_2_exclude_reason",
  "driver_2_age_first_licensed",
  "driver_2_suspension_5yr",
  "driver_3_name",
  "driver_3_dob",
  "driver_3_gender",
  "driver_3_industry",
  "driver_3_occupation",
  "driver_3_education_level",
  "driver_3_marital_status",
  "driver_3_relationship",
  "driver_3_license",
  "driver_3_status",
  "driver_3_years_licensed",
  "driver_4_name",
  "driver_4_dob",
  "driver_4_gender",
  "driver_4_industry",
  "driver_4_occupation",
  "driver_4_education_level",
  "driver_4_marital_status",
  "driver_4_relationship",
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
  "years_with_carrier",
  "currently_insured",
] as const;

/** Agency cancellation / AOR letter jobs. Kept off the HO/Auto sheet lists. */
export const GEMINI_LETTER_EXTRACT_JSON_KEYS = [
  "named_insured",
  "current_policy_name_insured",
  "applicant_name",
  "phone",
  "email",
  "mailing_address",
  "policy_number",
  "current_carrier",
  "effective_date",
  "expiration_date",
  "cancellation_date",
  "cancellation_reason",
  "prior_agency",
  "selling_agency",
  "new_agency",
] as const;

export type GeminiExtractKey =
  | (typeof GEMINI_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_AUTO_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_LETTER_EXTRACT_JSON_KEYS)[number];

export function isAgencyLetterGeminiDoc(docType?: string | null): boolean {
  const t = (docType ?? "").trim().toLowerCase();
  return (
    t === "cancellation" ||
    t === "aor" ||
    t === "agency_letter" ||
    t.includes("cancellation") ||
    (t.includes("aor") && !t.includes("four"))
  );
}

export function geminiKeysForShopLine(shopLine?: string | null): readonly string[] {
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    return GEMINI_AUTO_EXTRACT_JSON_KEYS;
  }
  return GEMINI_EXTRACT_JSON_KEYS;
}

export function geminiKeysForExtract(docType?: string | null, shopLine?: string | null): readonly string[] {
  if (isAgencyLetterGeminiDoc(docType)) return GEMINI_LETTER_EXTRACT_JSON_KEYS;
  return geminiKeysForShopLine(shopLine);
}

export function buildGeminiSystemPrompt(docType?: string | null, shopLine?: string | null): string {
  const kind = (docType ?? "").trim() || "insurance source document";
  const line = (shopLine ?? "").trim().toLowerCase();
  const keys = geminiKeysForExtract(docType, shopLine);
  if (isAgencyLetterGeminiDoc(docType)) {
    return `You extract structured fields from Florida agency letters and source decs used to fill a Cancellation request or Agent of Record (AOR) pack.

Document type hint: ${kind}

Rules:
- Return ONLY a single JSON object. No markdown fences, no commentary.
- Keys MUST be exactly from this list (omit unknown keys or set value null):
  ${keys.join(", ")}
- Each present key maps to an object: { "value": string|null, "confidence": number }
  where confidence is 0..1 (1 = clearly printed on the page).
- Extract ONLY what is written on the page. Never invent.
- If unknown or not present: value null and low confidence.
- named_insured / current_policy_name_insured / applicant_name: primary named insured.
- mailing_address: Insured / mailing address only.
- policy_number: Policy No / Pol # / Policy # when printed.
- current_carrier: writing company / carrier.
- effective_date: policy effective / inception date.
- cancellation_date / cancellation_reason: only when the page is a cancellation request or states a cancel date/reason.
- prior_agency / selling_agency: the outgoing / current agency on an AOR or dec.
- new_agency: the incoming agency on an AOR letter when printed.
- Dates: keep as printed. Phone / email when printed.
`;
  }
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
- VIN: MUST fill when a Vehicle Identification Number / VIN / 17-character code is printed (ignore spaces or dashes). Use key "vin" for vehicle 1; vehicle_2_vin / vehicle_3_vin / vehicle_4_vin for additional vehicles. Also fill year/make/model/body class/fuel/engine per vehicle.
- Drivers: for EVERY listed driver, extract demographics when printed — name, DOB, gender (Male/Female), industry, occupation, education_level, marital_status, license #, license status, years licensed, household status (Resident / Occasional / Excluded driver / Listed driver / Non-resident), exclude reason, age first licensed, suspension in last 5 years.
- Do NOT invent extra drivers. Only output driver_N_* keys when that numbered person is actually listed on the page. Never invent a driver 3 from the named insured, a household member, or a lienholder. If only one or two drivers are listed, omit driver_3_* and driver_4_*.
- Relationship: Driver 1 is the named insured — NEVER output driver_1_relationship (no relationship-to-self). For drivers 2+ use relationship relative to Driver 1 (Spouse / Child / Parent / Sibling / Other relative / Roommate / Excluded / Listed non-driver).
- Do not extract employment / employment status. Industry and occupation are separate fields.
- Money: digits only (no $). Dates: keep as printed.
- named_insured / current_policy_name_insured: primary named insured on the auto dec.
- liability_bi / liability_pd / um_uim / pip / comprehensive deductible (comp_deductible) / collision_deductible when printed. Spell comprehensive in values when a label is needed — never shorthand "comp" for that coverage.
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
- property_address / location_description / property_information / insured_property / residence_premises:
  the RISK — Property information, Location description, Residence premises, Insured property / Location.
  NEVER copy Insured / mailing address into these keys when the two addresses differ.
  Rosa example: mailing "8561 SW 85th St Ave" is where they live; property "18025 Cypress Point Rd, Fort Myers" is the risk.
- mailing_address: Insured / mailing address only (where they live). Distinct from the risk. Full street line;
  include city/state/zip separately when clear.
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
- Dec: Named insured; Residence premises / Location description / Property information / insured property → property_address
  (the RISK — never the Insured/mailing address when they differ); mailing_address is Insured/mailing only;
  Coverage A / dwelling; hurricane / AOP / wind-hail deductibles;
  policy number (Policy No / Pol # / Policy # → policy_number); premium / current_premium / total premium / annual premium
  (issued total — not a prior quote); effective_date (Eff date / policy period start); expiration_date;
  renewal_date = policy expiration date from the dec (same as expiration_date);
  selling_agency; producer; insurance_type; form (HO3/DP-3);
  Homeowners billing_frequency is always annual / yearly (do not invent 6-month on HO; Auto may be 6 or 12 months);
  next_due on annual HO = expiration/renewal date;
  payment_method: if Additional Interest / Mortgagee is present → billed through mortgagee / escrow;
  if no mortgagee → client direct payment;
  mortgagee + mortgagee_address (dec bottom Additional Interest / Mortgagee — if blank set mortgagee to "No mortgage");
  loan number; roof_year / roof_age (only when printed on the dec or listed on the master sheet — never invent);
  ordinance or law; water backup; scheduled personal property;
  Cov B–F when printed; sinkhole_deductible; current_carrier (company/writing company); secondary_named_insured;
  opening_protection; sprinkler; fire_alarm/central_alarm; bceg_grade; roof_covering/shape;
  loss_of_rents/fair_rental_value; landlord_liability (Cov L on DP).
`;
}

export function buildGeminiUserPrompt(docType?: string | null, shopLine?: string | null): string {
  const kind = (docType ?? "").trim().toLowerCase();
  let focus =
    "Extract every listed key that is clearly printed or checked. Prefer a non-empty value when the form shows one.";
  if (isAgencyLetterGeminiDoc(docType)) {
    focus =
      kind.includes("aor")
        ? "This is an Agent of Record pack / AOR letter (or a dec used to fill one). MUST fill when present: named_insured, policy_number, current_carrier, effective_date, mailing_address, phone, email, prior_agency / selling_agency, new_agency. Do not invent a cancellation date."
        : "This is a cancellation request (or a dec used to fill one). MUST fill when present: named_insured, policy_number, current_carrier, effective_date, mailing_address, phone, email, cancellation_date, cancellation_reason. Invent nothing.";
  }
  if (kind === "wind_mit" || kind.includes("wind")) {
    focus =
      "This is a wind mitigation (OIR-B1-1802). MUST fill when present: applicant_name, property_address, wind_mit_inspector, license_number, inspection_company, roof_covering, roof_deck_attachment, roof_to_wall, roof_shape, swr, opening_protection, building_code, design_wind_speed (110/120/140 region), year_built, wind_mit_form, wind_mit_date, terrain, roof_year. OIR checkbox fields: LETTER CODES ONLY (A/B/C/…). wind_mit_form is typically OIR-B1-1802; wind_mit_date is the inspection/form date; terrain is Terrain Exposure Category (B/C/D); roof_year is the year roof covering installed when printed.";
  } else if (kind === "four_point" || kind.includes("four") || kind.includes("4pt") || kind.includes("4-point")) {
    focus =
      "This is a four-point inspection. MUST fill when labeled on the form: date_inspected (top 'Date Inspected' / 'Date of Inspection' — NOT a footer form-revision stamp), four_point_date (same value when only one date), applicant_name, property_address, year_built, stories, roof_covering, roof_year, construction_type, electrical_year, plumbing_year, hvac_year, water_heater_year, electrical_updated, electrical_circuit_amps, license_number, inspection_company, occupancy, months_occupied. Also fill when present: roof_condition, usage. Prefer date_inspected from the top Date Inspected label over any other date stamp. stories / water_heater_year / electrical_updated / electrical_circuit_amps are required when the form shows them. electrical_circuit_amps: digits only from Total Amps / Circuit Amps / Amps = N (e.g. 200 amps → 200). For system years use the printed year of last update / age / approx year (convert age-in-years to an approximate calendar year when the form shows age only).";
  } else if (kind === "dec" || kind.includes("dec") || kind.includes("declar") || kind === "policy") {
    focus =
      "This is a dec/policy. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, property_address / location_description / property_information / insured_property / residence_premises (the RISK from Property information / Location description / Residence premises / Insured property — NEVER the Insured/mailing address when they differ; Rosa: 18025 Cypress Point Rd, Fort Myers is the risk, not 8561 SW 85th St Ave), mailing_address (Insured/mailing only), coverage_a (dwelling), coverage_b, coverage_c, coverage_d, coverage_e, coverage_f, hurricane_deductible, aop_deductible, wind_hail_deductible, ordinance_law, water_backup, sinkhole_deductible, policy_number (Florida Peninsula and similar: Policy No / Pol # / Policy # / policy number all map to policy_number — never leave it empty when printed), premium, current_premium (same issued total premium on a dec — Total Premium / Annual Premium / Total Annual Premium; not a shopping quote), current_carrier, effective_date (Eff date / policy period start), expiration_date, renewal_date (same as expiration_date), selling_agency, producer, insurance_type, billing_frequency (Homeowners: annual / yearly; Auto may be 6 or 12 months — do not force annual on auto), next_due (annual HO: same as expiration/renewal), payment_method (mortgagee present → billed through mortgagee / escrow; no mortgage → client direct payment), mortgagee (dec bottom Additional Interest / Mortgagee — if blank set 'No mortgage'), mortgagee_address, loan_number, protection_class, number_of_families, year_built, construction_type, occupancy, usage, form (HO3/DP-3/DP3/HO-3 etc from title or Form line), opening_protection, sprinkler (Automatic Sprinklers), fire_alarm / central_alarm (Fire Alarm / Burglar), bceg_grade (BCEG Grade), roof_covering, roof_shape, roof_year, roof_age (only when printed — never invent), loss_of_rents / fair_rental_value (Coverage D Fair Rental Value limit), landlord_liability (Coverage L Personal Liability when dwelling/DP). For sinkhole_deductible: if the dec says the policy does NOT provide sinkhole coverage (or only catastrophic ground cover collapse) and sinkhole may be purchased for additional premium, set sinkhole_deductible to No — do not leave it blank. For water_backup: only fill when an endorsement/limit is printed; do not invent. For sprinkler/fire_alarm/opening_protection: when Rating Information says None, set value to no or None — do not leave blank. Cov A alone is OK when B–F are missing. If the image is actually a four-point (or clearly shows Date Inspected / Date of Inspection), ALSO fill date_inspected and four_point_date from that top inspection date — do not ignore it just because the upload type said dec. Also set document_kind to declaration if this is a declarations page. If this is a quote packet, wind mit, inspection, or otherwise does not look like a dec, set document_kind to not_declaration and leave policy fields empty.";
  } else if (kind === "photo" || kind.includes("photo") || kind === "inspection" || kind.includes("inspect")) {
    focus =
      "This may be a phone photo (JPEG/PNG/HEIC) of a dec, wind mit, 4-point, or inspection — not a PDF. Read the visible text from the image and fill every labeled field you can see. Prefer the same keys as dec / wind mit / four-point when the form type is clear from the page.";
  }
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    focus =
      "This is a personal Auto declaration / ID card / photo of an auto dec — not homeowners. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, phone, email, mailing_address, city, state, zip, vin (Vehicle Identification Number — full 17 characters; also search labels VIN / Veh Ident No), vehicle_year, vehicle_make, vehicle_model, vehicle_body_class, vehicle_fuel_type, vehicle_engine, vehicle_usage, annual_miles, rideshare, aftermarket_parts, garaging_zip, garaging_address, and vehicle_2_* / vehicle_3_* / vehicle_4_* only for additional vehicles that are actually listed. For each listed driver (1–4): name, dob, gender (Male/Female only), industry, occupation, education_level, marital_status, license, license status, years_licensed, household_status, exclude_reason, age_first_licensed, suspension_5yr. For drivers 2+ also fill relationship relative to Driver 1. Never fill driver_1_relationship. Never invent a driver 3 (or any extra driver) who is not printed. Never fill employment / employment status — use industry + occupation only. Also fill applicant_gender, applicant_industry, applicant_occupation, accidents_3yr, violations_3yr, liability_bi, liability_pd, um_uim, pip, comp_deductible (comprehensive deductible), collision_deductible, policy_number, current_premium, current_carrier, effective_date, expiration_date, years_with_carrier, currently_insured. For vehicle_usage use Personal / Commute / Business / Farm when stated. For annual_miles map stated yearly miles into the closest bracket (0 – 2,999 … 11,000 – 11,999, then 12,000 – 14,999 / 15,000 – 19,999 / 20,000 – 24,999 / 25,000+). For rideshare answer yes/no if the dec or notes mention Uber/Lyft/TNC. For aftermarket_parts answer yes/no for non-factory/custom/aftermarket equipment. For currently_insured map continuous coverage or lapse wording into one of: Currently insured 6 months or more; Lapse within last 30 days — 7 days or less; Lapse within last 30 days — 8 to 14 days; Lapse within last 30 days — 15 to 30 days; More than 30 days lapse in the last 6 months / no prior insurance; Other. Read every vehicle and driver block you can see. Do not treat this as homeowners / Coverage A.";
  }
  return `Extract the JSON field object from this ${docType || "insurance"} document. ${focus} Invent nothing. Do not return an empty object when fields are visible.`;
}
