import type { PublicFact } from "@/lib/quote-sheet/apply";

export const PROPERTY_RECORDS_SOURCE = "property-records" as const;
export const PROPERTY_RECORDS_LABEL = "property records";

export type GetParcelHit = Record<string, unknown>;

export type PropertyRecordsFact = PublicFact & {
  sheetKey: string;
};

/** Map GetParcelData UnifiedParcel fields onto master-sheet keys when present. */
const FIELD_ALIASES: Array<{ sheetKey: string; keys: string[] }> = [
  { sheetKey: "year_built", keys: ["year_built", "yearBuilt", "yr_built"] },
  {
    sheetKey: "square_feet",
    keys: ["building_area", "building_footprint_total_sqft", "living_area", "sqft", "square_feet"],
  },
  { sheetKey: "beds", keys: ["bedrooms", "beds", "bedroom_count"] },
  { sheetKey: "baths", keys: ["bathrooms", "baths", "bathroom_count"] },
  { sheetKey: "stories", keys: ["stories", "num_stories", "number_of_stories", "floors"] },
  {
    sheetKey: "construction",
    keys: ["construction_type", "construction", "ext_wall", "exterior_wall", "unified_land_use_category"],
  },
  {
    sheetKey: "roof_covering",
    keys: ["roof_type", "roof_cover", "roof_covering", "roof_material"],
  },
  { sheetKey: "pool", keys: ["pool", "has_pool", "swimming_pool"] },
  { sheetKey: "garage_type", keys: ["garage", "garage_type", "garage_spaces"] },
  { sheetKey: "flood_zone", keys: ["flood_zone", "fld_zone"] },
  { sheetKey: "parcel_id", keys: ["parcel_id", "apn", "parcelid", "folio"] },
  { sheetKey: "assessed_value", keys: ["assessed_value", "assessed", "just_value"] },
  { sheetKey: "county", keys: ["county", "county_name", "municipality"] },
  { sheetKey: "applicant_name", keys: ["owner_name", "owner", "owner1"] },
];

function firstString(hit: GetParcelHit, keys: string[]): string {
  for (const key of keys) {
    const raw = hit[key];
    if (raw == null) continue;
    const value = typeof raw === "number" && Number.isFinite(raw) ? String(raw) : String(raw).trim();
    if (value && value.toLowerCase() !== "null") return value;
  }
  return "";
}

/** Map a parcel hit onto master-sheet fields. Never invent Cov A from assessed/sale/market. */
export function factsFromGetParcel(hit: GetParcelHit | null | undefined): PropertyRecordsFact[] {
  if (!hit) return [];
  const facts: PropertyRecordsFact[] = [];
  for (const row of FIELD_ALIASES) {
    const value = firstString(hit, row.keys);
    if (!value) continue;
    // Never route valuation into coverage_a.
    if (row.sheetKey === "coverage_a") continue;
    facts.push({
      fieldKey: row.sheetKey,
      sheetKey: row.sheetKey,
      value,
      sourceLabel: PROPERTY_RECORDS_LABEL,
      kind: "county",
    });
    if (row.sheetKey === "applicant_name") {
      facts.push({
        fieldKey: "named_insured",
        sheetKey: "named_insured",
        value,
        sourceLabel: PROPERTY_RECORDS_LABEL,
        kind: "county",
      });
    }
  }
  return facts;
}

export function pickFirstParcel(payload: unknown): GetParcelHit | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { data?: unknown; results?: unknown; parcels?: unknown };
  const list = Array.isArray(body.parcels)
    ? body.parcels
    : Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.results)
        ? body.results
        : Array.isArray(payload)
          ? payload
          : [];
  const first = list[0];
  return first && typeof first === "object" ? (first as GetParcelHit) : null;
}
