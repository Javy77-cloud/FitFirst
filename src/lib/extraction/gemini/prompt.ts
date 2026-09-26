/**
 * System instructions for FL insurance source-doc extraction (Gemini).
 * Field meanings follow the archived synonym / checkbox / field-map brief.
 */

export const GEMINI_EXTRACT_JSON_KEYS = [
  "applicant_name",
  "property_address",
  "year_built",
  "year_of_construction",
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
  "term_months",
  "term_length",
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
  "coverage_a_premium",
  "coverage_b_premium",
  "coverage_c_premium",
  "coverage_d_premium",
  "coverage_e_premium",
  "coverage_f_premium",
  "sinkhole_deductible",
  "personal_injury",
  "personal_injury_premium",
  "personal_property_replacement_cost_premium",
  "home_computer",
  "home_computer_premium",
  "ordinance_law_premium",
  "water_backup_premium",
  "theft",
  "loss_assessment",
  "loss_assessment_premium",
  "limited_fungi",
  "limited_fungi_premium",
  "unit_owners_coverage_a",
  "unit_owners_coverage_a_premium",
  "catastrophic_ground_cover_collapse",
  "catastrophic_ground_cover_collapse_premium",
  "property_and_liability_coverages_premium",
  "extended_replacement_cost_dwelling",
  "replacement_cost_contents",
  "replacement_cost_dwelling",
  "type_of_residence",
  "current_carrier",
  "secondary_named_insured",
  "mortgagee_address",
  "protection_class",
  "number_of_families",
  // DP3 / Southern Oak / UPCIC dec rating block extras
  "form",
  "occupied_by",
  "usage_type",
  "sprinkler",
  "automatic_sprinklers",
  "fire_alarm",
  "central_alarm",
  "bceg_grade",
  "dwelling_type",
  "townhouse_rowhouse",
  "dwelling_replacement_cost",
  "personal_property_replacement_cost",
  "burglar_alarm",
  "unit_year",
  "unit_make",
  "unit_serial",
  "unit_length",
  "unit_width",
  "roof_material",
  "date_of_roof_installation",
  "scheduled_carport",
  "scheduled_screen_room",
  "scheduled_shed",
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
  "vehicle_2_usage",
  "vehicle_2_annual_miles",
  "vehicle_2_garaging_zip",
  "vehicle_2_garaging_address",
  "vehicle_2_lienholder",
  "vehicle_3_vin",
  "vehicle_3_year",
  "vehicle_3_make",
  "vehicle_3_model",
  "vehicle_3_usage",
  "vehicle_3_annual_miles",
  "vehicle_3_garaging_zip",
  "vehicle_3_garaging_address",
  "vehicle_3_lienholder",
  "vehicle_4_vin",
  "vehicle_4_year",
  "vehicle_4_make",
  "vehicle_4_model",
  "vehicle_4_usage",
  "vehicle_4_annual_miles",
  "vehicle_4_garaging_zip",
  "vehicle_4_garaging_address",
  "vehicle_4_lienholder",
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
  "pip_deductible",
  "liability_bi_premium",
  "liability_pd_premium",
  "pip_premium",
  "um_uim_premium",
  "um_pd",
  "um_pd_premium",
  "um_stacked",
  "comp_premium",
  "collision_premium",
  "med_pay",
  "med_pay_premium",
  "rental",
  "rental_premium",
  "towing",
  "towing_premium",
  "glass",
  "glass_premium",
  "glass_limit",
  "liability_bi_deductible",
  "liability_pd_deductible",
  "med_pay_deductible",
  "um_uim_deductible",
  "um_pd_deductible",
  "rental_deductible",
  "towing_deductible",
  "comp_limit",
  "collision_limit",
  "discounts",
  "ers",
  "vehicle_1_premium",
  "vehicle_1_comp_deductible",
  "vehicle_1_collision_deductible",
  "vehicle_1_comp_premium",
  "vehicle_1_collision_premium",
  "vehicle_2_premium",
  "vehicle_2_comp_deductible",
  "vehicle_2_collision_deductible",
  "vehicle_2_comp_premium",
  "vehicle_2_collision_premium",
  "vehicle_2_rental",
  "vehicle_2_towing",
  "vehicle_2_glass",
  "vehicle_3_premium",
  "vehicle_3_comp_deductible",
  "vehicle_3_collision_deductible",
  "vehicle_3_comp_premium",
  "vehicle_3_collision_premium",
  "vehicle_3_rental",
  "vehicle_3_towing",
  "vehicle_3_glass",
  "vehicle_4_premium",
  "vehicle_4_comp_deductible",
  "vehicle_4_collision_deductible",
  "vehicle_4_comp_premium",
  "vehicle_4_collision_premium",
  "vehicle_4_rental",
  "vehicle_4_towing",
  "vehicle_4_glass",
  "vehicle_1_rental",
  "vehicle_1_towing",
  "vehicle_1_glass",
  "driver_1_license_state",
  "driver_2_license_state",
  "driver_3_license_state",
  "driver_4_license_state",
  "policy_number",
  "current_premium",
  "current_carrier",
  "effective_date",
  "expiration_date",
  "term_months",
  "term_length",
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

/** Selective Flood / NFIP declaration. Not the HO3 Coverage A–F list. */
export const GEMINI_FLOOD_EXTRACT_JSON_KEYS = [
  "named_insured",
  "current_policy_name_insured",
  "property_address",
  "mailing_address",
  "policy_number",
  "current_carrier",
  "premium",
  "current_premium",
  "effective_date",
  "expiration_date",
  "term_months",
  "form",
  "mortgagee",
  "loan_number",
  "building_occupancy",
  "number_of_units",
  "primary_residence",
  "property_description",
  "prior_nfip_claims",
  "date_of_construction",
  "year_built",
  "flood_zone",
  "first_floor_height",
  "ffh_method",
  "building_description_detail",
  "building_limit",
  "building_premium",
  "building_deductible",
  "contents_limit",
  "contents_premium",
  "contents_deductible",
  "loss_of_use",
  "loss_of_use_premium",
  "debris_removal",
  "debris_removal_premium",
  "sandbags_supplies_labor",
  "sandbags_supplies_labor_premium",
  "property_removed_to_safety",
  "property_removed_to_safety_premium",
  "increased_cost_of_compliance",
  "increased_cost_of_compliance_premium",
  "replacement_cost_on_contents",
  "replacement_cost_on_contents_premium",
  "basement_contents",
  "basement_contents_premium",
  "pool_repair_and_refill",
  "pool_repair_and_refill_premium",
  "unattached_structures",
  "unattached_structures_premium",
  "temporary_living_expenses",
  "temporary_living_expenses_premium",
  "replacement_cost_on_building",
  "replacement_cost_on_building_premium",
  "outdoor_trees_shrubs_plants",
  "outdoor_trees_shrubs_plants_premium",
  "flood_deductible",
  "flood_deductible_premium",
] as const;

export type GeminiExtractKey =
  | (typeof GEMINI_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_AUTO_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_LETTER_EXTRACT_JSON_KEYS)[number]
  | (typeof GEMINI_FLOOD_EXTRACT_JSON_KEYS)[number];

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
  if (line === "flood") return GEMINI_FLOOD_EXTRACT_JSON_KEYS;
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
  if (line === "flood") {
    return `You extract structured fields from a Flood declaration (Selective Flood, NFIP, or another flood carrier). This is not a homeowners HO3 policy.

Document type hint: ${kind}

Rules:
- Return ONLY a single JSON object. No markdown fences, no commentary.
- Keys MUST be exactly from this list (omit unknown keys or set value null):
  ${keys.join(", ")}
- Each present key maps to an object: { "value": string|null, "confidence": number }
  where confidence is 0..1.
- Extract ONLY what is printed. Never invent. N/A printed on the page is the value N/A, not a blank.
- form is FLD when the form block or the policy number starts with FLD. Otherwise form is Flood. Never Home, HO3, HO, or Dwelling.
- Rating facts, on every page, when printed. Selective / NFIP often titles this Rating Information or Location and Property Information. Neptune and other private flood carriers may title it Property Information, Building Information, or Underwriting, or print the flood zone in a summary box and the other facts elsewhere. A flood zone alone is not the whole block. Read each of these when that fact is printed, and leave it null when it is not: building_occupancy (Building Occupancy or Occupancy), number_of_units, primary_residence (Primary Residence or Primary Home; Yes or No), property_description, prior_nfip_claims (Prior NFIP Claims, Prior Claims, or Prior Losses — copy the printed words, do not invent a count), date_of_construction (the printed date, not only the year), year_built (the four-digit year from that date), flood_zone (Flood Zone or Current Flood Zone), first_floor_height (First Floor Height or FFH, include the unit), ffh_method (Most Favorable FFH Method, or Method Used to Determine First Floor Height), building_description_detail. N/A stays N/A.
- Coverages come from the premises schedule (Coverages & Premiums at the Premises, or the NFIP coverage table). Read every row, including the children under the heading C. Other Coverages. A printed $0 is the value 0. Included stays Included. No stays No. Yes stays Yes. Do not turn Included, No, or Yes into a dollar.
- Some Neptune pages print only Limit of Liability, with no Annual Premium column. Copy the limit and leave that row's premium null. Do not invent Included, $0, or any other premium. When a premium column is printed, copy that cell too: Included stays Included, and a deductible credit stays negative (-131.00).
- Building / A. Dwelling → building_limit and building_premium when a premium is printed. Contents / B. Personal Property → contents_limit and contents_premium, even when the limit is $0. NFIP may print those as Coverage A and Coverage C.
- Use the printed label. loss_of_use only when the row says Loss of use. I. Temporary Living Expenses → temporary_living_expenses, never loss_of_use, never coverage_d, and never additional living expense. A Selective Loss of use row stays loss_of_use.
- Also copy each of these when printed, including $0, Included, No, and Yes: debris_removal; sandbags_supplies_labor (Sandbags, Supplies, and Labor); property_removed_to_safety; increased_cost_of_compliance; replacement_cost_on_contents (Yes stays Yes, No stays No); basement_contents; pool_repair_and_refill; unattached_structures; temporary_living_expenses; replacement_cost_on_building; outdoor_trees_shrubs_plants (M. Outdoor Trees, Shrubs, and Plants). "C. Other Coverages" is a heading, not a row. Do not invent a letter the page skips.
- The Deductible row → flood_deductible. flood_deductible_premium only when a premium or credit is printed. That dollar applies separately to Building and Personal Property when the footnote says so. Do not copy a credit onto the building or contents premium. Do not invent a credit.
- Do not return homeowners Coverage B, E, or F. Neptune letter B is personal property, not other structures. Neptune letter D is increased cost of compliance, not loss of use. Neptune letters E and F are replacement cost on contents and basement contents, not liability or medical payments. Do not invent ordinance or law, water backup, or sinkhole.
- Dollar limits use a leading $. Premiums are digits only, Included, or a negative credit. A line premium is never the total policy premium. current_premium / premium is the policy total.
- mortgagee and loan_number only when an additional interest is printed. Do not invent a lender.
- property_address is the insured building. mailing_address only when it differs.
`;
  }
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

Return ONLY one JSON object. No markdown. The declaration page is the source of truth for every platform field. Never invent a limit, premium, date, VIN, or name. Never return an empty object when a VIN, vehicle, driver, coverage, date, carrier, or policy number is visible. When a platform coverage or per-vehicle overview field is not printed on the dec, set that key to None. Do not omit it and do not leave it blank. If this file is a wind mitigation (OIR-B1-1802), four-point, shopping quote, or not an issued auto policy, set document_kind to wind_mit or not_declaration and leave policy_number, current_premium, effective_date, and expiration_date empty. If policy number, premium, or dates are printed, document_kind is declaration — do not mark the page not_declaration.

Each present key is { "value": string, "confidence": number } (confidence 0..1) or a plain string.

Fill these first, in this order, when printed. Current Policy comes before vehicles and drivers so a long page cannot drop the carrier.
1. Current Policy. Do not leave these empty when the dec prints them. Copy only what is printed.
   - current_carrier: the named insurer / writing company. Copy the full company name (Allstate Fire and Casualty Insurance Company, not Allstate).
   - policy_number: Policy Number, Policy No, Policy #, or Current policy ID. Keep internal spaces (941 953 485).
   - effective_date and expiration_date: policy period from/to, as printed, including a month name (Sept 29, 2026). Travelers often prints 12:01 A.M. before each date — put only the date in the field (September 21, 2026 and March 21, 2027), not the clock.
   - current_premium: the policy term total when printed, digits only, cents kept (3393.51). On a Travelers (or similar) issued auto policy read Total Premium, Full Term Premium, 6 Month Premium, Total Premium for This Policy, or Premium Due when that figure is the term total (2109.00 stays 2109.00). A coverage schedule's last Total / Full Term row is the term total. Do not use one coverage-line premium (Bodily Injury 412 is not the term premium). This is not a shopping quote. A phone photo or HEIC of the declarations page counts — read the same labels.
   - Multi-page Travelers Automobile Policy Declarations (filenames like “Adriana Iori DEC Page Travelers.pdf”) keep the policy number and the policy period on the declarations header (page 1) and the Total or Full Term premium on a later coverage page. Copy policy_number, effective_date, expiration_date, and current_premium to those top-level keys even when they are on different pages. If Begins/Ends (or From/To) dates are filled, policy_number from the same header MUST be filled too — never return dates without the Policy Number printed beside them (Travelers Indemnity / The Travelers Indemnity Company layouts). Period labels may be Begins and Ends or From and To, including 12:01 A.M. Do not invent a policy number, premium, or date.
   - years_with_carrier, currently_insured, and aaa_member only when that fact is printed. Do not calculate years from the dates. Do not treat a declarations page as "Currently insured 6 months or more". Do not guess AAA tenure. Leave those three out when the page does not state them.
2. Vehicles and VIN. vin is the 17-character vehicle identification number (labels: VIN, V.I.N., Vehicle Identification No). vehicle_year, vehicle_make, vehicle_model from columns or from one cell such as "2019 TOYOTA CAMRY". More vehicles: vehicle_2_*, vehicle_3_*, vehicle_4_*. Per-vehicle overview fields are required for every car on the dec: usage (vehicle_usage / vehicle_N_usage), annual_miles, garaging_address, garaging_zip, lienholder, and that car's premium (vehicle_1_premium … vehicle_4_premium). Copy the printed value. If that overview fact is not printed for that car, set the key to None.
3. Drivers. List each person once. The same name and date of birth is one driver — do not repeat them as driver 2 and driver 3. driver_1_name is the full printed legal name: first, middle name or middle initial, and the complete last name. Do not truncate. "Domenic M Iori" stays "Domenic M Iori" — never "Domenic Ic", "Domenic I", or "D. Iori". If First / Middle / Last are separate columns, join them in that order. Then driver_1_dob, driver_1_license, and driver_2_* only for a different person. Add gender (Male/Female only), marital status, and relationship for drivers 2+ when printed. Never fill driver_1_relationship. Never fill employment — use industry and occupation only when printed.
4. Coverage limits — fill every platform column from the declaration. Read every page, including page 2. Do not invent coverages. Three rules:
   a. Absent coverages → explicit None. If the dec does not print a coverage (no BI, no UM, no rental, no towing, no glass, no med pay, rejected left blank, or the word None / Not purchased / Rejected), set that coverage's value to None. Do not omit the key. Do not invent coverages. Exception: comprehensive and collision limits are ✓, not None, when that line's deductible is a dollar amount. Use None for comp_limit or collision_limit only when there is no dollar deductible and no coverage on the dec.
   b. Every coverage column filled. For each line below, return limit, deductible, and premium. Use the printed cell. If that column is blank on the dec, set it to None. Lines and keys: Bodily Injury liability_bi + liability_bi_deductible + liability_bi_premium (100/300, not 100000/300000; join Each Person and Each Accident as 100/300). Property Damage liability_pd + liability_pd_deductible + liability_pd_premium. UM/UIM including Uninsured Motorist Bodily Injury um_uim + um_uim_deductible + um_uim_premium. UM property damage um_pd + um_pd_deductible + um_pd_premium (do not put UM PD in liability_pd). Stacked or Non-stacked → um_stacked, or None when the dec does not say. PIP pip + pip_deductible + pip_premium. Medical payments med_pay + med_pay_deductible + med_pay_premium. Comprehensive comp_limit + comp_deductible + comp_premium. Collision collision_limit + collision_deductible + collision_premium. Deductibles are dollar amounts: write $500 or $1,000, never a bare 500 or 1000. None stays None when that deductible is not on the dec. A dollar comprehensive deductible means comprehensive is on the policy, so comp_limit is ✓ (covered), not None. A dollar collision deductible means collision is on the policy, so collision_limit is ✓, not None. Keep a printed limit such as ACV only when the dec prints it. Use None for those limits only when there is no dollar deductible and no coverage. Rental rental + rental_deductible + rental_premium. Towing / ERS towing + towing_deductible + towing_premium. Glass glass_limit + glass + glass_premium. Premiums are digits only. Do not use a line premium as current_premium.
   c. Policy-wide coverages are written once: bodily injury, property damage, PIP, medical payments, UM/UIM, and UM property damage. Do not repeat them on each vehicle. Comprehensive, collision, rental, towing/roadside/ERS, and glass are per vehicle. Vehicle 1 uses the unprefixed keys (comp_deductible, collision_deductible, rental, towing, glass, and their limits and premiums). Vehicles 2–4 use vehicle_N_comp_deductible, vehicle_N_collision_deductible, vehicle_N_comp_premium, vehicle_N_collision_premium, vehicle_N_rental, vehicle_N_towing, and vehicle_N_glass. A dollar deductible on that car means its limit is ✓, not None. If that car does not have the coverage, set its deductible and limit to None. Do not copy vehicle 1 physical damage onto another car. Also for each car: vehicle_N_premium, usage, annual miles, garaging address, garaging zip, and lienholder. Printed value, or None when that car's dec row does not show it. Discounts → discounts, or None when no discount is listed. Driver license state → driver_N_license_state, or None when that driver is listed and the state is not printed.
5. Also include when printed: term_length (6 month or 12 month — do not calculate it from the dates), relationship and excluded yes/no. Named insured may be printed LAST FIRST or LAST, FIRST — copy it as printed. A phone photo may be sideways, upside down, or skewed; read the page as if it were upright.

Current Policy example (emit a key only when that fact is printed. Never copy these sample values):
{"current_carrier":{"value":"Allstate Fire and Casualty Insurance Company","confidence":0.95},"policy_number":{"value":"941 953 485","confidence":0.95},"effective_date":{"value":"Sept 29, 2026","confidence":0.95},"expiration_date":{"value":"Mar 29, 2027","confidence":0.95},"current_premium":{"value":"3393.51","confidence":0.95}}

Vehicle and driver example (include only keys you can read; one row per person):
{"vin":{"value":"4T1B11HK5KU123456","confidence":0.95},"vehicle_year":{"value":"2019","confidence":0.95},"vehicle_make":{"value":"TOYOTA","confidence":0.95},"vehicle_model":{"value":"CAMRY","confidence":0.9},"driver_1_name":{"value":"Domenic M Iori","confidence":0.95},"driver_1_dob":{"value":"04/02/1984","confidence":0.9},"driver_1_license":{"value":"R400-123-45-678","confidence":0.9}}

Coverage example — every column is present. Printed cells stay printed. A column the dec does not show is None, except comp_limit and collision_limit are ✓ when that deductible is a dollar amount. Never copy these sample values. Do not invent a 0. Do not invent coverages:
{"liability_bi":{"value":"100/300","confidence":0.9},"liability_bi_deductible":{"value":"None","confidence":0.9},"liability_bi_premium":{"value":"412","confidence":0.9},"liability_pd":{"value":"100000","confidence":0.9},"liability_pd_deductible":{"value":"None","confidence":0.9},"liability_pd_premium":{"value":"188","confidence":0.9},"pip":{"value":"10000","confidence":0.9},"pip_deductible":{"value":"$1,000","confidence":0.9},"pip_premium":{"value":"220","confidence":0.9},"med_pay":{"value":"5000","confidence":0.9},"med_pay_deductible":{"value":"None","confidence":0.9},"med_pay_premium":{"value":"18","confidence":0.9},"um_uim":{"value":"100/300","confidence":0.9},"um_uim_deductible":{"value":"None","confidence":0.9},"um_uim_premium":{"value":"64","confidence":0.9},"um_stacked":{"value":"Non-stacked","confidence":0.9},"um_pd":{"value":"100000","confidence":0.9},"um_pd_deductible":{"value":"None","confidence":0.9},"um_pd_premium":{"value":"22","confidence":0.9},"comp_limit":{"value":"✓","confidence":0.9},"comp_deductible":{"value":"$500","confidence":0.9},"comp_premium":{"value":"90","confidence":0.9},"collision_limit":{"value":"✓","confidence":0.9},"collision_deductible":{"value":"$500","confidence":0.9},"collision_premium":{"value":"310","confidence":0.9},"rental":{"value":"30/900","confidence":0.9},"rental_deductible":{"value":"None","confidence":0.9},"rental_premium":{"value":"12","confidence":0.9},"towing":{"value":"100","confidence":0.9},"towing_deductible":{"value":"None","confidence":0.9},"towing_premium":{"value":"6","confidence":0.9},"glass_limit":{"value":"None","confidence":0.9},"glass":{"value":"$50","confidence":0.9},"glass_premium":{"value":"4","confidence":0.9},"discounts":{"value":"Multi-car; Paperless","confidence":0.9}}

Other allowed keys when printed: ${keys.join(", ")}
Money: premiums and liability limits are digits only (no $); keep cents. Deductibles that are dollar amounts use $500 or $1,000, never a bare number. Dates: keep as printed. Never invent a carrier, policy ID, premium, date, coverage, VIN, or driver name.
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
- Money: premiums are digits only (no $); keep cents, including a printed negative premium such as -82.40. Coverage A, B, C, D, E, and F dollar limits use $130,000 (a printed percent stays 10%). Each of those rows also has its own premium: coverage_a_premium through coverage_f_premium. That premium is the dollar on that row or the word Included. coverage_a_premium is never the total policy premium. Hurricane, All Other Perils, and wind/hail deductibles that are dollar amounts keep the printed amount with a $ (a format example is $1,000 — do not invent $1,000 when All Other Perils is not printed, and do not copy wind/hail into aop_deductible). A percent stays 2% or 2% of Coverage A. Optional-coverage dollar limits (personal injury, home computer, ordinance or law, water backup, theft) use $100,000 or the printed amount such as $130,900. A printed percent stays 10%. Incl and Included stay Included. No Extended Coverage stays those words. Do not invent a premium when an optional line shows only a limit or a status. Dates: keep as printed. Stories / year_built: integers as strings.

Field meaning guidance (from desk synonym brief):
- Wind mit: Owner Name→applicant_name; Address Inspected→property_address; Qualified Inspector→wind_mit_inspector;
  License or Certificate #→license_number; Inspection Company; Roof covering / deck / roof-to-wall / shape / SWR /
  Opening protection / Building Code / Design wind speed (Region); Terrain Exposure; form id→wind_mit_form;
  inspection/form date→wind_mit_date; Roof covering year→roof_year. Checkbox sections: letter only.
- Four-point: Insured/Applicant Name; Address Inspected; year built; stories (MUST when labeled); roof covering / year; construction_type; electrical_year / plumbing_year / hvac_year / water_heater_year (MUST when labeled — year of last update, age, or approx year); electrical_updated (MUST when labeled); electrical_circuit_amps (MUST when labeled — total/circuit amps as digits only, e.g. 200); occupancy / months_occupied when on the form; roof_condition; date_inspected (prefer label "Date Inspected" at top of 4pt — not a stale form stamp); four_point_date; license_number; inspection_company.
- Dec: Named insured; Residence premises / Location description / Property information / insured property → property_address
  (the RISK — never the Insured/mailing address when they differ); mailing_address is Insured/mailing only;
  Coverage A / dwelling, and the premium printed on that same row → coverage_a_premium (never the total policy premium);
  Coverage B/C/D/E/F limits and the premium on each row → coverage_b_premium through coverage_f_premium (Included or a dollar);
  Section I deductibles are their own rows, never a deductible on Coverage A–F — All Other Perils → aop_deductible,
  Windstorm or Hail (Other Than Hurricane) → wind_hail_deductible, Hurricane → hurricane_deductible
  (store 2% or 2% of Coverage A, not only the parenthetical dollar), Sinkhole Not Included → sinkhole_deductible Not Included or None; Sinkhole Loss Coverage Incl → sinkhole_deductible Included (do not invent a dollar). Catastrophic Ground Cover Collapse Coverage is its own row, not sinkhole: blank limit + Incl → catastrophic_ground_cover_collapse_premium Included;
  aop_deductible copies only the All Other Perils line. Leave it null when that line is missing. Do not invent $1,000;
  policy number (Policy No / Pol # / Policy # → policy_number); premium / current_premium / total premium / annual premium
  (issued total — not a prior quote); effective_date (Eff date / policy period start); expiration_date;
  term_months or term_length when a length is printed (6 or 12) — do not invent a length;
  renewal_date = policy expiration date from the dec (same as expiration_date);
  selling_agency; producer; insurance_type; form (HO3/DP-3, or MHO when the dec is a manufactured home / mobile home / MHO / HMO / MH — not HO3 or Home);
  Homeowners billing_frequency is always annual / yearly (do not invent 6-month on HO; Auto may be 6 or 12 months);
  next_due on annual HO = expiration/renewal date;
  payment_method: if Additional Interest / Mortgagee is present → billed through mortgagee / escrow;
  if no mortgagee → client direct payment;
  mortgagee + mortgagee_address (dec bottom Additional Interest / Mortgagee — if blank set mortgagee to "No mortgage");
  loan number; roof_year / roof_age (only when printed on the dec or listed on the master sheet — never invent);
  ordinance or law / Building Ordinance Or Law (ordinance_law; a printed 10% stays 10%; limit + ordinance_law_premium, keep a negative premium); water backup / Water Back Up and Sump Overflow (limit + water_backup_premium);
  personal injury (personal_injury + personal_injury_premium; Included stays Included);
  personal property replacement cost / Replacement Cost Contents (Included or Y/N, plus personal_property_replacement_cost_premium only when a premium is printed);
  home computer (home_computer + home_computer_premium);
  theft (Theft limit such as $130,900 — do not invent theft_premium);
  Notary / HO-6 / unit-owners Policy Endorsement Information: Loss Assessment Coverage → loss_assessment + loss_assessment_premium; Limited Fungi, Wet or Dry Rot, or Bacteria → limited_fungi (keep $10,000/$10,000) + limited_fungi_premium (Incl stays Included); Catastrophic Ground Cover Collapse Coverage → catastrophic_ground_cover_collapse_premium Included when the premium is Incl and the limit is blank (never sinkhole_deductible); Unit-Owners Coverage A - Special Coverage is an endorsement, not Coverage A and not the form — when the limit column is blank and the premium is Incl, set unit_owners_coverage_a_premium to Included and leave the limit null. A blank Unit-Owners premium stays null. property_and_liability_coverages_premium is the package subtotal only — never coverage_a_premium and never current_premium. Do not turn rating credits into coverages or deductibles: Age of Dwelling Credit, Age of Insured Credit, Deductible Options, Protective Devices Credit, BCEGS Credit (Incl is not bceg_grade), Residential Windstorm Loss Mitigation Devices Credit. EMPAT, FIGA, MGA, and Surplus Contribution stay off the schedule.
  extended_replacement_cost_dwelling (Extended Replacement Cost - Dwelling: No Extended Coverage or the printed limit — do not invent a premium);
  scheduled personal property;
  Cov B–F when printed (B/C/D and ordinance: keep a printed percent as 10%; keep a printed dollar limit as $130,000; E/F are dollar limits as $100,000); sinkhole_deductible; current_carrier (company/writing company); secondary_named_insured;
  opening_protection; sprinkler; fire_alarm/central_alarm; bceg_grade; roof_covering/shape;
  loss_of_rents/fair_rental_value; landlord_liability (Cov L on DP).
  Rating Information or Rating Characteristics, only when that label has a printed value (a blank rating cell is None — do not invent Masonry, a year, or Owner):
  construction_type (printed Construction or Construction type — keep Masonry on construction_type; do not store it as occupancy); year_built and year_of_construction are both the printed Year of Construction (MUST fill year_built with the full year whenever Year of Construction, Year Built, or Yr Built is printed — 24 means 2024 — never leave year_built null); roof_year (Year of Roof/Updated);
  type_of_residence (Owner Occupied); dwelling_type (Single Family); months_occupied (9 to 12 Months); occupancy (the Occupancy line or Occupied by: Owner or Tenant). When Occupancy and Occupied by are both missing and Type of Residence is Owner Occupied or Tenant, set occupancy from that residence and still store type_of_residence. Usage Type is usage (Rental stays Rental) and is never occupancy. Do not invent occupancy from Usage Type. When neither Occupancy, Occupied by, nor Type of Residence is printed, leave occupancy null. A unit-owners / condo / HO-6 Rating Characteristics block (County, Territory, Year Built, Protection Class, Building Grade, Construction, Roof, Shutters) often has no Occupancy — do not invent Owner from unit-owners, condo, or HO-6. Do not invent a mortgagee. Automatic Sprinklers → sprinkler (None → no). Fire Alarm None → fire_alarm no. BCEG Grade Ungraded stays bceg_grade Ungraded (a BCEGS credit that only says Incl is not a grade). Protection Class 02 → protection_class 2. Number of Families → number_of_families. Roof Shape → roof_shape. Roof Material → roof_material. Roof Age → roof_age (keep 5 years). Roof Year → roof_year, and that printed year wins over the age. Opening Protection Class A → opening_protection. Year Built → year_built. Territory and Exclude Wind Coverage have no desk field — leave them out.
  When printed, also: dwelling_type or townhouse_rowhouse (Y when Townhouse/Rowhouse is checked);
  dwelling_replacement_cost / replacement_cost_dwelling (Replacement Cost Dwelling: Included, No Extended Coverage, or Y/N as printed — do not invent a premium) and personal_property_replacement_cost / replacement_cost_contents (Replacement Cost Contents: Included or Y/N as printed — do not invent a premium);
  burglar_alarm (Protective Device Burglar credit);
  unit_year, unit_make, unit_serial, unit_length, unit_width (mobile home unit);
  roof_material; date_of_roof_installation;
  scheduled_carport, scheduled_screen_room, scheduled_shed dollar limits.
  Do not invent those when the dec omits them.
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
      "This is a dec/policy. Liability-only (no Coverage A / dwelling limit printed): fill Current Policy, named insured, the one printed address as property_address, coverage_e, coverage_f, carrier, policy number, dates, and premium. Do not invent year_built, square feet, construction, roof, coverage_a, tie-downs, HUD label, or unit make/model/year. MUST fill when present: named_insured/current_policy_name_insured, secondary_named_insured, property_address / location_description / property_information / insured_property / residence_premises (the RISK from Property information / Location description / Residence premises / Insured property — NEVER the Insured/mailing address when they differ; Rosa: 18025 Cypress Point Rd, Fort Myers is the risk, not 8561 SW 85th St Ave), mailing_address (Insured/mailing only), coverage_a (dwelling), coverage_a_premium (the Coverage A premium column — a dollar such as 1310.55 or Included — NEVER the total policy premium), coverage_b, coverage_b_premium, coverage_c, coverage_c_premium, coverage_d, coverage_d_premium, coverage_e, coverage_e_premium, coverage_f, coverage_f_premium, hurricane_deductible, aop_deductible, wind_hail_deductible, year_built, year_of_construction, ordinance_law, water_backup, screen_enclosure (screened enclosure / lanai limit only when printed), sinkhole_deductible, policy_number (Florida Peninsula and similar: Policy No / Pol # / Policy # / policy number all map to policy_number — never leave it empty when printed), premium, current_premium (same issued total premium on a dec — Total Premium / Annual Premium / Total Annual Premium; not a shopping quote), current_carrier, effective_date (Eff date / policy period start), expiration_date, renewal_date (same as expiration_date), selling_agency, producer, insurance_type, billing_frequency (Homeowners: annual / yearly; Auto may be 6 or 12 months — do not force annual on auto), next_due (annual HO: same as expiration/renewal), payment_method (mortgagee present → billed through mortgagee / escrow; no mortgage → client direct payment), mortgagee (dec bottom Additional Interest / Mortgagee — if blank set 'No mortgage'), mortgagee_address, loan_number, protection_class, number_of_families, year_built, construction_type, occupancy, usage, form (HO3/DP-3/DP3/HO-3, or MHO when the page is a manufactured home, mobile home, MHO, HMO, MH, or prints a home unit year/make/serial — do not store HO3 or Home for that dec), opening_protection, sprinkler (Automatic Sprinklers), fire_alarm / central_alarm (Fire Alarm / Burglar), bceg_grade (BCEG Grade), roof_covering, roof_shape, roof_year, roof_age (only when printed — never invent), loss_of_rents / fair_rental_value (Coverage D Fair Rental Value limit), landlord_liability (Coverage L Personal Liability when dwelling/DP). For sinkhole_deductible: if the dec says Not Included, or the policy does NOT provide sinkhole coverage (or only catastrophic ground cover collapse, with no Sinkhole Loss Coverage line), set sinkhole_deductible to Not Included or None — do not leave it blank and do not invent a dollar. Sinkhole Loss Coverage Incl is Included. Catastrophic Ground Cover Collapse is not sinkhole_deductible. Property and Liability Coverages Premium is property_and_liability_coverages_premium only — never coverage_a_premium and never the policy total. For water_backup: only fill when an endorsement/limit is printed; do not invent. For sprinkler/fire_alarm/opening_protection: when Rating Information says None, set value to no or None — do not leave blank. Cov A alone is OK when B–F are missing. Coverage A, B, C, D, E, and F: store a printed percent as 10% and a printed dollar limit as $130,000. Each of those rows has its own premium column: coverage_a_premium, coverage_b_premium, coverage_c_premium, coverage_d_premium, coverage_e_premium, and coverage_f_premium. Copy Included or the printed dollar, including cents. coverage_a_premium is the Coverage A row premium only — never premium, current_premium, or the total policy premium. Coverage rows have no deductible. Leave coverage_a null when the page does not print a dwelling limit — do not estimate it. SECTION I deductibles are separate rows, never values on Coverage A–F. MUST fill each one that is printed, and leave that key null only when that row is not on the page: aop_deductible is only the line labeled All Other Perils (copy that printed dollar — do not invent $1,000, and do not copy wind/hail or the hurricane dollar into it); wind_hail_deductible is Windstorm or Hail (Other Than Hurricane), even when the dollar matches All Other Perils; hurricane_deductible is Hurricane as the printed percent (2% or 2% of Coverage A). The dollar beside a hurricane percent is the Coverage A equivalent — do not store only that dollar. sinkhole_deductible Not Included, Not Covered, or None stays Not Included or None — never invent a sinkhole dollar. OPTIONAL COVERAGES, only when that line is printed with a limit or premium: personal_injury and personal_injury_premium (Included stays Included), personal_property_replacement_cost / replacement_cost_contents (Replacement Cost Contents — Included stays Included) and personal_property_replacement_cost_premium only when a premium is printed, home_computer and home_computer_premium, ordinance_law / building_ordinance_or_law (Building Ordinance Or Law — 10% stays 10%) and ordinance_law_premium (keep a negative premium), water_backup and water_backup_premium (Water Backup / Water Back Up and Sump Overflow), theft (Theft limit such as $130,900 — do not invent a premium), extended_replacement_cost_dwelling (Extended Replacement Cost - Dwelling: copy No Extended Coverage or the printed limit — do not invent a premium), dwelling_replacement_cost / replacement_cost_dwelling (Replacement Cost Dwelling: Included stays Included), loss_assessment and loss_assessment_premium (Loss Assessment Coverage), limited_fungi and limited_fungi_premium (Limited Fungi, Wet or Dry Rot, or Bacteria — keep $10,000/$10,000; Incl stays Included). Unit-Owners Coverage A - Special Coverage is unit_owners_coverage_a_premium Included when the premium column says Incl and the limit column is blank — it is not coverage_a and not the policy form. Dollar limits use a leading $. A status such as Included or No Extended Coverage stays those words. Do not invent an optional that is not printed and do not invent a premium when the line shows only a limit or a status. RATING INFORMATION or Rating Characteristics: construction_type is the printed Construction or Construction type (Masonry stays construction_type, never occupancy), year_built and year_of_construction are both the printed Year of Construction — MUST set year_built to the full year whenever Year of Construction is on the page (a two-digit 24 is 2024), and also set year_of_construction to that same full year. Do not leave year_built null when that year is printed. roof_year (Year of Roof/Updated), type_of_residence, dwelling_type, months_occupied, occupancy. occupancy copies Occupancy or Occupied by when printed (Owner, Tenant, or Owner Occupied). If both are missing, set occupancy from Type of Residence only when that line is Owner Occupied or Tenant, and still store type_of_residence. Usage Type → usage only (Rental stays Rental); never copy Usage Type into occupancy. If Occupied by, Occupancy, and Type of Residence are all absent, leave occupancy null — do not invent Owner from unit-owners, condo, or HO-6. Also fill when printed: number_of_families, protection_class (02 is 2), bceg_grade (Ungraded stays Ungraded; a BCEGS credit that only says Incl is not a grade), sprinkler / automatic_sprinklers (None is no), fire_alarm (None is no), roof_shape, roof_material, roof_age (keep 5 years), roof_year (a printed Roof Year wins over Roof Age), opening_protection (Class A). Do not invent territory or exclude_wind_coverage. Copy the printed value. If that rating label is on the page and the cell is blank, set None. Do not invent a construction type, year, occupancy, or mortgagee. Rating Characteristics Year Built → year_built and Construction → construction_type. If the image is actually a four-point (or clearly shows Date Inspected / Date of Inspection), ALSO fill date_inspected and four_point_date from that top inspection date — do not ignore it just because the upload type said dec. Also set document_kind to declaration if this is a declarations page. If this is a quote packet, wind mit, inspection, or otherwise does not look like a dec, set document_kind to not_declaration and leave policy fields empty.";
  } else if (kind === "photo" || kind.includes("photo") || kind === "inspection" || kind.includes("inspect")) {
    focus =
      "This may be a phone photo (JPEG/PNG/HEIC) of a dec, wind mit, 4-point, or inspection — not a PDF. Read the visible text from the image and fill every labeled field you can see. Prefer the same keys as dec / wind mit / four-point when the form type is clear from the page.";
  }
  const line = (shopLine ?? "").trim().toLowerCase();
  if (line === "flood") {
    focus =
      "This is a Flood declaration (Selective Flood, NFIP, or Neptune / private flood), not homeowners. Do not fill HO3 Coverage A–F. form is FLD when the form or policy number starts with FLD, otherwise Flood — never Home or HO3. MUST fill the rating block when those facts are printed, including on a later page and under Property Information, Building Information, Location and Property Information, or Underwriting — not only under the heading Rating Information. A flood zone alone is not enough: building_occupancy, number_of_units, primary_residence, property_description, prior_nfip_claims, date_of_construction (full printed date) and year_built (four-digit year), flood_zone, first_floor_height, ffh_method, building_description_detail. Leave a rating fact null when it is not printed. N/A stays N/A. Read every row of Coverages & Premiums at the Premises, including children under C. Other Coverages. A limits-only table has no premium column: copy the limit and leave the premium null. Do not invent a premium. When a premium column exists, copy it, and keep a credit negative. Building / A. Dwelling → building_limit. Contents / B. Personal Property → contents_limit, including $0. Debris removal Included stays Included. Sandbags, supplies, and labor and property removed to safety keep their dollars. Increased cost of compliance keeps its dollar. Replacement cost on contents: Yes stays Yes and No stays No. Basement contents, pool repair and refill, and unattached structures keep a printed $0. I. Temporary Living Expenses → temporary_living_expenses, never loss_of_use. M. Outdoor Trees, Shrubs, and Plants → outdoor_trees_shrubs_plants, including $0. K. Replacement cost on building only when that row is printed. The Deductible row is flood_deductible; do not invent a credit. Do not invent Coverage B, E, or F. Mortgagee only when printed. Policy number, dates, and the total premium when printed.";
  }
  if (line === "auto" || line === "motorcycle" || line === "commercial_auto") {
    focus =
      "This photo, HEIC, or PDF is an issued Auto policy or Auto declaration (Travelers and similar carrier dec, policy jacket, ID card, or ACORD 90) — not a shopping quote. Do not treat this as homeowners / Coverage A. Read every page. The declarations block is often the first pages; a later page can hold the premium total. A multi-page Travelers Automobile Policy Declarations file (names like “Adriana Iori DEC Page Travelers.pdf”) prints policy number and the policy period on the page 1 header (Begins and Ends, or From and To) and the Total or Full Term premium on a later coverage page — still fill policy_number, effective_date, expiration_date, and current_premium. Ignore the contract jacket. Fill Current Policy first when printed: current_carrier (the writing company actually printed — Travelers, or The Standard Fire Insurance Company when that is the name on the page; do not invent a carrier), policy_number (Policy Number / Policy No / Policy # / Current policy ID; keep spaces), effective_date and expiration_date (Policy Period From and To, or Begins and Ends. Travelers prints 12:01 A.M. before each date — store September 21, 2026 and March 21, 2027, not the clock), current_premium (Total Premium, Full Term Premium, 6 Month Premium, the coverage-schedule Total or Full Term row, Total Premium for This Policy, or Premium Due when that is the term total — keep cents; not one coverage-line premium such as Bodily Injury 412). Do not leave those empty when they are printed, and do not invent a number, premium, or date that is not on the page. years_with_carrier, currently_insured, and aaa_member only when those facts are printed — do not invent them. Then vin and vehicle_year / vehicle_make / vehicle_model (split a cell like 2019 TOYOTA CAMRY; vehicle_2_* for the next car). driver_1_name is the full legal name — Domenic M Iori, never Domenic Ic. List each person once; the same name and date of birth is not driver 2 and driver 3. Coverage rows come from a printed coverage table on any page, including page 2 of a multi-page dec. Fill every platform field. Absent coverages are explicit None (do not omit them). Every coverage column is filled: limit, deductible, and premium — printed value or None. Do not invent a 0. Bodily injury → liability_bi as 100/300 (not 100000/300000), liability_bi_deductible, and liability_bi_premium. Property damage → liability_pd, liability_pd_deductible, and liability_pd_premium. PIP → pip, pip_deductible, and pip_premium. Medical payments → med_pay, med_pay_deductible, and med_pay_premium. UM/UIM → um_uim, um_uim_deductible, and um_uim_premium. UM property damage → um_pd, um_pd_deductible, and um_pd_premium (do not put UM PD in liability_pd). Stacked or Non-stacked → um_stacked, or None when the dec does not say. Bodily injury, property damage, PIP, medical payments, UM/UIM, and UM property damage are policy-wide — return them once. Comprehensive, collision, rental, towing, and glass are per vehicle. Vehicle 1 → comp_limit, comp_deductible, comp_premium, collision_limit, collision_deductible, collision_premium, rental, rental_deductible, rental_premium, towing, towing_deductible, towing_premium, glass_limit, glass, and glass_premium. Later cars → vehicle_N_comp_deductible, vehicle_N_collision_deductible, vehicle_N_comp_premium, vehicle_N_collision_premium, vehicle_N_rental, vehicle_N_towing, and vehicle_N_glass. Deductibles are dollar amounts: write $500 or $1,000, never a bare 500 or 1000. None stays None when there is no deductible. If that car's comprehensive has a dollar deductible, its limit is ✓ (covered), not None. If collision has a dollar deductible, collision_limit is ✓, not None. Keep a printed limit such as ACV when the dec prints one. Use None for comp_limit or collision_limit only when that coverage has no dollar deductible and is not on the dec. Do not copy vehicle 1 physical damage onto vehicle 2. Discounts → discounts, or None when none are listed. Per-vehicle overview fields are required for each car: usage, annual miles, garaging address, garaging ZIP, lienholder, premium, comprehensive deductible, and collision deductible — printed value or None. Do not invent coverages. Also fill when printed: industry, occupation, gender (Male/Female only), marital status. Never fill driver_1_relationship. Never fill employment / employment status — use industry + occupation only. If this file is a wind mitigation, four-point, or shopping quote, set document_kind to wind_mit or not_declaration and leave policy number, premium, and dates empty. Do not return {} and do not mark the page not_declaration when a VIN, vehicle, driver, coverage table, carrier, policy number, or premium is visible. A JPG, PNG, HEIC, or PDF of this dec is the same document — a phone photo may be rotated or skewed, so read it upright. When printed, also return term length, license state, excluded drivers, lienholder or loss payee, annual miles, garaging address, per-vehicle premium, med pay, rental, towing, and discounts. Copy a LAST FIRST or LAST, FIRST name as printed.";
  }
  return `Extract the JSON field object from this ${docType || "insurance"} document. ${focus} Invent nothing. Do not return an empty object when fields are visible.`;
}
