import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, ynFlag, type ArcgisAttrs } from "../arcgis";
import type { PropertyFillAddress } from "../types";
import {
  countyAliasMatches,
  escapeSql,
  isFlorida,
  parseHouseStreet,
  pushFact,
  skipZero,
  streetSearchToken,
  type FetchLike,
} from "./helpers";

export const POLK_PARCEL_URL =
  "https://gis.polk-county.net/server/rest/services/Map_Property_Appraiser/MapServer/1/query";

const OUT_FIELDS = [
  "PARCELID",
  "PROP_ADRNO",
  "PROP_ADRSTR",
  "PROP_ADRSUF",
  "PROP_CITY",
  "NAME",
  "YR_IMPROVED",
  "TOT_LND_VAL",
  "TOT_BLD_VAL",
  "ASSESSVAL",
  "TOT_ACREAGE",
  "HMSTD",
  "DOR_USE_CODE_DESC",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const parsed = parseHouseStreet(address);
  if (!parsed) return null;
  const token = streetSearchToken(parsed.street);
  const parts: string[] = [];
  if (/^\d+$/.test(parsed.num)) parts.push(`PROP_ADRNO=${parsed.num}`);
  if (token) parts.push(`UPPER(PROP_ADRSTR) LIKE '%${escapeSql(token)}%'`);
  return parts.length ? parts.join(" AND ") : null;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PARCELID"]));
  pushFact(facts, "year_built", skipZero(attrString(attrs, ["YR_IMPROVED"])));
  pushFact(facts, "land_value", attrString(attrs, ["TOT_LND_VAL"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["TOT_BLD_VAL"]));
  pushFact(facts, "assessed_value", attrString(attrs, ["ASSESSVAL"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["TOT_ACREAGE"])));
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HMSTD"])));
  pushFact(facts, "land_use", attrString(attrs, ["DOR_USE_CODE_DESC"]));
  const owner = attrString(attrs, ["NAME"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromPolkCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    POLK_PARCEL_URL,
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

export function polkMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["polk"]);
}
