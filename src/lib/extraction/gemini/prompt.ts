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
  "screen_enclosure",
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
  "aaa_member",
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
  "requested_years",
  "loss_run_years",
  "request_reason",
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
    t === "loss_run" ||
    t === "agency_letter" ||
    t === "agency-loss-run" ||
    t.includes("cancellation") ||
    t.includes("loss") ||
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
- requested_years / loss_run_years / request_reason: only on a loss-run request.
- Dates: keep as printed. Phone / email when printed.
`;
  }
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    return `You read personal Auto policies and Auto declarations (phone photos and PDFs) into an Auto risk profile.
In scope: carrier declaration pages, auto policy jackets, ID cards, and ACORD 90 (Progressive, GEICO, State Farm, Allstate, Travelers, and similar). This is not a homeowners dec.

Document type hint: ${kind}
Shop line: Auto

Return ONLY one JSON object. No markdown. Omit keys that are not printed. Never invent. Never return an empty object when a VIN, vehicle, driver, coverage, date, carrier, or policy number is visible. If this file is a wind mitigation (OIR-B1-1802), four-point, shopping quote, or not an issued auto policy, set document_kind to wind_mit or not_declaration and leave policy_number, current_premium, effective_date, and expiration_date empty. If policy number, premium, or dates are printed, document_kind is declaration — do not mark the page not_declaration.

Each present key is { "value": string, "confidence": number } (confidence 0..1) or a plain string.

Fill these first, in this order, when printed. Current Policy comes before vehicles and drivers so a long page cannot drop the carrier.
1. Current Policy. Do not leave these empty when the dec prints them. Copy only what is printed.
   - current_carrier: the named insurer / writing company. Copy the full company name (Allstate Fire and Casualty Insurance Company, not Allstate).
   - policy_number: Policy Number, Policy No, Policy #, or Current policy ID. Keep internal spaces (941 953 485).
   - effective_date and expiration_date: policy period from/to, as printed, including a month name (Sept 29, 2026). Travelers often prints 12:01 A.M. before each date — put only the date in the field (September 21, 2026 and March 21, 2027), not the clock.
   - current_premium: the policy term total when printed, digits only, cents kept (3393.51). On a Travelers (or similar) issued auto policy read Total Premium, Full Term Premium, 6 Month Premium, Total Premium for This Policy, or Premium Due when that figure is the term total (2109.00 stays 2109.00). A coverage schedule's last Total / Full Term row is the term total. Do not use one coverage-line premium (Bodily Injury 412 is not the term premium). This is not a shopping quote. A phone photo or HEIC of the declarations page counts — read the same labels.
   - Multi-page Travelers Automobile Policy Declarations (filenames like “Adriana Iori DEC Page Travelers.pdf”) keep the policy number and the policy period on the declarations header (page 1) and the Total or Full Term premium on a later coverage page. Copy policy_number, effective_date, expiration_date, and current_premium to those top-level keys even when they are on different pages. If Begins/Ends (or From/To) dates are filled, policy_number from the same header MUST be filled too — never return dates without the Policy Number printed beside them (Travelers Indemnity / The Travelers Indemnity Company layouts). Period labels may be Begins and Ends or From and To, including 12:01 A.M. Do not invent a policy number, premium, or date.
   - years_with_carrier, currently_insured, and aaa_member only when that fact is printed. Do not calculate years from the dates. Do not treat a declarations page as "Currently insured 6 months or more". Do not guess AAA tenure. Leave those three out when the page does not state them.
2. Vehicles and VIN. vin is the 17-character vehicle identification number (labels: VIN, V.I.N., Vehicle Identification No). vehicle_year, vehicle_make, vehicle_model from columns or from one cell such as "2019 TOYOTA CAMRY". More vehicles: vehicle_2_*, vehicle_3_*, vehicle_4_* (vin, year, make, model, plus use, garaging address, annual miles, and lienholder when that car prints them).
3. Drivers. List each person once. The same name and date of birth is one driver — do not repeat them as driver 2 and driver 3. driver_1_name is the full printed legal name: first, middle name or middle initial, and the complete last name. Do not truncate. "Domenic M Iori" stays "Domenic M Iori" — never "Domenic Ic", "Domenic I", or "D. Iori". If First / Middle / Last are separate columns, join them in that order. Then driver_1_dob, driver_1_license, and driver_2_* only for a different person. Add gender (Male/Female only), marital status, and relationship for drivers 2+ when printed. Never fill driver_1_relationship. Never fill employment — use industry and occupation only when printed.
4. Coverage limits, only when a page prints them. Do not invent coverages. Page 1 of a dec often has the carrier and vehicles and no BI/PD/UM/PIP/comp/collision table — omit those keys. Read every page of a multi-page PDF. If page 2 or a later page prints the coverage table, fill from that page: Bodily Injury or Liability Bodily Injury → liability_bi as 100/300 (not 100000/300000). If Each Person and Each Accident are separate cells, join them as 100/300. Property Damage → liability_pd digits (100000). Uninsured or Underinsured Motorist, including Uninsured Motorist Bodily Injury → um_uim. PIP or Personal Injury Protection → pip digits. Comprehensive or Other Than Collision → comp_deductible (comprehensive deductible). Collision → collision_deductible. Medical payments, rental reimbursement, and towing are separate from PIP — include them only when printed (med_pay, rental, towing).
5. When printed, also include: term_length (6 month or 12 month — do not calculate it from the dates), each driver's license_state, relationship, and excluded yes/no, each vehicle's use, garaging address, annual miles, lienholder or loss payee, and that vehicle's own premium. List discounts in a discounts array. Named insured may be printed LAST FIRST or LAST, FIRST — copy it as printed. A phone photo may be sideways, upside down, or skewed; read the page as if it were upright.

Current Policy example (emit a key only when that fact is printed. Never copy these sample values):
{"current_carrier":{"value":"Allstate Fire and Casualty Insurance Company","confidence":0.95},"policy_number":{"value":"941 953 485","confidence":0.95},"effective_date":{"value":"Sept 29, 2026","confidence":0.95},"expiration_date":{"value":"Mar 29, 2027","confidence":0.95},"current_premium":{"value":"3393.51","confidence":0.95}}

Vehicle and driver example (include only keys you can read; one row per person):
{"vin":{"value":"4T1B11HK5KU123456","confidence":0.95},"vehicle_year":{"value":"2019","confidence":0.95},"vehicle_make":{"value":"TOYOTA","confidence":0.95},"vehicle_model":{"value":"CAMRY","confidence":0.9},"driver_1_name":{"value":"Domenic M Iori","confidence":0.95},"driver_1_dob":{"value":"04/02/1984","confidence":0.9},"driver_1_license":{"value":"R400-123-45-678","confidence":0.9}}

Coverage example — only when some page prints a coverage table. If no page shows limits, omit every key below. Do not invent coverages:
{"liability_bi":{"value":"100/300","confidence":0.9},"liability_pd":{"value":"100000","confidence":0.9},"um_uim":{"value":"100/300","confidence":0.9},"pip":{"value":"10000","confidence":0.9},"comp_deductible":{"value":"500","confidence":0.9},"collision_deductible":{"value":"500","confidence":0.9}}

Other allowed keys when printed: ${keys.join(", ")}
Money: digits only (no $); keep cents. Dates: keep as printed. Never invent a carrier, policy ID, premium, date, coverage, VIN, or driver name.
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
- mailing_address: Insured / mailing address only when it is a DIFFERENT place from the risk. Full street line;
  include city/state/zip separately when clear. If the page prints only one address, put it on
  property_address and leave mailing_address null.
- Liability-only policy (personal liability, manufactured-home liability, no dwelling / Coverage A printed):
  fill Current Policy, named insured, property_address (the printed location), coverage_e, coverage_f,
  carrier, policy number, dates, and premium when they are printed. Do NOT invent year_built,
  square_feet, construction, roof, coverage_a, tie-downs, HUD label, unit make, unit model,
  unit year, or other manufactured-home facts that are not printed. Leave those keys null so
  property and flood APIs can fill the blanks.
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
  Cov B–F when printed (B/C/D and ordinance: keep a printed percent as 10%; keep a printed dollar limit as digits; E/F are dollar limits); sinkhole_deductible; current_carrier (company/writing company); secondary_named_insured;
  opening_protection; sprinkler; fire_alarm/central_alarm; bceg_grade; roof_covering/shape;
  loss_of_rents/fair_rental_value; landlord_liability (Cov L on DP).
`;
}

export function buildGeminiUserPrompt(docType?: string | null, shopLine?: string | null): string {
  const kind = (docType ?? "").trim().toLowerCase();
  let focus =
    "Extract every listed key that is clearly printed or checked. Prefer a non-empty value when the form shows one.";
  if (isAgencyLetterGeminiDoc(docType)) {
    focus = kind.includes("aor")
      ? "This is an Agent of Record pack / AOR letter (or a dec used to fill one). MUST fill when present: named_insured, policy_number, current_carrier, effective_date, mailing_address, phone, email, prior_agency / selling_agency, new_agency. Do not invent a cancellation date."
      : kind.includes("loss")
        ? "This is a No Run Loss / loss-run request (or a dec used to fill one). MUST fill when present: named_insured, policy_number, current_carrier, effective_date, mailing_address, phone, email, requested_years / loss_run_years, request_reason, new_agency. Invent nothing."
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
      "This is a dec/policy. Liability-only (no Coverage A / dwelling limit printed): fill Current Policy, named insured, the one printed address as property_address, coverage_e, coverage_f, carrier, policy number, dates, and premium. Do not invent year_built, square feet, construction, roof, coverage_a, tie-downs, HUD label, or unit make/model/year. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, property_address / location_description / property_information / insured_property / residence_premises (the RISK from Property information / Location description / Residence premises / Insured property — NEVER the Insured/mailing address when they differ; Rosa: 18025 Cypress Point Rd, Fort Myers is the risk, not 8561 SW 85th St Ave), mailing_address (Insured/mailing only), coverage_a (dwelling), coverage_b, coverage_c, coverage_d, coverage_e, coverage_f, hurricane_deductible, aop_deductible, wind_hail_deductible, ordinance_law, water_backup, screen_enclosure (screened enclosure / lanai limit only when printed), sinkhole_deductible, policy_number (Florida Peninsula and similar: Policy No / Pol # / Policy # / policy number all map to policy_number — never leave it empty when printed), premium, current_premium (same issued total premium on a dec — Total Premium / Annual Premium / Total Annual Premium; not a shopping quote), current_carrier, effective_date (Eff date / policy period start), expiration_date, renewal_date (same as expiration_date), selling_agency, producer, insurance_type, billing_frequency (Homeowners: annual / yearly; Auto may be 6 or 12 months — do not force annual on auto), next_due (annual HO: same as expiration/renewal), payment_method (mortgagee present → billed through mortgagee / escrow; no mortgage → client direct payment), mortgagee (dec bottom Additional Interest / Mortgagee — if blank set 'No mortgage'), mortgagee_address, loan_number, protection_class, number_of_families, year_built, construction_type, occupancy, usage, form (HO3/DP-3/DP3/HO-3 etc from title or Form line), opening_protection, sprinkler (Automatic Sprinklers), fire_alarm / central_alarm (Fire Alarm / Burglar), bceg_grade (BCEG Grade), roof_covering, roof_shape, roof_year, roof_age (only when printed — never invent), loss_of_rents / fair_rental_value (Coverage D Fair Rental Value limit), landlord_liability (Coverage L Personal Liability when dwelling/DP). For sinkhole_deductible: if the dec says the policy does NOT provide sinkhole coverage (or only catastrophic ground cover collapse) and sinkhole may be purchased for additional premium, set sinkhole_deductible to No — do not leave it blank. For water_backup: only fill when an endorsement/limit is printed; do not invent. For sprinkler/fire_alarm/opening_protection: when Rating Information says None, set value to no or None — do not leave blank. Cov A alone is OK when B–F are missing. Coverage B, C, D, and ordinance or law: store a printed percent as 10% and a printed dollar limit as digits. Coverage E and F: dollar limits. Leave coverage_a null when the page does not print a dwelling limit — do not estimate it. Leave hurricane_deductible and aop_deductible null when they are not printed. If the image is actually a four-point (or clearly shows Date Inspected / Date of Inspection), ALSO fill date_inspected and four_point_date from that top inspection date — do not ignore it just because the upload type said dec. Also set document_kind to declaration if this is a declarations page. If this is a quote packet, wind mit, inspection, or otherwise does not look like a dec, set document_kind to not_declaration and leave policy fields empty.";
  } else if (kind === "photo" || kind.includes("photo") || kind === "inspection" || kind.includes("inspect")) {
    focus =
      "This may be a phone photo (JPEG/PNG/HEIC) of a dec, wind mit, 4-point, or inspection — not a PDF. Read the visible text from the image and fill every labeled field you can see. Prefer the same keys as dec / wind mit / four-point when the form type is clear from the page.";
  }
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    focus =
      "This photo, HEIC, or PDF is an issued Auto policy or Auto declaration (Travelers and similar carrier dec, policy jacket, ID card, or ACORD 90) — not a shopping quote. Do not treat this as homeowners / Coverage A. Read every page. The declarations block is often the first pages; a later page can hold the premium total. A multi-page Travelers Automobile Policy Declarations file (names like “Adriana Iori DEC Page Travelers.pdf”) prints policy number and the policy period on the page 1 header (Begins and Ends, or From and To) and the Total or Full Term premium on a later coverage page — still fill policy_number, effective_date, expiration_date, and current_premium. Ignore the contract jacket. Fill Current Policy first when printed: current_carrier (the writing company actually printed — Travelers, or The Standard Fire Insurance Company when that is the name on the page; do not invent a carrier), policy_number (Policy Number / Policy No / Policy # / Current policy ID; keep spaces), effective_date and expiration_date (Policy Period From and To, or Begins and Ends. Travelers prints 12:01 A.M. before each date — store September 21, 2026 and March 21, 2027, not the clock), current_premium (Total Premium, Full Term Premium, 6 Month Premium, the coverage-schedule Total or Full Term row, Total Premium for This Policy, or Premium Due when that is the term total — keep cents; not one coverage-line premium such as Bodily Injury 412). Do not leave those empty when they are printed, and do not invent a number, premium, or date that is not on the page. years_with_carrier, currently_insured, and aaa_member only when those facts are printed — do not invent them. Then vin and vehicle_year / vehicle_make / vehicle_model (split a cell like 2019 TOYOTA CAMRY; vehicle_2_* for the next car). driver_1_name is the full legal name — Domenic M Iori, never Domenic Ic. List each person once; the same name and date of birth is not driver 2 and driver 3. Coverage limits only from a printed coverage table on any page, including page 2 of a multi-page dec — Bodily Injury liability_bi as 100/300, Property Damage liability_pd as digits, UM/UIM um_uim, PIP pip, comprehensive deductible comp_deductible, collision_deductible. If this file's pages do not show those limits, omit them. Do not invent coverages. Also fill when printed: industry, occupation, gender (Male/Female only), marital status, garaging address and ZIP. Never fill driver_1_relationship. Never fill employment / employment status — use industry + occupation only. If this file is a wind mitigation, four-point, or shopping quote, set document_kind to wind_mit or not_declaration and leave policy number, premium, and dates empty. Do not return {} and do not mark the page not_declaration when a VIN, vehicle, driver, coverage table, carrier, policy number, or premium is visible. A JPG, PNG, HEIC, or PDF of this dec is the same document — a phone photo may be rotated or skewed, so read it upright. When printed, also return term length, license state, excluded drivers, lienholder or loss payee, annual miles, garaging address, per-vehicle premium, med pay, rental, towing, and discounts. Copy a LAST FIRST or LAST, FIRST name as printed.";
  }
  return `Extract the JSON field object from this ${docType || "insurance"} document. ${focus} Invent nothing. Do not return an empty object when fields are visible.`;
}
