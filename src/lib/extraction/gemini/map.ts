import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import type { ExtractedField, ExtractionResult, UnmappedExtractLabel } from "@/lib/extraction/extract";
import { GEMINI_EXTRACT_JSON_KEYS, type GeminiExtractKey } from "./prompt";

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
  swr: ["swr"],
  opening_protection: ["opening_protection"],
  building_code: ["building_code"],
  design_wind_speed: ["wind_speed", "design_wind_speed"],
  mailing_address: ["mailing_address"],
  months_occupied: ["months_occupied"],
  usage: ["usage"],
  entity_type: ["entity_type"],
  construction_type: ["construction"],
  coverage_a: ["coverage_a"],
  ordinance_law: ["ordinance_or_law"],
  water_backup: ["water_backup"],
  scheduled_personal_property: ["scheduled_personal_property", "scheduled_personal"],
  hurricane_deductible: ["hurricane_deductible"],
  aop_deductible: ["aop_deductible"],
  wind_hail_deductible: ["wind_hail_deductible"],
  current_policy_name_insured: ["named_insured", "current_policy_named_insured"],
  policy_number: ["policy_number"],
  current_premium: ["current_premium"],
  effective_date: ["effective_date"],
  expiration_date: ["expiration_date"],
  mortgagee: ["mortgagee"],
  loan_number: ["loan_number"],
  city: ["city"],
  state: ["state"],
  zip: ["zip"],
  county: ["county"],
  roof_year: ["roof_year"],
  named_insured: ["named_insured"],
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
      if (!(GEMINI_EXTRACT_JSON_KEYS as readonly string[]).includes(geminiKey)) {
        unmappedLabels.push({ sourceLabel: geminiKey, rawValue: payload.value });
      }
      continue;
    }

    const above = payload.confidence >= CONFIDENCE_THRESHOLD;
    for (const fieldKey of sheetKeys) {
      if (seen.has(fieldKey)) continue;
      seen.add(fieldKey);
      fields.push({
        fieldKey,
        label: labelForKey(fieldKey),
        rawValue: payload.value,
        normalizedValue: above ? payload.value : "",
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
