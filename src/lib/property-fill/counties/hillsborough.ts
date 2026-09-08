import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, epochToIsoDate, queryArcgis, type ArcgisAttrs } from "../arcgis";
import { COUNTY_PA_LABEL, type PropertyFillAddress } from "../types";

export const HILLSBOROUGH_PARCEL_URL =
  "https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/HC_ParcelsPublic/MapServer/0/query";

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
  return `UPPER(SITE_ADDR) LIKE '%${escapeSql(compact)}%'`;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  push(facts, "parcel_id", attrString(attrs, ["FOLIO", "STRAP", "PIN"]));
  push(facts, "beds", attrString(attrs, ["tBEDS"]));
  push(facts, "baths", attrString(attrs, ["tBATHS"]));
  push(facts, "stories", attrString(attrs, ["tSTORIES"]));
  push(facts, "living_units", attrString(attrs, ["tUNITS"]));
  push(facts, "square_feet", attrString(attrs, ["HEAT_AR"]));
  push(facts, "year_built", attrString(attrs, ["ACT"]));
  push(facts, "year_effective", attrString(attrs, ["EFF"]));
  push(facts, "assessed_value", attrString(attrs, ["ASD_VAL", "JUST"]));
  push(facts, "land_value", attrString(attrs, ["LAND"]));
  push(facts, "improvement_value", attrString(attrs, ["BLDG"]));
  push(facts, "acres", formatAcres(attrString(attrs, ["ACREAGE"])));
  push(facts, "sale_price", attrString(attrs, ["S_AMT"]));
  const saleDate = attrString(attrs, ["S_DATE"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) push(facts, "year_purchased", iso.slice(0, 4));
  }
  const owner = attrString(attrs, ["OWNER"]);
  if (owner) {
    push(facts, "applicant_name", owner);
    push(facts, "named_insured", owner);
  }
  push(facts, "subdivision", attrString(attrs, ["SUB"]));
  return facts;
}

export async function factsFromHillsboroughCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    HILLSBOROUGH_PARCEL_URL,
    {
      where,
      outFields:
        "FOLIO,STRAP,PIN,SITE_ADDR,tBEDS,tBATHS,tSTORIES,tUNITS,HEAT_AR,ACT,EFF,ASD_VAL,JUST,LAND,BLDG,ACREAGE,S_AMT,S_DATE,OWNER,SUB",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "3",
    },
    fetchImpl,
  );
  const first = features[0];
  return first ? mapAttrs(first.attributes) : [];
}

export function hillsboroughMatches(county: string, state: string): boolean {
  const c = county.trim().toLowerCase();
  const s = state.trim().toUpperCase();
  if (s && s !== "FL" && s !== "FLORIDA") return false;
  return !c || c.includes("hillsborough");
}
