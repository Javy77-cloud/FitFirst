/**
 * Extraction public types + risk helpers.
 * Synonym / checkbox / field-map text extract lives under legacy_extraction/
 * and is NOT used by Fill from source (Gemini). Re-exported only for tests / OCR helpers.
 */

export type ExtractedField = {
  fieldKey: string;
  label: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  flagged: boolean;
  source: "labeled" | "inferred" | "uncertain";
  /** dec page / 4pt inspection / wind mitigation / related insured */
  sourceDocTag?: string;
  /** Synonym matched with no usable value — sheet cell stays yellow/blank. */
  blankAfterMatch?: boolean;
  /** How this value was found — audit trail. */
  matchPath?: "synonym" | "field_map" | "pattern" | "none" | "gemini";
  matchedSynonym?: string;
  sourceLine?: string;
  sourceLineNo?: number;
  missReason?: string;
};

export type UnmappedExtractLabel = {
  sourceLabel: string;
  rawValue: string;
};

export type ExtractionResult = {
  fields: ExtractedField[];
  documentQuality: "clean" | "messy";
  qualityNotes: string[];
  glanceRequired: boolean;
  /** Labeled lines with no map row — stay blank on the sheet; review bucket. */
  unmappedLabels: UnmappedExtractLabel[];
  fieldMapDocType: string | null;
};

/** LEGACY re-export — tests / OCR only. Fill from source uses Gemini. */
export {
  extractFieldsFromText,
  assessDocumentQuality,
  normalizeExtractText,
} from "./legacy_extraction/extract-text";

export function fieldKeyToRiskColumn(fieldKey: string): string | null {
  const map: Record<string, string> = {
    address: "address1",
    city: "city",
    county: "county",
    state: "state",
    zip: "zip",
    year_built: "yearBuilt",
    construction: "construction",
    occupancy: "occupancy",
    stories: "stories",
    coverage_a: "coverageA",
    roof_year: "roofYear",
    roof_covering: "roofCovering",
    opening_protection: "openingProtection",
    pool: "pool",
    protection_class: "protectionClass",
    miles_to_coast: "milesToCoast",
    square_feet: "squareFeet",
    mobile_home: "mobileHome",
    replacement_cost_estimate: "replacementCostEstimate",
  };
  return map[fieldKey] ?? null;
}

export function coerceRiskValue(
  fieldKey: string,
  normalized: string,
): string | number | boolean | null {
  if (normalized === "" || normalized === "NaN") return null;
  if (
    fieldKey === "year_built" ||
    fieldKey === "roof_year" ||
    fieldKey === "stories" ||
    fieldKey === "coverage_a" ||
    fieldKey === "square_feet" ||
    fieldKey === "replacement_cost_estimate"
  ) {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (fieldKey === "miles_to_coast") {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (fieldKey === "pool" || fieldKey === "mobile_home") {
    return normalized === "true";
  }
  return normalized;
}
