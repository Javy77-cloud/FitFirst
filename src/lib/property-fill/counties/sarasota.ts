import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, epochToIsoDate, queryArcgis, ynFlag, type ArcgisAttrs } from "../arcgis";
import type { PropertyFillAddress } from "../types";
import {
  compactAddress1,
  countyAliasMatches,
  isFlorida,
  likeContains,
  pushFact,
  skipZero,
  type FetchLike,
} from "./helpers";

export const SARASOTA_PARCEL_URL =
  "https://services3.arcgis.com/icrWMv7eBkctFu1f/arcgis/rest/services/ParcelHosted/FeatureServer/0/query";

const OUT_FIELDS = [
  "ACCOUNT",
  "FULLADDRESS",
  "NAME1",
  "YRBL",
  "LIVING",
  "BEDR",
  "BATH",
  "POOL",
  "JUST",
  "ASSD",
  "IMPROVEMT",
  "SALE_AMT",
  "SALE_DATE",
  "ZONING",
  "HOMESTEAD",
  "MeasuredAcreage",
  "LIVUNITS",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("FULLADDRESS", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["ACCOUNT"]));
  pushFact(facts, "year_built", skipZero(attrString(attrs, ["YRBL"])));
  pushFact(facts, "square_feet", skipZero(attrString(attrs, ["LIVING"])));
  pushFact(facts, "beds", skipZero(attrString(attrs, ["BEDR"])));
  pushFact(facts, "baths", skipZero(attrString(attrs, ["BATH"])));
  pushFact(facts, "living_units", skipZero(attrString(attrs, ["LIVUNITS"])));
  pushFact(facts, "pool", ynFlag(attrString(attrs, ["POOL"])));
  pushFact(facts, "assessed_value", attrString(attrs, ["ASSD", "JUST"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["IMPROVEMT"]));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["SALE_AMT"])));
  const saleDate = attrString(attrs, ["SALE_DATE"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) pushFact(facts, "year_purchased", iso.slice(0, 4));
  }
  pushFact(facts, "zoning", attrString(attrs, ["ZONING"]));
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HOMESTEAD"])));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["MeasuredAcreage"])));
  const owner = attrString(attrs, ["NAME1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromSarasotaCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    SARASOTA_PARCEL_URL,
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

export function sarasotaMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["sarasota"]);
}
