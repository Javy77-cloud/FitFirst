import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import type { ExtractedField, ExtractionResult, UnmappedExtractLabel } from "@/lib/extraction/extract";
import { expandAutoDecLayout } from "./auto-layout";
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
  policy: ["policy_number"],
  pol: ["policy_number"],
  carrier: ["current_carrier"],
  carrier_name: ["current_carrier"],
  company_name: ["current_carrier"],
  insurer_name: ["current_carrier"],
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
  insurance_name: ["current_carrier"],
  named_insurer: ["current_carrier"],
  insurance_carrier: ["current_carrier"],
  insurance_company: ["current_carrier"],
  issuing_company: ["current_carrier"],
  underwriting_company: ["current_carrier"],
  writing_company: ["current_carrier"],
  insurer: ["current_carrier"],
  current_policy_id: ["policy_number"],
  current_policy_number: ["policy_number"],
  policy_id_number: ["policy_number"],
  years_with_company: ["years_with_carrier"],
  years_insured: ["years_with_carrier"],
  years_with_insurer: ["years_with_carrier"],
  aaa_member: ["aaa_member"],
  aaa: ["aaa_member"],
  aaa_membership: ["aaa_member"],
  v_i_n: ["vin"],
  vin_number: ["vin"],
  vin_no: ["vin"],
  vehicle_identification_no: ["vin"],
  liability_bodily_injury: ["liability_bi"],
  uninsured_motorist_bodily_injury: ["um_uim"],
  underinsured_motorist_bodily_injury: ["um_uim"],
  collision_coverage: ["collision_deductible"],
  other_than_collision: ["comp_deductible"],
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

/** A printed value with no confidence object is a model commitment, not a 0.5 maybe. */
const BARE_PRINTED_CONFIDENCE = 0.9;

function asPayload(raw: unknown): { value: string; confidence: number } | null {
  if (raw == null) return null;
  if (typeof raw === "string" || typeof raw === "number") {
    const value = String(raw).trim();
    if (!value || value.toLowerCase() === "null" || value.toLowerCase() === "n/a") return null;
    return { value, confidence: BARE_PRINTED_CONFIDENCE };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as GeminiFieldPayload & {
    text?: string | number | null;
    limit?: string | number | null;
    amount?: string | number | null;
    deductible?: string | number | null;
  };
  const rawValue = obj.value ?? obj.text ?? obj.limit ?? obj.amount ?? obj.deductible;
  if (rawValue == null || typeof rawValue === "object") return null;
  const value = String(rawValue).trim();
  if (!value || value.toLowerCase() === "null" || value.toLowerCase() === "n/a") return null;
  const confidence =
    obj.confidence == null ? BARE_PRINTED_CONFIDENCE : clampConfidence(Number(obj.confidence));
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

const CURRENTLY_INSURED_OPTIONS = [
  "Currently insured 6 months or more",
  "Lapse within last 30 days — 7 days or less",
  "Lapse within last 30 days — 8 to 14 days",
  "Lapse within last 30 days — 15 to 30 days",
  "More than 30 days lapse in the last 6 months / no prior insurance",
  "Other",
] as const;

/** Map a printed prior-insurance phrase onto the Auto dropdown. Bare "yes" is not 6 months. */
export function normalizeCurrentlyInsured(raw: string): string {
  const trimmed = raw.trim();
  const exact = CURRENTLY_INSURED_OPTIONS.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const low = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (/no prior|no insurance|more than 30 days/.test(low)) {
    return "More than 30 days lapse in the last 6 months / no prior insurance";
  }
  if (/15\s*(to|-)\s*30/.test(low)) return "Lapse within last 30 days — 15 to 30 days";
  if (/8\s*(to|-)\s*14/.test(low)) return "Lapse within last 30 days — 8 to 14 days";
  if (/7 days or less/.test(low)) return "Lapse within last 30 days — 7 days or less";
  if (/6 months or more/.test(low)) return "Currently insured 6 months or more";
  return trimmed;
}

/** AAA tenure only. "Yes" without years stays as printed — do not guess 1–9 or 10+. */
export function normalizeAaaMember(raw: string): string {
  const trimmed = raw.trim();
  const low = trimmed.toLowerCase();
  if (low === "none" || low === "no" || low === "n" || low === "not a member" || low === "non-member") {
    return "None";
  }
  if (/10\s*\+|10\+?\s*years|10 or more/.test(low)) return "10+ years";
  if (/1\s*[–\-]\s*9|1 to 9|less than 10/.test(low)) return "1–9 years";
  return trimmed;
}

function moneyDigits(raw: string): string {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : cleaned;
}

export function normalizeAutoPolicyValue(fieldKey: string, raw: string): string {
  if (fieldKey === "current_premium" || fieldKey === "premium") return moneyDigits(raw);
  if (fieldKey === "years_with_carrier") {
    const match = raw.match(/\d+/);
    return match ? match[0] : raw.trim();
  }
  if (fieldKey === "currently_insured") return normalizeCurrentlyInsured(raw);
  if (fieldKey === "aaa_member") return normalizeAaaMember(raw);
  return raw;
}

/**
 * Map Gemini JSON → ExtractedField[].
 * Below CONFIDENCE_THRESHOLD: do not auto-fill (empty normalizedValue), flagged=true for audit.
 * At/above threshold: writeable value, flagged=false, matchPath=gemini.
 */
export function mapGeminiJsonToFields(
  json: GeminiExtractJson | null | undefined,
  docType?: string | null,
  shopLine?: string | null,
): ExtractionResult {
  const fields: ExtractedField[] = [];
  const unmappedLabels: UnmappedExtractLabel[] = [];
  const sourceDocTag = sourceTagForDoc(docType);
  const seen = new Set<string>();

  if (!json || typeof json !== "object") {
    return {
      fields: [],
      documentQuality: "messy",
      qualityNotes: ["gemini_empty_json"],
      glanceRequired: true,
      unmappedLabels: [],
      fieldMapDocType: docType ?? null,
    };
  }

  const prepared = expandAutoDecLayout(json as Record<string, unknown>, shopLine);
  for (const [rawKey, raw] of Object.entries(prepared)) {
    const geminiKey = normalizeGeminiJsonKey(rawKey);
    const payload = asPayload(raw);
    if (!payload) continue;
    const sheetKeys = sheetKeysForGeminiKey(geminiKey);
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

    const above = payload.confidence >= CONFIDENCE_THRESHOLD;
    for (const fieldKey of sheetKeys) {
      if (seen.has(fieldKey)) continue;
      seen.add(fieldKey);
      const letterValue = normalizeAutoPolicyValue(
        fieldKey,
        normalizeOirLetterCode(fieldKey, payload.value),
      );
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
