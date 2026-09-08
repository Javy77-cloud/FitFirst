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
  "scheduled_personal_property",
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
  "roof_condition",
  "four_point_date",
] as const;

export type GeminiExtractKey = (typeof GEMINI_EXTRACT_JSON_KEYS)[number];

export function buildGeminiSystemPrompt(docType?: string | null): string {
  const kind = (docType ?? "").trim() || "insurance source document";
  return `You extract structured fields from Florida personal-lines insurance documents
(wind mitigation OIR-B1-1802, four-point inspection, HO3/dec page, related insured).

Document type hint: ${kind}

Rules:
- Return ONLY a single JSON object. No markdown fences, no commentary.
- Keys MUST be exactly from this list (omit unknown keys or set value null):
  ${GEMINI_EXTRACT_JSON_KEYS.join(", ")}
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
- design_wind_speed: use mph number when Region 1/2/3 is checked (140 / 130 / 120-style).
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
- Four-point: Insured/Applicant Name; Address Inspected; year built; stories (MUST when labeled); roof covering / year; construction_type; electrical_year / plumbing_year / hvac_year / water_heater_year (MUST when labeled — year of last update, age, or approx year); electrical_updated (MUST when labeled); occupancy / months_occupied when on the form; roof_condition; four_point_date; license_number; inspection_company.
- Dec: Named insured; Residence premises / Location; Coverage A; hurricane / AOP / wind-hail deductibles;
  policy number; premium; effective/expiration; mortgagee; loan number; ordinance or law; water backup; scheduled personal property.
`;
}

export function buildGeminiUserPrompt(docType?: string | null): string {
  const kind = (docType ?? "").trim().toLowerCase();
  let focus =
    "Extract every listed key that is clearly printed or checked. Prefer a non-empty value when the form shows one.";
  if (kind === "wind_mit" || kind.includes("wind")) {
    focus =
      "This is a wind mitigation (OIR-B1-1802). MUST fill when present: applicant_name, property_address, wind_mit_inspector, license_number, inspection_company, roof_covering, roof_deck_attachment, roof_to_wall, roof_shape, swr, opening_protection, building_code, design_wind_speed, year_built, wind_mit_form, wind_mit_date, terrain, roof_year. OIR checkbox fields: LETTER CODES ONLY (A/B/C/…). wind_mit_form is typically OIR-B1-1802; wind_mit_date is the inspection/form date; terrain is Terrain Exposure Category (B/C/D); roof_year is the year roof covering installed when printed.";
  } else if (kind === "four_point" || kind.includes("four") || kind.includes("4pt") || kind.includes("4-point")) {
    focus =
      "This is a four-point inspection. MUST fill when labeled on the form: applicant_name, property_address, year_built, stories, roof_covering, roof_year, construction_type, electrical_year, plumbing_year, hvac_year, water_heater_year, electrical_updated, license_number, inspection_company, occupancy, months_occupied. Also fill when present: roof_condition, four_point_date, usage. stories / water_heater_year / electrical_updated are required when the form shows them. For system years use the printed year of last update / age / approx year (convert age-in-years to an approximate calendar year when the form shows age only).";
  } else if (kind === "dec" || kind.includes("dec") || kind.includes("declar") || kind === "policy") {
    focus =
      "This is a dec/policy. MUST fill when present: named_insured/current_policy_name_insured, property_address, coverage_a, hurricane_deductible, aop_deductible, policy_number, current_premium, effective_date, expiration_date, mortgagee, loan_number.";
  }
  return `Extract the JSON field object from this ${docType || "insurance"} PDF. ${focus} Invent nothing. Do not return an empty object when fields are visible.`;
}
