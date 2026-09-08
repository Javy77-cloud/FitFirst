import type { PublicFact } from "@/lib/quote-sheet/apply";

export const PROPERTY_RECORDS_SOURCE = "property-records" as const;
export const PROPERTY_RECORDS_LABEL = "property records";

export type FloridaParcelHit = Record<string, unknown>;

export type PropertyRecordsFact = PublicFact & {
  sheetKey: string;
};

const FIELD_ALIASES: Array<{ sheetKey: string; keys: string[] }> = [
  { sheetKey: "year_built", keys: ["year_built", "yearBuilt", "yr_built", "yrblt"] },
  {
    sheetKey: "construction",
    keys: ["construction_type", "construction", "ext_wall", "exterior_wall", "exterior"],
  },
  {
    sheetKey: "square_feet",
    keys: [
      "living_area",
      "living_area_sqft",
      "heated_area",
      "sqft",
      "square_feet",
      "square_footage",
      "total_living_area",
      "bldg_sqft",
    ],
  },
  {
    sheetKey: "roof_covering",
    keys: ["roof_type", "roof_cover", "roof_covering", "roof_material"],
  },
  { sheetKey: "stories", keys: ["stories", "num_stories", "number_of_stories", "floors"] },
  { sheetKey: "county", keys: ["county", "county_name"] },
  { sheetKey: "parcel_id", keys: ["parcel_id", "parcelid", "folio", "folio_number"] },
  { sheetKey: "assessed_value", keys: ["assessed_value", "assessed", "just_value"] },
  { sheetKey: "applicant_name", keys: ["owner_name", "owner", "owner1"] },
];

function firstString(hit: FloridaParcelHit, keys: string[]): string {
  for (const key of keys) {
    const raw = hit[key];
    if (raw == null) continue;
    const value = typeof raw === "number" && Number.isFinite(raw) ? String(raw) : String(raw).trim();
    if (value) return value;
  }
  return "";
}

/** Map a search hit onto master-sheet fields. Extra vendor keys are ignored. */
export function factsFromFloridaParcel(hit: FloridaParcelHit | null | undefined): PropertyRecordsFact[] {
  if (!hit) return [];
  const facts: PropertyRecordsFact[] = [];
  for (const row of FIELD_ALIASES) {
    const value = firstString(hit, row.keys);
    if (!value) continue;
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

export function pickFirstParcel(payload: unknown): FloridaParcelHit | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { data?: unknown; results?: unknown; parcels?: unknown };
  const list = Array.isArray(body.data)
    ? body.data
    : Array.isArray(body.results)
      ? body.results
      : Array.isArray(body.parcels)
        ? body.parcels
        : Array.isArray(payload)
          ? payload
          : [];
  const first = list[0];
  return first && typeof first === "object" ? (first as FloridaParcelHit) : null;
}
