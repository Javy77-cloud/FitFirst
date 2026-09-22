import type { PublicFact } from "@/lib/quote-sheet/apply";
import { parseGarageFact } from "@/lib/quote-sheet/sheet-defaults";

export const PROPERTY_RECORDS_SOURCE = "property-records" as const;
export const PROPERTY_RECORDS_LABEL = "property records";

export type GetParcelHit = Record<string, unknown>;

export type PropertyRecordsFact = PublicFact & {
  sheetKey: string;
};

/** Dwelling attrs Lee County (and many FL assessors) often leave null in GetParcelData. */
export const DWELLING_VENDOR_KEYS = [
  "building_area",
  "bedrooms",
  "bathrooms",
  "stories",
  "number_of_units",
] as const;

/** Map GetParcelData UnifiedParcel fields onto master-sheet keys when present. */
const FIELD_ALIASES: Array<{ sheetKey: string; keys: string[] }> = [
  { sheetKey: "year_built", keys: ["year_built", "yearBuilt", "yr_built"] },
  { sheetKey: "year_effective", keys: ["year_effective", "yearEffective", "effective_year"] },
  {
    sheetKey: "square_feet",
    keys: ["building_area", "building_footprint_total_sqft", "living_area", "sqft", "square_feet"],
  },
  { sheetKey: "beds", keys: ["bedrooms", "beds", "bedroom_count"] },
  { sheetKey: "baths", keys: ["bathrooms", "baths", "bathroom_count"] },
  { sheetKey: "stories", keys: ["stories", "num_stories", "number_of_stories", "floors"] },
  { sheetKey: "living_units", keys: ["number_of_units", "living_units", "units"] },
  {
    sheetKey: "construction",
    keys: ["construction_type", "construction"],
  },
  {
    sheetKey: "exterior",
    keys: ["exterior", "exterior_wall", "ext_wall", "exterior_finish", "wall_type"],
  },
  {
    sheetKey: "foundation",
    keys: ["foundation", "foundation_type", "foundation_code"],
  },
  {
    sheetKey: "roof_covering",
    keys: ["roof_type", "roof_cover", "roof_covering", "roof_material"],
  },
  { sheetKey: "pool", keys: ["pool", "has_pool", "swimming_pool"] },
  { sheetKey: "structure_type", keys: ["structure_type", "building_type"] },
  { sheetKey: "flood_zone", keys: ["flood_zone", "fld_zone"] },
  { sheetKey: "parcel_id", keys: ["parcel_id", "apn", "parcelid", "folio"] },
  { sheetKey: "assessed_value", keys: ["assessed_value", "assessed", "just_value"] },
  { sheetKey: "land_value", keys: ["land_value"] },
  { sheetKey: "improvement_value", keys: ["improvement_value", "building_value", "bldg_value"] },
  { sheetKey: "sale_price", keys: ["sale_price"] },
  { sheetKey: "assessment_year", keys: ["assessment_year", "tax_year", "roll_year"] },
  { sheetKey: "homestead", keys: ["homestead"] },
  { sheetKey: "zoning", keys: ["zoning", "unified_zoning_category"] },
  { sheetKey: "land_use", keys: ["land_use", "unified_land_use_category"] },
  { sheetKey: "acres", keys: ["acreage", "acres"] },
  { sheetKey: "legal_description", keys: ["legal_description", "legal", "legal_desc"] },
  { sheetKey: "subdivision", keys: ["subdivision_name", "subdivision"] },
  { sheetKey: "county", keys: ["county", "county_name", "municipality"] },
  { sheetKey: "applicant_name", keys: ["owner_name", "owner", "owner1"] },
];

function isNullish(raw: unknown): boolean {
  if (raw == null) return true;
  const value = String(raw).trim();
  return !value || value.toLowerCase() === "null" || value.toLowerCase() === "undefined";
}

function firstString(hit: GetParcelHit, keys: string[]): string {
  for (const key of keys) {
    const raw = hit[key];
    if (isNullish(raw)) continue;
    const value = typeof raw === "number" && Number.isFinite(raw) ? String(raw) : String(raw).trim();
    if (value) return value;
  }
  return "";
}

/** Format acreage: up to 4 decimals, trim trailing zeros. */
export function formatAcres(raw: unknown): string {
  if (isNullish(raw)) return "";
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(/,/g, ""));
  if (!Number.isFinite(n)) {
    const s = String(raw).trim();
    return s.toLowerCase() === "null" ? "" : s;
  }
  return n.toFixed(4).replace(/\.?0+$/, "");
}

export function yearFromSaleDate(raw: unknown): string {
  if (isNullish(raw)) return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})/);
  if (m) return m[1]!;
  const n = Number(s);
  if (Number.isFinite(n) && n > 1e11) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return String(d.getUTCFullYear());
  }
  return "";
}

export function composeMailingAddress(hit: GetParcelHit): string {
  const line1 = firstString(hit, ["owner_address_line1", "owner_address"]);
  const line2 = firstString(hit, ["owner_address_line2"]);
  const city = firstString(hit, ["owner_city"]);
  const state = firstString(hit, ["owner_state"]);
  const zip = firstString(hit, ["owner_zip"]);
  const cityLine = [city, state].filter(Boolean).join(", ");
  const withZip = [cityLine, zip].filter(Boolean).join(" ");
  return [line1, line2, withZip].filter(Boolean).join(", ");
}

export function parcelVintage(hit: GetParcelHit): string {
  return (
    firstString(hit, ["assessment_year"]) ||
    firstString(hit, ["updated_date"]) ||
    firstString(hit, ["created_date"]) ||
    ""
  );
}

export function nullDwellingKeys(hit: GetParcelHit): string[] {
  return DWELLING_VENDOR_KEYS.filter((key) => isNullish(hit[key]));
}

function pushFact(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value) return;
  if (sheetKey === "coverage_a") return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: PROPERTY_RECORDS_LABEL,
    kind: "county",
  });
}

/** Map a parcel hit onto master-sheet fields. Never invent Cov A from assessed/sale/market. */
export function factsFromGetParcel(hit: GetParcelHit | null | undefined): PropertyRecordsFact[] {
  if (!hit) return [];
  const facts: PropertyRecordsFact[] = [];
  for (const row of FIELD_ALIASES) {
    let value = "";
    if (row.sheetKey === "acres") {
      value = formatAcres(firstString(hit, row.keys) || hit.acreage || hit.acres);
      if (!value) {
        for (const key of row.keys) {
          if (!isNullish(hit[key])) {
            value = formatAcres(hit[key]);
            if (value) break;
          }
        }
      }
    } else {
      value = firstString(hit, row.keys);
    }
    if (!value) continue;
    pushFact(facts, row.sheetKey, value);
    if (row.sheetKey === "applicant_name") {
      pushFact(facts, "named_insured", value);
    }
  }

  const yearPurchased = yearFromSaleDate(hit.sale_date);
  if (yearPurchased) pushFact(facts, "year_purchased", yearPurchased);

  const mailing = composeMailingAddress(hit);
  if (mailing) pushFact(facts, "mailing_address", mailing);

  pushOptionalParcelFacts(facts, hit);

  return facts;
}

function yesNoFact(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "y" || lower === "yes" || lower === "true" || lower === "1") return "yes";
  if (lower === "n" || lower === "no" || lower === "false" || lower === "0") return "no";
  return "";
}

function basementFact(raw: string): string {
  const yn = yesNoFact(raw);
  if (yn) return yn;
  const lower = raw.toLowerCase();
  if (/none|no basement|slab only/.test(lower)) return "no";
  if (/full|partial|finished|unfinished|basement|walkout|walk-out/.test(lower)) return "yes";
  return "";
}

/**
 * Optional vendor keys. Absent keys stay off the fact list — never defaulted.
 * County layers and FEMA do not supply hydrant, station, city limits, usage,
 * months occupied, or a building elevation distinct from base flood elevation.
 */
function pushOptionalParcelFacts(facts: PropertyRecordsFact[], hit: GetParcelHit) {
  const garageRaw = firstString(hit, ["garage_type", "garage"]);
  if (garageRaw) {
    const parsed = parseGarageFact(garageRaw);
    if (parsed.type) pushFact(facts, "garage_type", parsed.type);
    if (parsed.spaces) pushFact(facts, "garage_spaces", parsed.spaces);
  }
  const spacesRaw = firstString(hit, ["garage_spaces", "garage_stalls", "number_of_garage_spaces"]);
  if (spacesRaw) {
    const parsed = parseGarageFact(spacesRaw);
    if (parsed.spaces) pushFact(facts, "garage_spaces", parsed.spaces);
    else if (parsed.type && !facts.some((fact) => fact.sheetKey === "garage_type")) {
      pushFact(facts, "garage_type", parsed.type);
    }
  }
  const basement = basementFact(firstString(hit, ["basement", "has_basement", "basement_type"]));
  if (basement) pushFact(facts, "basement", basement);
  const cityLimits = yesNoFact(
    firstString(hit, ["within_city_limits", "in_city", "inside_city_limits", "city_limits"]),
  );
  if (cityLimits) pushFact(facts, "within_city_limits", cityLimits);
  const usage = firstString(hit, ["usage"]);
  if (usage) pushFact(facts, "usage", usage);
  const months = firstString(hit, ["months_occupied"]);
  if (months) pushFact(facts, "months_occupied", months);
  const hydrant = firstString(hit, ["distance_to_hydrant", "hydrant_distance", "hydrant"]);
  if (hydrant) pushFact(facts, "hydrant", hydrant);
  const station = firstString(hit, [
    "distance_to_fire_station",
    "fire_station_distance",
    "miles_to_fire_station",
  ]);
  if (station) pushFact(facts, "miles_to_fire_station", station);
  const elevation = firstString(hit, ["elevation", "ground_elevation"]);
  if (elevation) pushFact(facts, "elevation", elevation);
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

export function summarizeGetParcelFill(hit: GetParcelHit | null | undefined, factCount: number): string {
  if (!hit) return `GetParcelData returned ${factCount} field(s) for empty-only fill.`;
  const nulls = nullDwellingKeys(hit);
  const vintage = parcelVintage(hit);
  const parts = [`GetParcelData returned ${factCount} field(s) for empty-only fill`];
  if (vintage) parts.push(`assessment/vintage ${vintage}`);
  if (nulls.length) {
    const labels: string[] = [];
    if (nulls.includes("bedrooms")) labels.push("beds");
    if (nulls.includes("bathrooms")) labels.push("baths");
    if (nulls.includes("building_area")) labels.push("sqft");
    if (nulls.includes("stories")) labels.push("stories");
    if (labels.length) parts.push(`${labels.join("/")} not in county feed`);
  }
  return `${parts.join(". ")}.`;
}
