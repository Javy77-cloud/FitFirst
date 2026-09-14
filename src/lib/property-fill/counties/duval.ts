import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, type ArcgisAttrs } from "../arcgis";
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

export const DUVAL_PARCEL_URL =
  "https://maps.coj.net/coj/rest/services/CityBiz/Parcels/MapServer/0/query";

const OUT_FIELDS = [
  "RE",
  "LNAMEOWNER",
  "STREET_NO",
  "ST_NAME",
  "ST_TYPE",
  "ADDRCITY",
  "ACRES",
  "TOT_LND_VA",
  "TOT_BLD_VA",
  "TOT_IMPR_V",
  "CAMA_VAL",
  "PUSE",
  "DESCPU",
  "SALESLYY",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const parsed = parseHouseStreet(address);
  if (!parsed) return null;
  const token = streetSearchToken(parsed.street);
  const parts: string[] = [];
  if (/^\d+$/.test(parsed.num)) {
    parts.push(`STREET_NO='${escapeSql(parsed.num)}'`);
  }
  if (token) parts.push(`UPPER(ST_NAME) LIKE '%${escapeSql(token)}%'`);
  return parts.length ? parts.join(" AND ") : null;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["RE"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["ACRES"])));
  pushFact(facts, "land_value", attrString(attrs, ["TOT_LND_VA"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["TOT_BLD_VA", "TOT_IMPR_V"]));
  pushFact(facts, "assessed_value", attrString(attrs, ["CAMA_VAL"]));
  pushFact(facts, "land_use", attrString(attrs, ["DESCPU"]));
  pushFact(facts, "year_purchased", skipZero(attrString(attrs, ["SALESLYY"])));
  const owner = attrString(attrs, ["LNAMEOWNER"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromDuvalCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    DUVAL_PARCEL_URL,
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

export function duvalMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["duval", "jacksonville"]);
}
