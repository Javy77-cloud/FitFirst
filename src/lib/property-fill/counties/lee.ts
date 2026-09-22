import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import {
  attrString,
  epochToIsoDate,
  queryArcgis,
  ynFlag,
  type ArcgisAttrs,
} from "../arcgis";
import { COUNTY_PA_LABEL, type PropertyFillAddress } from "../types";

export const LEE_PARCEL_URL =
  "https://gismapserver.leegov.com/gisserver910/rest/services/Layers/ParcelAddress/MapServer/0/query";

const OUT_FIELDS = [
  "SITEADDR",
  "STRAP",
  "BEDROOMS",
  "BATHROOMS",
  "HEATEDAREA",
  "MAXSTORIES",
  "GARAGE",
  "CARPORT",
  "POOL",
  "GISACRES",
  "MAXBUILTY",
  "MINBUILTY",
  "JUST",
  "LAND",
  "BUILDING",
  "LANDUSEDES",
  "LANDUSECOD",
  "ZONINGAREA",
  "O_NAME",
  "S_1AMOUNT",
  "S_1DATE",
  "NUMUNITS",
  "DORCODE",
].join(",");

type FetchLike = typeof fetch;

function push(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value) return;
  if (sheetKey === "coverage_a") return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: COUNTY_PA_LABEL,
    kind: "county",
  });
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function siteWhere(address: PropertyFillAddress): string | null {
  const raw = (address.address1 ?? "").trim().toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const parts = compact.split(" ");
  if (parts.length < 2) return `UPPER(SITEADDR) LIKE '%${escapeSql(compact)}%'`;
  const num = parts[0]!;
  const street = parts.slice(1).join("%");
  return `UPPER(SITEADDR) LIKE '%${escapeSql(num)}%${escapeSql(street)}%'`;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  push(facts, "parcel_id", attrString(attrs, ["STRAP"]));
  push(facts, "beds", attrString(attrs, ["BEDROOMS", "NBEDROOMS"]));
  push(facts, "baths", attrString(attrs, ["BATHROOMS", "NBATHROOMS"]));
  push(facts, "square_feet", attrString(attrs, ["HEATEDAREA", "NHEATEDARE"]));
  push(facts, "stories", attrString(attrs, ["MAXSTORIES", "NMAXSTORIE"]));
  const units = attrString(attrs, ["NUMUNITS"]);
  if (units && Number(units) !== 0) push(facts, "living_units", units);
  const pool = ynFlag(attrString(attrs, ["POOL", "NPOOL"]));
  push(facts, "pool", pool);
  const carport = ynFlag(attrString(attrs, ["CARPORT", "NCARPORT"]));
  push(facts, "carport", carport);
  push(facts, "acres", formatAcres(attrString(attrs, ["GISACRES"])));
  push(facts, "year_built", attrString(attrs, ["MAXBUILTY", "MINBUILTY"]));
  push(facts, "assessed_value", attrString(attrs, ["JUST"]));
  push(facts, "land_value", attrString(attrs, ["LAND"]));
  push(facts, "improvement_value", attrString(attrs, ["BUILDING"]));
  push(facts, "land_use", attrString(attrs, ["LANDUSEDES", "LANDUSECOD"]));
  push(facts, "zoning", attrString(attrs, ["ZONINGAREA"]));
  push(facts, "sale_price", attrString(attrs, ["S_1AMOUNT"]));
  const saleDate = attrString(attrs, ["S_1DATE"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) push(facts, "year_purchased", iso.slice(0, 4));
  }
  const owner = attrString(attrs, ["O_NAME"]);
  if (owner) {
    push(facts, "applicant_name", owner);
    push(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromLeeCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    LEE_PARCEL_URL,
    {
      where,
      outFields: OUT_FIELDS,
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "3",
    },
    fetchImpl,
  );
  const first = features[0];
  return first ? mapAttrs(first.attributes) : [];
}

export function leeCountyMatches(county: string, state: string): boolean {
  const c = county.trim().toLowerCase();
  const s = state.trim().toUpperCase();
  if (s && s !== "FL" && s !== "FLORIDA") return false;
  return !c || c === "lee" || c.includes("lee");
}
