import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, type ArcgisAttrs } from "../arcgis";
import type { PropertyFillAddress } from "../types";
import {
  countyAliasMatches,
  escapeSql,
  homesteadFromAmount,
  isFlorida,
  parseHouseStreet,
  pushFact,
  skipZero,
  streetSearchToken,
  type FetchLike,
} from "./helpers";

export const BREVARD_PARCEL_URL =
  "https://gis.brevardfl.gov/gissrv/rest/services/Base_Map/Parcel_New_WKID2881/MapServer/5/query";

const OUT_FIELDS = [
  "PARCEL_ID",
  "STREET_NUMBER",
  "STREET_NAME",
  "STREET_TYPE",
  "CITY",
  "OWNER_NAME1",
  "LIV_AREA",
  "BLDG_VALUE",
  "LAND_VALUE",
  "ACRES",
  "USE_CODE_DESCRIPTION",
  "HOMESTEAD_VALUE",
  "SUBDIVISION_NAME",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const parsed = parseHouseStreet(address);
  if (!parsed) return null;
  const token = streetSearchToken(parsed.street);
  const parts: string[] = [];
  if (/^\d+$/.test(parsed.num)) {
    parts.push(`(STREET_NUMBER='${escapeSql(parsed.num)}' OR STREET_NUMBER=${parsed.num})`);
  }
  if (token) parts.push(`UPPER(STREET_NAME) LIKE '%${escapeSql(token)}%'`);
  return parts.length ? parts.join(" AND ") : null;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PARCEL_ID"]));
  pushFact(facts, "square_feet", skipZero(attrString(attrs, ["LIV_AREA"])));
  pushFact(facts, "improvement_value", attrString(attrs, ["BLDG_VALUE"]));
  pushFact(facts, "land_value", attrString(attrs, ["LAND_VALUE"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["ACRES"])));
  pushFact(facts, "land_use", attrString(attrs, ["USE_CODE_DESCRIPTION"]).trim());
  pushFact(facts, "homestead", homesteadFromAmount(attrString(attrs, ["HOMESTEAD_VALUE"])));
  pushFact(facts, "subdivision", attrString(attrs, ["SUBDIVISION_NAME"]));
  const owner = attrString(attrs, ["OWNER_NAME1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromBrevardCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    BREVARD_PARCEL_URL,
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

export function brevardMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["brevard"]);
}
