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

export const PALM_BEACH_PARCEL_URL =
  "https://services1.arcgis.com/ZWOoUZbtaYePLlPw/arcgis/rest/services/Parcels_and_Property_Details_WebMercator/FeatureServer/0/query";

const OUT_FIELDS = [
  "PARID",
  "SITE_ADDR_STR",
  "OWNER_NAME1",
  "YRBLT",
  "ASSESSED_VAL",
  "TOTAL_MARKET",
  "ACRES",
  "PRICE",
  "SALE_DATE",
  "LAND_MARKET",
  "IMPRV_MRKT",
  "PROPERTY_USE",
  "HMSTD_FLG",
  "SUBDIV_NAME",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("SITE_ADDR_STR", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PARID"]));
  pushFact(facts, "year_built", skipZero(attrString(attrs, ["YRBLT"])));
  pushFact(facts, "assessed_value", attrString(attrs, ["ASSESSED_VAL", "TOTAL_MARKET"]));
  pushFact(facts, "land_value", attrString(attrs, ["LAND_MARKET"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["IMPRV_MRKT"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["ACRES"])));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["PRICE"])));
  const saleDate = attrString(attrs, ["SALE_DATE"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) pushFact(facts, "year_purchased", iso.slice(0, 4));
  }
  pushFact(facts, "land_use", attrString(attrs, ["PROPERTY_USE"]));
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HMSTD_FLG"])));
  pushFact(facts, "subdivision", attrString(attrs, ["SUBDIV_NAME"]));
  const owner = attrString(attrs, ["OWNER_NAME1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromPalmBeachCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    PALM_BEACH_PARCEL_URL,
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

export function palmBeachMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["palm beach", "palmbeach"]);
}
