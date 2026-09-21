import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import type { ExtractedField, ExtractionResult, UnmappedExtractLabel } from "@/lib/extraction/extract";
import { GEMINI_AUTO_EXTRACT_JSON_KEYS, GEMINI_EXTRACT_JSON_KEYS, GEMINI_LETTER_EXTRACT_JSON_KEYS, type GeminiExtractKey } from "./prompt";

/** Gemini JSON key → one or more sheet / extract field keys. */
export const GEMINI_KEY_TO_SHEET: Record<string, string[]> = {
  applicant_name: ["applicant_name"],
  property_address: ["address", "address1", "applicant_address", "property_address"],
  location_description: ["property_address", "address", "address1", "location_description"],
  property_information: ["property_address", "address", "address1", "property_information"],
  insured_property: ["property_address", "address", "address1", "insured_property"],
  residence_premises: ["property_address", "address", "address1", "residence_premises"],
  year_built: ["year_built"],
  stories: ["stories"],
  phone: ["phone"],
  email: ["email"],
  wind_mit_inspector: ["wind_mit_inspector"],
  license_number: ["license_or_certificate_number"],
  inspection_company: ["inspection_company"],
  roof_covering: ["roof_covering"],
  roof_deck_attachment: ["roof_deck_attachment", "roof_deck"],
  roof_to_wall: ["roof_to_wall"],
  roof_shape: ["roof_shape"],
  swr: ["swr", "secondary_water"],
  opening_protection: ["opening_protection"],
  building_code: ["building_code"],
  design_wind_speed: ["wind_speed", "design_wind_speed"],
  mailing_address: ["mailing_address", "contact_mailing_address"],
  months_occupied: ["months_occupied"],
  occupancy: ["occupancy"],
  usage: ["usage"],
  entity_type: ["entity_type"],
  construction_type: ["construction"],
  coverage_a: ["coverage_a"],
  ordinance_law: ["ordinance_or_law"],
  water_backup: ["water_backup"],
  hurricane_deductible: ["hurricane_deductible"],
  aop_deductible: ["aop_deductible"],
  wind_hail_deductible: ["wind_hail_deductible"],
  current_policy_name_insured: ["named_insured", "current_policy_named_insured"],
  policy_number: ["policy_number"],
  policy_no: ["policy_number", "policy_no"],
  policy_num: ["policy_number", "policy_num"],
  pol_number: ["policy_number", "pol_number"],
  pol_no: ["policy_number", "pol_no"],
  pol_num: ["policy_number", "pol_num"],
  policy_id: ["policy_number", "policy_id"],
  current_premium: ["current_premium", "premium"],
  premium: ["premium", "current_premium"],
  total_premium: ["premium", "current_premium", "total_premium"],
  annual_premium: ["premium", "current_premium", "annual_premium"],
  total_annual_premium: ["premium", "current_premium", "total_annual_premium"],
  policy_premium: ["premium", "current_premium", "policy_premium"],
  written_premium: ["premium", "current_premium", "written_premium"],
  term_premium: ["premium", "current_premium", "term_premium"],
  yearly_premium: ["premium", "current_premium", "yearly_premium"],
  eff_date: ["effective_date", "eff_date"],
  policy_effective_date: ["effective_date", "policy_effective_date"],
  inception_date: ["effective_date", "inception_date"],
  policy_period_start: ["effective_date", "policy_period_start"],
  selling_agency: ["selling_agency"],
  renewal_date: ["renewal_date"],
  producer: ["producer"],
  insurance_type: ["insurance_type"],
  roof_age: ["roof_age", "roof_year"],
  billing_frequency: ["billing_frequency", "premium_frequency"],
  next_due: ["next_due"],
  payment_method: ["payment_method"],
  effective_date: ["effective_date"],
  expiration_date: ["expiration_date"],
  exp_date: ["expiration_date", "exp_date"],
  policy_expiration_date: ["expiration_date", "policy_expiration_date"],
  policy_period_end: ["expiration_date", "policy_period_end"],
  loan_number: ["loan_number"],
  city: ["city"],
  state: ["state"],
  zip: ["zip"],
  county: ["county"],
  roof_year: ["roof_year"],
  named_insured: ["named_insured"],
  wind_mit_form: ["wind_mit_form"],
  wind_mit_date: ["wind_mit_date"],
  terrain: ["terrain"],
  electrical_year: ["electrical_year"],
  plumbing_year: ["plumbing_year"],
  hvac_year: ["hvac_year"],
  water_heater_year: ["water_heater_year"],
  electrical_updated: ["electrical_updated"],
  electrical_circuit_amps: ["electrical_circuit_amps"],
  roof_condition: ["roof_condition"],
  four_point_date: ["four_point_date"],
  date_inspected: ["date_inspected"],
  inspection_date: ["date_inspected"],
  date_of_inspection: ["date_inspected"],
  inspected_date: ["date_inspected"],
  date_of_inspected: ["date_inspected"],
  coverage_b: ["coverage_b"],
  coverage_c: ["coverage_c"],
  coverage_d: ["coverage_d"],
  coverage_e: ["coverage_e"],
  coverage_f: ["coverage_f"],
  sinkhole_deductible: ["sinkhole_deductible"],
  protection_class: ["protection_class"],
  number_of_families: ["number_of_families"],
  current_carrier: ["current_carrier"],
  cancellation_date: ["cancellation_date"],
  cancellation_reason: ["cancellation_reason"],
  prior_agency: ["prior_agency"],
  new_agency: ["new_agency"],
  requested_years: ["requested_years"],
  loss_run_years: ["requested_years"],
  request_reason: ["request_reason"],
  mailing: ["mailing", "mailing_address"],
  secondary_named_insured: ["secondary_named_insured"],
  mortgagee: ["mortgagee", "mortgagee_name"],
  mortgagee_address: ["mortgagee_address"],
  form: ["form"],
  sprinkler: ["sprinkler"],
  fire_alarm: ["central_alarm", "fire_alarm"],
  central_alarm: ["central_alarm"],
  bceg_grade: ["bceg_grade"],
  loss_of_rents: ["loss_of_rents"],
  fair_rental_value: ["loss_of_rents", "coverage_d"],
  landlord_liability: ["landlord_liability", "coverage_e"],
  // Personal Auto dec
  vin: ["vin"],
  vehicle_year: ["vehicle_year"],
  vehicle_make: ["vehicle_make"],
  vehicle_model: ["vehicle_model"],
  vehicle_usage: ["vehicle_usage"],
  annual_miles: ["annual_miles"],
  rideshare: ["rideshare"],
  aftermarket_parts: ["aftermarket_parts"],
  years_with_carrier: ["years_with_carrier"],
  currently_insured: ["currently_insured"],
  garaging_zip: ["garaging_zip"],
  garaging_address: ["garaging_address"],
  vehicle_2_vin: ["vehicle_2_vin"],
  vehicle_2_year: ["vehicle_2_year"],
  vehicle_2_make: ["vehicle_2_make"],
  vehicle_2_model: ["vehicle_2_model"],
  vehicle_3_vin: ["vehicle_3_vin"],
  vehicle_3_year: ["vehicle_3_year"],
  vehicle_3_make: ["vehicle_3_make"],
  vehicle_3_model: ["vehicle_3_model"],
  vehicle_4_vin: ["vehicle_4_vin"],
  vehicle_4_year: ["vehicle_4_year"],
  vehicle_4_make: ["vehicle_4_make"],
  vehicle_4_model: ["vehicle_4_model"],
  driver_1_name: ["driver_1_name"],
  driver_1_dob: ["driver_1_dob"],
  driver_1_gender: ["driver_1_gender", "applicant_gender"],
  driver_1_industry: ["driver_1_industry", "applicant_industry"],
  driver_1_occupation: ["driver_1_occupation", "applicant_occupation"],
  driver_1_education_level: ["driver_1_education_level", "applicant_education_level"],
  driver_1_marital_status: ["driver_1_marital_status", "applicant_marital_status"],
  applicant_gender: ["applicant_gender", "driver_1_gender"],
  applicant_industry: ["applicant_industry", "driver_1_industry"],
  applicant_occupation: ["applicant_occupation", "driver_1_occupation"],
  driver_1_license: ["driver_1_license"],
  driver_1_status: ["driver_1_status"],
  driver_1_years_licensed: ["driver_1_years_licensed"],
  driver_1_household_status: ["driver_1_household_status"],
  driver_1_exclude_reason: ["driver_1_exclude_reason"],
  driver_1_age_first_licensed: ["driver_1_age_first_licensed"],
  driver_1_suspension_5yr: ["driver_1_suspension_5yr"],
  driver_2_name: ["driver_2_name"],
  driver_2_dob: ["driver_2_dob"],
  driver_2_gender: ["driver_2_gender"],
  driver_2_industry: ["driver_2_industry"],
  driver_2_occupation: ["driver_2_occupation"],
  driver_2_education_level: ["driver_2_education_level"],
  driver_2_marital_status: ["driver_2_marital_status"],
  driver_2_relationship: ["driver_2_relationship"],
  driver_2_license: ["driver_2_license"],
  driver_2_status: ["driver_2_status"],
  driver_2_years_licensed: ["driver_2_years_licensed"],
  driver_2_household_status: ["driver_2_household_status"],
  driver_2_exclude_reason: ["driver_2_exclude_reason"],
  driver_2_age_first_licensed: ["driver_2_age_first_licensed"],
  driver_2_suspension_5yr: ["driver_2_suspension_5yr"],
  driver_3_name: ["driver_3_name"],
  driver_3_dob: ["driver_3_dob"],
  driver_3_gender: ["driver_3_gender"],
  driver_3_industry: ["driver_3_industry"],
  driver_3_occupation: ["driver_3_occupation"],
  driver_3_education_level: ["driver_3_education_level"],
  driver_3_marital_status: ["driver_3_marital_status"],
  driver_3_relationship: ["driver_3_relationship"],
  driver_3_license: ["driver_3_license"],
  driver_4_name: ["driver_4_name"],
  driver_4_dob: ["driver_4_dob"],
  driver_4_gender: ["driver_4_gender"],
  driver_4_industry: ["driver_4_industry"],
  driver_4_occupation: ["driver_4_occupation"],
  driver_4_education_level: ["driver_4_education_level"],
  driver_4_marital_status: ["driver_4_marital_status"],
  driver_4_relationship: ["driver_4_relationship"],
  driver_4_license: ["driver_4_license"],
  accidents_3yr: ["accidents_3yr"],
  violations_3yr: ["violations_3yr"],
  liability_bi: ["liability_bi"],
  liability_pd: ["liability_pd"],
  um_uim: ["um_uim"],
  pip: ["pip"],
  comp_deductible: ["comp_deductible"],
  collision_deductible: ["collision_deductible"],
};

export type GeminiFieldPayload = {
  value?: string | number | null;
  confidence?: number | null;
};

export type GeminiExtractJson = Partial<Record<GeminiExtractKey | string, GeminiFieldPayload | string | number | null>>;

export function normalizeGeminiJsonKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function sheetKeysForGeminiKey(geminiKey: string): string[] {
  const normalized = normalizeGeminiJsonKey(geminiKey);
  return GEMINI_KEY_TO_SHEET[normalized] ?? GEMINI_KEY_TO_SHEET[geminiKey] ?? [];
}

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function asPayload(raw: unknown): { value: string; confidence: number } | null {
  if (raw == null) return null;
  if (typeof raw === "string" || typeof raw === "number") {
    const value = String(raw).trim();
    if (!value || value.toLowerCase() === "null") return null;
    return { value, confidence: 0.5 };
  }
  if (typeof raw !== "object") return null;
  const obj = raw as GeminiFieldPayload;
  if (obj.value == null) return null;
  const value = String(obj.value).trim();
  if (!value || value.toLowerCase() === "null") return null;
  const confidence = clampConfidence(Number(obj.confidence ?? 0.5));
  return { value, confidence };
}

/** Sheet keys that must store OIR-B1-1802 letter codes (not long option text). */
const OIR_LETTER_SHEET_KEYS = new Set([
  "roof_shape",
  "roof_deck",
  "roof_deck_attachment",
  "roof_to_wall",
  "swr",
  "secondary_water",
  "opening_protection",
  "building_code",
  "terrain",
]);

/**
 * Coerce Gemini OIR checkbox text → letter-only for carrier fill.
 * Mapping (OIR-B1-1802):
 * - Leading "A." / "B." / "C." / "ATC." etc. → that letter/code
 * - roof_shape words: hip→A, flat→B, gable|other→C
 * - roof_to_wall words: toenails→A, clips→B, single wrap→C, double wrap→D, structural→E
 * - opening_protection "Class A …" → A (same for B/C/N/X)
 * - Bare short codes (A–H, N, X, ATC) kept uppercase; ambiguous shorts like building_code "4" left as-is
 * Full label stays in rawValue for audit; normalizedValue uses the letter.
 */
export function normalizeOirLetterCode(fieldKey: string, raw: string): string {
  if (!OIR_LETTER_SHEET_KEYS.has(fieldKey)) return raw;
  const s = raw.trim();
  if (!s) return s;

  if (/^(ATC|[A-HNXhnx])$/i.test(s)) return s.toUpperCase();

  const lead = s.match(/^(ATC|[A-HNXhnx])\s*[.)\-:]/i);
  if (lead) return lead[1].toUpperCase();

  if (fieldKey === "opening_protection") {
    const cls = s.match(/\bClass\s*([A-CNX])\b/i);
    if (cls) return cls[1].toUpperCase();
  }

  const low = s.toLowerCase();
  if (fieldKey === "roof_shape") {
    if (/\bhip\b/.test(low)) return "A";
    if (/\bflat\b/.test(low)) return "B";
    if (/\bgable\b|\bother\b/.test(low)) return "C";
  }

  if (fieldKey === "roof_to_wall") {
    if (/\btoenail/.test(low)) return "A";
    if (/\bclips?\b/.test(low)) return "B";
    if (/\bsingle\s*wrap/.test(low)) return "C";
    if (/\bdouble\s*wrap/.test(low)) return "D";
    if (/\bstructural/.test(low)) return "E";
  }

  return s;
}

/** Parse city / state / zip from a US-style address line when possible. */
export function parseAddressParts(address: string): {
  street: string;
  city?: string;
  state?: string;
  zip?: string;
} {
  const cleaned = address.replace(/\s+/g, " ").trim();
  const m = cleaned.match(
    /^(.+?),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/,
  );
  if (m) {
    return { street: m[1].trim(), city: m[2].trim(), state: m[3], zip: m[4] };
  }
  const m2 = cleaned.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (m2) {
    const left = m2[1].trim();
    const comma = left.lastIndexOf(",");
    if (comma > 0) {
      return {
        street: left.slice(0, comma).trim(),
        city: left.slice(comma + 1).trim(),
        state: m2[2],
        zip: m2[3],
      };
    }
  }
  return { street: cleaned };
}

function sourceTagForDoc(docType?: string | null): string {
  const t = (docType ?? "").toLowerCase();
  if (t.includes("wind")) return "wind mitigation";
  if (t.includes("four") || t.includes("4")) return "4pt inspection";
  if (t.includes("related")) return "related insured";
  return "dec page";
}

function labelForKey(key: string): string {
  return key.replace(/_/g, " ");
}

/**
 * Phone photos of auto decs rarely score 0.8 ("clearly printed").
 * Readable VIN / driver / coverage text still belongs on the Auto sheet.
 * Home wind-mit letter codes stay on CONFIDENCE_THRESHOLD.
 */
export const AUTO_EXTRACT_CONFIDENCE_FLOOR = 0.5;

const AUTO_SIGNAL_KEYS = new Set([
  "vehicles",
  "vehicle",
  "vehicle_schedule",
  "drivers",
  "driver",
  "operators",
  "coverages",
  "coverage_schedule",
  "vin",
  "vehicle_year",
  "vehicle_make",
  "liability_bi",
  "bodily_injury",
  "comp_deductible",
  "collision_deductible",
  "vehicle_identification_number",
]);

/** ACORD / carrier dec labels → existing Auto risk-profile keys. */
const AUTO_FLAT_ALIAS: Record<string, string> = {
  bodily_injury: "liability_bi",
  bodily_injury_liability: "liability_bi",
  bi: "liability_bi",
  bi_limits: "liability_bi",
  bi_limit: "liability_bi",
  property_damage: "liability_pd",
  property_damage_liability: "liability_pd",
  pd: "liability_pd",
  pd_limit: "liability_pd",
  uninsured_motorist: "um_uim",
  underinsured_motorist: "um_uim",
  uninsured_underinsured: "um_uim",
  um: "um_uim",
  uim: "um_uim",
  personal_injury_protection: "pip",
  no_fault: "pip",
  comprehensive: "comp_deductible",
  comprehensive_deductible: "comp_deductible",
  other_than_collision: "comp_deductible",
  otc: "comp_deductible",
  comp: "comp_deductible",
  collision: "collision_deductible",
  vehicle_identification_number: "vin",
  vin_number: "vin",
  garaging_location: "garaging_address",
  garage_address: "garaging_address",
  insured_name: "named_insured",
  writing_company: "current_carrier",
  insurance_company: "current_carrier",
};

const COVERAGE_ROWS: Array<{ test: RegExp; key: string; part: "limit" | "deductible" }> = [
  { test: /bodily|bi liability|\bbi\b/, key: "liability_bi", part: "limit" },
  { test: /property damage|\bpd\b/, key: "liability_pd", part: "limit" },
  { test: /uninsured|underinsured|\bum\b|\buim\b/, key: "um_uim", part: "limit" },
  { test: /personal injury|\bpip\b|no-?fault/, key: "pip", part: "limit" },
  { test: /comprehensive|other than collision|\botc\b/, key: "comp_deductible", part: "deductible" },
  { test: /\bcollision\b/, key: "collision_deductible", part: "deductible" },
];

const VEHICLE_SUFFIX: Record<string, string> = {
  vin: "vin",
  vehicle_identification_number: "vin",
  vin_number: "vin",
  year: "year",
  vehicle_year: "year",
  model_year: "year",
  make: "make",
  manufacturer: "make",
  model: "model",
  body: "body_class",
  body_style: "body_class",
  body_class: "body_class",
  usage: "usage",
  use: "usage",
  vehicle_usage: "usage",
  annual_miles: "annual_miles",
  annual_mileage: "annual_miles",
  mileage: "annual_miles",
  rideshare: "rideshare",
  aftermarket_parts: "aftermarket_parts",
  garaging_zip: "garaging_zip",
  garage_zip: "garaging_zip",
  garaging_address: "garaging_address",
  garage_address: "garaging_address",
  garaging: "garaging_address",
  garaging_location: "garaging_address",
};

const DRIVER_SUFFIX: Record<string, string> = {
  name: "name",
  full_name: "name",
  driver_name: "name",
  dob: "dob",
  date_of_birth: "dob",
  birth_date: "dob",
  birthdate: "dob",
  gender: "gender",
  sex: "gender",
  license: "license",
  license_number: "license",
  license_no: "license",
  dl: "license",
  drivers_license: "license",
  marital_status: "marital_status",
  marital: "marital_status",
  relationship: "relationship",
  relation: "relationship",
  industry: "industry",
  occupation: "occupation",
  education: "education_level",
  education_level: "education_level",
  status: "status",
  license_status: "status",
  years_licensed: "years_licensed",
  household_status: "household_status",
  age_first_licensed: "age_first_licensed",
  suspension_5yr: "suspension_5yr",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function scalarString(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string" || typeof raw === "number") {
    const value = String(raw).trim();
    if (!value || value.toLowerCase() === "null") return "";
    return value;
  }
  if (isPlainObject(raw)) {
    if ("value" in raw) return scalarString(raw.value);
    if ("limit" in raw) return scalarString(raw.limit);
    if ("deductible" in raw) return scalarString(raw.deductible);
    if ("amount" in raw) return scalarString(raw.amount);
  }
  return "";
}

function readConfidence(raw: unknown, fallback = 0.9): number {
  if (isPlainObject(raw) && raw.confidence != null) {
    const n = Number(raw.confidence);
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
  }
  return fallback;
}

function isAutoShopLine(shopLine?: string | null): boolean {
  const line = (shopLine ?? "").trim().toLowerCase();
  return line === "auto" || line === "motorcycle" || line === "commercial_auto";
}

function unwrapGeminiEnvelope(json: GeminiExtractJson): GeminiExtractJson {
  const keys = Object.keys(json);
  if (keys.length !== 1) return json;
  const only = normalizeGeminiJsonKey(keys[0]);
  const inner = json[keys[0]];
  if (
    (only === "fields" ||
      only === "extracted" ||
      only === "extraction" ||
      only === "data" ||
      only === "result" ||
      only === "output") &&
    isPlainObject(inner)
  ) {
    return inner as GeminiExtractJson;
  }
  return json;
}

function payloadLooksAuto(json: GeminiExtractJson): boolean {
  const root = unwrapGeminiEnvelope(json);
  for (const key of Object.keys(root)) {
    if (AUTO_SIGNAL_KEYS.has(normalizeGeminiJsonKey(key))) return true;
  }
  return false;
}

function autoFieldKey(fieldKey: string): boolean {
  return (
    fieldKey === "vin" ||
    fieldKey.startsWith("vehicle_") ||
    fieldKey.startsWith("driver_") ||
    fieldKey === "garaging_zip" ||
    fieldKey === "garaging_address" ||
    fieldKey === "annual_miles" ||
    fieldKey === "rideshare" ||
    fieldKey === "aftermarket_parts" ||
    fieldKey === "purchased_new" ||
    fieldKey === "original_cost_new" ||
    fieldKey === "commute_days_week" ||
    fieldKey === "commute_miles_daily" ||
    fieldKey === "liability_bi" ||
    fieldKey === "liability_pd" ||
    fieldKey === "um_uim" ||
    fieldKey === "pip" ||
    fieldKey === "comp_deductible" ||
    fieldKey === "collision_deductible" ||
    fieldKey === "accidents_3yr" ||
    fieldKey === "violations_3yr" ||
    fieldKey === "currently_insured" ||
    fieldKey === "years_with_carrier" ||
    fieldKey === "policy_number" ||
    fieldKey === "current_premium" ||
    fieldKey === "premium" ||
    fieldKey === "effective_date" ||
    fieldKey === "expiration_date" ||
    fieldKey === "current_carrier" ||
    fieldKey === "named_insured" ||
    fieldKey === "secondary_named_insured" ||
    fieldKey === "phone" ||
    fieldKey === "email" ||
    fieldKey === "mailing_address" ||
    fieldKey === "city" ||
    fieldKey === "state" ||
    fieldKey === "zip"
  );
}

function sheetKeysForExtract(geminiKey: string, auto: boolean): string[] {
  const direct = sheetKeysForGeminiKey(geminiKey);
  if (direct.length > 0) return direct;
  if (!auto) return [];
  const aliased = AUTO_FLAT_ALIAS[geminiKey];
  return aliased ? [aliased] : [];
}

function writeFlat(target: GeminiExtractJson, key: string, raw: unknown, fallbackConfidence = 0.9) {
  const value = scalarString(raw);
  if (!value) return;
  if (scalarString(target[key])) return;
  target[key] = { value, confidence: readConfidence(raw, fallbackConfidence) };
}

function takeCollection(obj: GeminiExtractJson, names: string[]): unknown[] | null {
  for (const name of names) {
    const raw = obj[name];
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (isPlainObject(raw)) {
      const values = Object.values(raw);
      if (values.length > 0 && values.every((item) => isPlainObject(item))) return values;
      if (scalarString(raw.vin ?? raw.name ?? raw.year ?? raw.make)) return [raw];
    }
  }
  return null;
}

function vehicleSheetKey(index: number, suffix: string): string | null {
  if (index < 1 || index > 4) return null;
  if (index === 1) {
    const first: Record<string, string> = {
      vin: "vin",
      year: "vehicle_year",
      make: "vehicle_make",
      model: "vehicle_model",
      body_class: "vehicle_body_class",
      usage: "vehicle_usage",
      annual_miles: "annual_miles",
      rideshare: "rideshare",
      aftermarket_parts: "aftermarket_parts",
      garaging_zip: "garaging_zip",
      garaging_address: "garaging_address",
    };
    return first[suffix] ?? `vehicle_${suffix}`;
  }
  return `vehicle_${index}_${suffix}`;
}

function absorbCoverages(target: GeminiExtractJson, raw: unknown) {
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!isPlainObject(row)) continue;
      const label = scalarString(row.name ?? row.coverage ?? row.type ?? row.label ?? row.description).toLowerCase();
      const limit = scalarString(row.limit ?? row.limits ?? row.amount ?? row.value);
      const deductible = scalarString(row.deductible ?? row.ded);
      const hit = COVERAGE_ROWS.find((rowTest) => rowTest.test.test(label));
      if (!hit) continue;
      const chosen = hit.part === "deductible" ? deductible || limit : limit || deductible;
      writeFlat(target, hit.key, { value: chosen, confidence: readConfidence(row, 0.88) }, 0.88);
    }
    return;
  }
  if (!isPlainObject(raw)) return;
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeGeminiJsonKey(key);
    const sheetKey = AUTO_FLAT_ALIAS[normalized] ?? (sheetKeysForGeminiKey(normalized)[0] || "");
    if (!sheetKey || !autoFieldKey(sheetKey)) continue;
    const nested =
      isPlainObject(value) && !("value" in value)
        ? scalarString(value.deductible ?? value.limit ?? value.amount) || scalarString(value)
        : value;
    writeFlat(target, sheetKey, nested, 0.88);
  }
}

function splitPolicyPeriod(raw: string): { start: string; end: string } | null {
  const match = raw.match(/^(.{4,}?)\s*(?:-{1,2}|–|—|\bto\b|\bthrough\b)\s*(.{4,})$/i);
  if (!match) return null;
  if (!/\d/.test(match[1]) || !/\d/.test(match[2])) return null;
  return { start: match[1].trim(), end: match[2].trim() };
}

/** Flatten ACORD-style vehicles / drivers / coverages into Auto sheet keys. */
export function expandAutoGeminiJson(json: GeminiExtractJson): GeminiExtractJson {
  const envelopeKey = Object.keys(json);
  let root: GeminiExtractJson = json;
  if (envelopeKey.length === 1) {
    const only = normalizeGeminiJsonKey(envelopeKey[0]);
    const inner = json[envelopeKey[0]];
    if (
      (only === "fields" || only === "extracted" || only === "extraction" || only === "data" || only === "result" || only === "output") &&
      isPlainObject(inner)
    ) {
      root = inner as GeminiExtractJson;
    }
  }
  const out: GeminiExtractJson = { ...root };

  const vehicles = takeCollection(out, ["vehicles", "vehicle_schedule", "autos", "units", "vehicle"]);
  vehicles?.forEach((item, index) => {
    if (!isPlainObject(item)) return;
    for (const [key, value] of Object.entries(item)) {
      const suffix = VEHICLE_SUFFIX[normalizeGeminiJsonKey(key)];
      if (!suffix) continue;
      const sheetKey = vehicleSheetKey(index + 1, suffix);
      if (!sheetKey) continue;
      writeFlat(out, sheetKey, value, 0.9);
    }
  });

  const drivers = takeCollection(out, ["drivers", "operators", "driver_schedule", "driver"]);
  const hadDriverList = Boolean(drivers && drivers.length > 0);
  drivers?.forEach((item, index) => {
    if (!isPlainObject(item)) return;
    for (const [key, value] of Object.entries(item)) {
      const suffix = DRIVER_SUFFIX[normalizeGeminiJsonKey(key)];
      if (!suffix) continue;
      if (suffix === "relationship" && index === 0) continue;
      const sheetKey = index < 4 ? `driver_${index + 1}_${suffix}` : null;
      if (!sheetKey) continue;
      writeFlat(out, sheetKey, value, 0.9);
    }
  });

  const coverages = out.coverages ?? out.coverage ?? out.coverage_schedule ?? out.limits;
  if (coverages) absorbCoverages(out, coverages);

  const policy = out.policy ?? out.policy_info;
  if (isPlainObject(policy)) {
    writeFlat(out, "policy_number", policy.policy_number ?? policy.number ?? policy.policy_no ?? policy.policy_num);
    writeFlat(out, "current_carrier", policy.carrier ?? policy.company ?? policy.current_carrier ?? policy.writing_company);
    writeFlat(out, "current_premium", policy.premium ?? policy.total_premium ?? policy.current_premium);
    writeFlat(out, "effective_date", policy.effective_date ?? policy.effective ?? policy.from ?? policy.inception);
    writeFlat(out, "expiration_date", policy.expiration_date ?? policy.expiration ?? policy.to ?? policy.expires);
    writeFlat(out, "named_insured", policy.named_insured ?? policy.insured ?? policy.insured_name);
  }

  if (!scalarString(out.driver_1_name)) {
    const named =
      scalarString(out.named_insured) ||
      scalarString(out.current_policy_name_insured) ||
      scalarString(out.applicant_name);
    if (named) writeFlat(out, "driver_1_name", named, 0.86);
  }
  if (!hadDriverList && !scalarString(out.driver_2_name) && scalarString(out.secondary_named_insured)) {
    writeFlat(out, "driver_2_name", out.secondary_named_insured, 0.8);
  }

  const effective = scalarString(out.effective_date);
  if (effective && !scalarString(out.expiration_date)) {
    const period = splitPolicyPeriod(effective);
    if (period) {
      out.effective_date = { value: period.start, confidence: readConfidence(out.effective_date, 0.9) };
      out.expiration_date = { value: period.end, confidence: readConfidence(out.effective_date, 0.9) };
    }
  }

  if (!scalarString(out.garaging_zip) && scalarString(out.garaging_address)) {
    const parts = parseAddressParts(scalarString(out.garaging_address));
    if (parts.zip) writeFlat(out, "garaging_zip", parts.zip, 0.85);
  }

  return out;
}

/**
 * Map Gemini JSON → ExtractedField[].
 * Below the confidence floor: do not auto-fill (empty normalizedValue), flagged=true for audit.
 * At/above the floor: writeable value, flagged=false, matchPath=gemini.
 * Auto decs (including photos) use AUTO_EXTRACT_CONFIDENCE_FLOOR. Other lines keep CONFIDENCE_THRESHOLD.
 */
export function mapGeminiJsonToFields(
  json: GeminiExtractJson | null | undefined,
  docType?: string | null,
  options?: { shopLine?: string | null },
): ExtractionResult {
  const fields: ExtractedField[] = [];
  const unmappedLabels: UnmappedExtractLabel[] = [];
  const sourceDocTag = sourceTagForDoc(docType);
  const seen = new Set<string>();
  const shopAuto = isAutoShopLine(options?.shopLine);
  const looksAuto = Boolean(json && typeof json === "object" && payloadLooksAuto(json));
  const autoMode = shopAuto || looksAuto;
  const sourceJson = autoMode && json ? expandAutoGeminiJson(json) : json;

  if (!sourceJson || typeof sourceJson !== "object") {
    return {
      fields: [],
      documentQuality: "messy",
      qualityNotes: ["gemini_empty_json"],
      glanceRequired: true,
      unmappedLabels: [],
      fieldMapDocType: docType ?? null,
    };
  }

  for (const [rawKey, raw] of Object.entries(sourceJson)) {
    const geminiKey = normalizeGeminiJsonKey(rawKey);
    const payload = asPayload(raw);
    if (!payload) continue;
    const sheetKeys = sheetKeysForExtract(geminiKey, autoMode);
    if (sheetKeys.length === 0) {
      const knownKeys = new Set<string>([
        ...GEMINI_EXTRACT_JSON_KEYS,
        ...GEMINI_AUTO_EXTRACT_JSON_KEYS,
        ...GEMINI_LETTER_EXTRACT_JSON_KEYS,
      ]);
      if (!knownKeys.has(geminiKey)) {
        unmappedLabels.push({ sourceLabel: geminiKey, rawValue: payload.value });
      }
      continue;
    }

    const floor =
      shopAuto || (looksAuto && sheetKeys.some((key) => autoFieldKey(key)))
        ? AUTO_EXTRACT_CONFIDENCE_FLOOR
        : CONFIDENCE_THRESHOLD;
    const above = payload.confidence >= floor;
    for (const fieldKey of sheetKeys) {
      if (seen.has(fieldKey)) continue;
      seen.add(fieldKey);
      const letterValue = normalizeOirLetterCode(fieldKey, payload.value);
      fields.push({
        fieldKey,
        label: labelForKey(fieldKey),
        rawValue: payload.value,
        normalizedValue: above ? letterValue : "",
        confidence: payload.confidence,
        flagged: !above,
        source: above ? "labeled" : "uncertain",
        sourceDocTag,
        matchPath: "gemini",
        blankAfterMatch: !above,
        missReason: above ? undefined : "below_confidence_threshold",
      });
    }

    if (
      geminiKey === "property_address" ||
      geminiKey === "location_description" ||
      geminiKey === "property_information" ||
      geminiKey === "insured_property" ||
      geminiKey === "residence_premises" ||
      geminiKey === "mailing_address"
    ) {
      const parts = parseAddressParts(payload.value);
      if (parts.city && !seen.has("city") && above) {
        seen.add("city");
        fields.push({
          fieldKey: "city",
          label: "city",
          rawValue: parts.city,
          normalizedValue: parts.city,
          confidence: payload.confidence,
          flagged: false,
          source: "inferred",
          sourceDocTag,
          matchPath: "gemini",
        });
      }
      if (parts.state && !seen.has("state") && above) {
        seen.add("state");
        fields.push({
          fieldKey: "state",
          label: "state",
          rawValue: parts.state,
          normalizedValue: parts.state,
          confidence: payload.confidence,
          flagged: false,
          source: "inferred",
          sourceDocTag,
          matchPath: "gemini",
        });
      }
      if (parts.zip && !seen.has("zip") && above) {
        seen.add("zip");
        fields.push({
          fieldKey: "zip",
          label: "zip",
          rawValue: parts.zip,
          normalizedValue: parts.zip,
          confidence: payload.confidence,
          flagged: false,
          source: "inferred",
          sourceDocTag,
          matchPath: "gemini",
        });
      }
      // Prefer street-only on address1 when we parsed locality
      if (parts.street && parts.street !== payload.value && above) {
        for (const addrKey of ["address", "address1"]) {
          const existing = fields.find((f) => f.fieldKey === addrKey);
          if (existing && existing.normalizedValue) {
            existing.normalizedValue = parts.street;
            existing.rawValue = parts.street;
          }
        }
      }
    }
  }

  // Prefer explicit date_inspected; if only four_point_date came back, also fill date_inspected when blank.
  const fourPoint = fields.find((f) => f.fieldKey === "four_point_date" && f.normalizedValue.trim());
  if (fourPoint && !seen.has("date_inspected")) {
    seen.add("date_inspected");
    fields.push({
      ...fourPoint,
      fieldKey: "date_inspected",
      label: "date inspected",
    });
  }

  const glanceRequired = fields.some((f) => f.flagged || f.blankAfterMatch) || unmappedLabels.length > 0;
  return {
    fields,
    documentQuality: fields.length ? "clean" : "messy",
    qualityNotes: ["gemini"],
    glanceRequired,
    unmappedLabels,
    fieldMapDocType: docType ?? null,
  };
}

/** Fields safe to pass into applyExtractedToSheet (skips below-threshold blanks). */
export function fillableGeminiFields(fields: ExtractedField[]): ExtractedField[] {
  return fields.filter((f) => f.normalizedValue.trim() !== "" && !f.blankAfterMatch);
}
