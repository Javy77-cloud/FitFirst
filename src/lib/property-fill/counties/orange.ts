import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, ynFlag, type ArcgisAttrs } from "../arcgis";
import { COUNTY_PA_LABEL, type PropertyFillAddress } from "../types";

export const ORANGE_PARCEL_URL =
  "https://services2.arcgis.com/N4cKzJ9dzXmsPNRs/ArcGIS/rest/services/orange_county_parcels/FeatureServer/0/query";

type FetchLike = typeof fetch;

function push(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value || sheetKey === "coverage_a") return;
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
  return `UPPER(SITUS) LIKE '%${escapeSql(compact)}%'`;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  push(facts, "parcel_id", attrString(attrs, ["PARCEL"]));
  push(facts, "beds", attrString(attrs, ["BEDS"]));
  push(facts, "baths", attrString(attrs, ["BATH"]));
  push(facts, "stories", attrString(attrs, ["STYS"]));
  push(facts, "square_feet", attrString(attrs, ["LIVING_ARE"]));
  push(facts, "year_built", attrString(attrs, ["AYB"]));
  push(facts, "year_effective", attrString(attrs, ["EYB"]));
  push(facts, "pool", ynFlag(attrString(attrs, ["POOL"])));
  push(facts, "assessed_value", attrString(attrs, ["TOTAL_ASSD", "TOTAL_MKT"]));
  push(facts, "land_value", attrString(attrs, ["LAND_MKT"]));
  push(facts, "improvement_value", attrString(attrs, ["BLDG_MKT"]));
  push(facts, "zoning", attrString(attrs, ["ZONING_COD"]));
  push(facts, "acres", formatAcres(attrString(attrs, ["ACREAGE"])));
  const owner = attrString(attrs, ["NAME1"]);
  if (owner) {
    push(facts, "applicant_name", owner);
    push(facts, "named_insured", owner);
  }
  const sale = attrString(attrs, ["SALE_DATE"]);
  if (sale && /^\d{4}/.test(sale)) push(facts, "year_purchased", sale.slice(0, 4));
  return facts;
}

export async function factsFromOrangeCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    ORANGE_PARCEL_URL,
    {
      where,
      outFields:
        "PARCEL,SITUS,BEDS,BATH,STYS,LIVING_ARE,AYB,EYB,POOL,TOTAL_ASSD,TOTAL_MKT,LAND_MKT,BLDG_MKT,ZONING_COD,ACREAGE,NAME1,SALE_DATE",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "3",
    },
    fetchImpl,
  );
  const first = features[0];
  return first ? mapAttrs(first.attributes) : [];
}

export function orangeMatches(county: string, state: string): boolean {
  const c = county.trim().toLowerCase();
  const s = state.trim().toUpperCase();
  if (s && s !== "FL" && s !== "FLORIDA") return false;
  return !c || c === "orange" || c.includes("orange");
}
