import { dealProductDef, type DealProductId } from "@/lib/deals/deal-products";
import { productChipLabel } from "@/lib/deals/product-chip-label";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

export type VehicleLabelFact = {
  year?: string | null;
  make?: string | null;
};

export type ProductInstanceLabelInput = {
  key: string;
  productId: DealProductId;
  quotingForm?: string | null;
  sheetForm?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  vehicles?: readonly VehicleLabelFact[] | null;
};

/** Form code plus street number and the first street word. City only while the line stays short. */
const COMPACT_POLICY_LABEL = 36;

export function policyFormMenuLabel(input: {
  code: string;
  fallback: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const short = shortStreetStart(input.address);
  if (!short) return input.fallback;
  const code = input.code.trim();
  const base = code ? `${code} · ${short}` : short;
  const city = String(input.city ?? "").replace(/\s+/g, " ").trim();
  if (!city) return base;
  const withCity = `${base} · ${city}`;
  return withCity.length <= COMPACT_POLICY_LABEL ? withCity : base;
}

const DIRECTIONALS: Record<string, string> = {
  n: "North",
  s: "South",
  e: "East",
  w: "West",
  ne: "Northeast",
  nw: "Northwest",
  se: "Southeast",
  sw: "Southwest",
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  northeast: "Northeast",
  northwest: "Northwest",
  southeast: "Southeast",
  southwest: "Southwest",
};

const STREET_SUFFIXES = new Set([
  "st",
  "street",
  "ave",
  "avenue",
  "blvd",
  "boulevard",
  "dr",
  "drive",
  "rd",
  "road",
  "ln",
  "lane",
  "ct",
  "court",
  "cir",
  "circle",
  "pl",
  "place",
  "ter",
  "terrace",
  "way",
  "pkwy",
  "parkway",
  "hwy",
  "highway",
  "trl",
  "trail",
]);

const VEHICLE_PRODUCTS = new Set<DealProductId>([
  "auto",
  "motorcycle",
  "boat",
  "rv",
  "commercial_auto",
]);

function cleanToken(token: string): string {
  return token.toLowerCase().replace(/\./g, "");
}

/** Street number, spelled-out direction, and street name. Drops unit and suffix. */
export function compactStreetLabel(street: string | null | undefined): string {
  const text = String(street ?? "")
    .replace(/[,]+/g, " ")
    .replace(
      /\b(?:apt|apartment|unit|suite|ste|bldg|building|floor|fl)\b\.?\s*#?\s*[a-z0-9-]*/gi,
      " ",
    )
    .replace(/#\s*[a-z0-9-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const tokens = text.split(" ").filter(Boolean);
  while (tokens.length && STREET_SUFFIXES.has(cleanToken(tokens[tokens.length - 1]!))) {
    tokens.pop();
  }
  if (!tokens.length) return "";
  let index = 0;
  let number = "";
  if (/^\d+[a-z]?$/i.test(tokens[0]!)) {
    number = tokens[0]!;
    index = 1;
  }
  let direction = "";
  if (index < tokens.length) {
    const spelled = DIRECTIONALS[cleanToken(tokens[index]!)];
    if (spelled) {
      direction = spelled;
      index += 1;
    }
  }
  const name = tokens.slice(index).join(" ");
  const label = [number, direction, name].filter(Boolean).join(" ");
  return label.length > 42 ? label.slice(0, 42).trim() : label;
}

/** Street number plus the first street word (direction spelled out). */
function shortStreetStart(street: string | null | undefined): string {
  const compact = compactStreetLabel(street);
  if (!compact) return "";
  const tokens = compact.split(" ").filter(Boolean);
  if (!tokens.length) return "";
  if (/^\d+[a-z]?$/i.test(tokens[0]!)) return tokens.slice(0, 2).join(" ");
  return tokens[0]!;
}

function titleWord(value: string): string {
  const text = value.trim();
  if (!text) return "";
  return text
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function productCodeLabel(input: {
  productId: DealProductId;
  quotingForm?: string | null;
  sheetForm?: string | null;
}): string {
  if (VEHICLE_PRODUCTS.has(input.productId)) {
    return dealProductDef(input.productId)?.label ?? input.productId;
  }
  return productChipLabel({
    product: input.productId,
    quotingForm: input.quotingForm,
    sheetForm: input.sheetForm,
  });
}

function instanceKind(productId: DealProductId): "vehicle" | "property" | "plain" {
  if (VEHICLE_PRODUCTS.has(productId)) return "vehicle";
  const line = dealProductDef(productId).shopLine;
  if (line === "home" || line === "flood") return "property";
  return "plain";
}

function vehiclePhrase(vehicles: readonly VehicleLabelFact[] | null | undefined): string | null {
  const filled = (vehicles ?? []).filter((row) => (row.year ?? "").trim() || (row.make ?? "").trim());
  if (!filled.length) return null;
  const first = filled[0]!;
  const core = [first.year?.trim(), titleWord(first.make ?? "")].filter(Boolean).join(" ");
  if (!core) return null;
  const extra = filled.length - 1;
  return extra > 0 ? `${core} +${extra}` : core;
}

function baseLabel(input: ProductInstanceLabelInput): { text: string; street: boolean } {
  const code = productCodeLabel(input);
  const kind = instanceKind(input.productId);
  if (kind === "vehicle") {
    const vehicle = vehiclePhrase(input.vehicles);
    return vehicle ? { text: `${code} ${vehicle}`, street: false } : { text: code, street: false };
  }
  const street = compactStreetLabel(input.address);
  if (street && (kind === "property" || kind === "plain")) {
    return { text: `${code} ${street}`, street: true };
  }
  return { text: code, street: false };
}

function cityLabel(city: string | null | undefined): string {
  return String(city ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tab label for every product copy on one deal.
 * Property: code + street number, direction, and name.
 * Same label twice: add the city, then a short ordinal.
 * Vehicle: code + first year and make, plus "+N" when more vehicles are on the sheet.
 * Nothing entered yet: the product code, and "· 2" when that code would repeat.
 */
export function labelProductInstances(
  rows: readonly ProductInstanceLabelInput[],
): Map<string, string> {
  const built = rows.map((row) => {
    const base = baseLabel(row);
    return { row, ...base, city: cityLabel(row.city) };
  });
  const baseCounts = new Map<string, number>();
  for (const item of built) baseCounts.set(item.text, (baseCounts.get(item.text) ?? 0) + 1);
  const withCity = built.map((item) => {
    const crowded = (baseCounts.get(item.text) ?? 0) > 1;
    if (crowded && item.street && item.city) {
      return { ...item, text: `${item.text} · ${item.city}` };
    }
    return item;
  });
  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const item of withCity) {
    const count = (seen.get(item.text) ?? 0) + 1;
    seen.set(item.text, count);
    labels.set(item.row.key, count === 1 ? item.text : `${item.text} · ${count}`);
  }
  return labels;
}

export function labelForProductInstance(
  rows: readonly ProductInstanceLabelInput[],
  key: string,
): string {
  return labelProductInstances(rows).get(key) ?? key;
}

function cell(values: Record<string, QuoteSheetFieldValue | undefined> | null | undefined, key: string): string {
  return String(values?.[key]?.value ?? "").trim();
}

export function vehiclesFromSheetValues(
  values: Record<string, QuoteSheetFieldValue | undefined> | null | undefined,
): VehicleLabelFact[] {
  const rows: VehicleLabelFact[] = [];
  const firstYear = cell(values, "vehicle_year") || cell(values, "rv_year");
  const firstMake = cell(values, "vehicle_make") || cell(values, "rv_make") || cell(values, "make");
  if (firstYear || firstMake) rows.push({ year: firstYear, make: firstMake });
  for (let index = 2; index <= 12; index += 1) {
    const year = cell(values, `vehicle_${index}_year`);
    const make = cell(values, `vehicle_${index}_make`);
    if (year || make) rows.push({ year, make });
  }
  return rows;
}

export function addressFactsFromSheetValues(
  values: Record<string, QuoteSheetFieldValue | undefined> | null | undefined,
): { address: string; city: string } {
  const address = cell(values, "address1") || cell(values, "premises_address");
  const city = cell(values, "city") || cell(values, "premises_city");
  return { address, city };
}
