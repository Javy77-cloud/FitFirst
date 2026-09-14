import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import type { ExtractedField, ExtractionResult, UnmappedExtractLabel } from "@/lib/extraction/extract";
import { GEMINI_AUTO_EXTRACT_JSON_KEYS, GEMINI_EXTRACT_JSON_KEYS, type GeminiExtractKey } from "./prompt";

/** Gemini JSON key → one or more sheet / extract field keys. */
export const GEMINI_KEY_TO_SHEET: Record<string, string[]> = {
  applicant_name: ["applicant_name"],
  property_address: ["address", "address1", "applicant_address"],
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
  mailing_address: ["mailing_address"],
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
  current_premium: ["current_premium"],
  effective_date: ["effective_date"],
  expiration_date: ["expiration_date"],
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
  secondary_named_insured: ["secondary_named_insured"],
  mortgagee: ["mortgagee", "mortgagee_name"],
  mortgagee_address: ["mortgagee_address"],
  form: ["form"],
  sprinkler: ["sprinkler"],
  fire_alarm: ["central_alarm", "fire_alarm"],
  central_alarm: ["central_alarm"],
  bceg_grade: ["building_code", "bceg_grade"],
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
  driver_1_occupation: ["driver_1_occupation", "applicant_occupation"],
  applicant_gender: ["applicant_gender", "driver_1_gender"],
  applicant_occupation: ["applicant_occupation", "driver_1_occupation"],
  driver_1_license: ["driver_1_license"],
  driver_1_status: ["driver_1_status"],
  driver_1_years_licensed: ["driver_1_years_licensed"],
  driver_2_name: ["driver_2_name"],
  driver_2_dob: ["driver_2_dob"],
  driver_2_license: ["driver_2_license"],
  driver_2_status: ["driver_2_status"],
  driver_2_years_licensed: ["driver_2_years_licensed"],
  driver_3_name: ["driver_3_name"],
  driver_3_dob: ["driver_3_dob"],
  driver_3_license: ["driver_3_license"],
  driver_4_name: ["driver_4_name"],
  driver_4_dob: ["driver_4_dob"],
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

export function sheetKeysForGeminiKey(geminiKey: string): string[] {
  return GEMINI_KEY_TO_SHEET[geminiKey] ?? [];
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
 * Map Gemini JSON → ExtractedField[].
 * Below CONFIDENCE_THRESHOLD: do not auto-fill (empty normalizedValue), flagged=true for audit.
 * At/above threshold: writeable value, flagged=false, matchPath=gemini.
 */
export function mapGeminiJsonToFields(
  json: GeminiExtractJson | null | undefined,
  docType?: string | null,
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

  for (const [geminiKey, raw] of Object.entries(json)) {
    const payload = asPayload(raw);
    if (!payload) continue;
    const sheetKeys = sheetKeysForGeminiKey(geminiKey);
    if (sheetKeys.length === 0) {
      const knownKeys = new Set<string>([...GEMINI_EXTRACT_JSON_KEYS, ...GEMINI_AUTO_EXTRACT_JSON_KEYS]);
      if (!knownKeys.has(geminiKey)) {
        unmappedLabels.push({ sourceLabel: geminiKey, rawValue: payload.value });
      }
      continue;
    }

    const above = payload.confidence >= CONFIDENCE_THRESHOLD;
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

    if (geminiKey === "property_address" || geminiKey === "mailing_address") {
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
