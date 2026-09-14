import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, epochToIsoDate, queryArcgis, ynFlag, type ArcgisAttrs } from "../arcgis";
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

export const VOLUSIA_PARCEL_URL =
  "https://maps5.vcgov.org/arcgis/rest/services/Open_Data/Open_Data_3/FeatureServer/34/query";

const OUT_FIELDS = [
  "PID",
  "ADDRFULL",
  "ADRNO",
  "ADRSTR",
  "OWNER1",
  "RES_BEDROOM",
  "RES_BATHROOM",
  "RES_TOTAL_SFLA",
  "RES_MAX_STORIES",
  "TOTJUST",
  "LANDJUST",
  "IMPRJUST",
  "CALCACRES",
  "LASTSALEPRICE",
  "LASTSALEDT",
  "LIVUNIT",
  "HXFLAG",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const parsed = parseHouseStreet(address);
  if (!parsed) return null;
  const token = streetSearchToken(parsed.street);
  const parts: string[] = [];
  if (/^\d+$/.test(parsed.num)) parts.push(`ADRNO=${parsed.num}`);
  if (token) parts.push(`UPPER(ADRSTR) LIKE '%${escapeSql(token)}%'`);
  return parts.length ? parts.join(" AND ") : null;
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PID"]));
  pushFact(facts, "beds", skipZero(attrString(attrs, ["RES_BEDROOM"])));
  pushFact(facts, "baths", skipZero(attrString(attrs, ["RES_BATHROOM"])));
  pushFact(facts, "square_feet", skipZero(attrString(attrs, ["RES_TOTAL_SFLA"])));
  pushFact(facts, "stories", skipZero(attrString(attrs, ["RES_MAX_STORIES"])));
  pushFact(facts, "living_units", skipZero(attrString(attrs, ["LIVUNIT"])));
  pushFact(facts, "assessed_value", attrString(attrs, ["TOTJUST"]));
  pushFact(facts, "land_value", attrString(attrs, ["LANDJUST"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["IMPRJUST"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["CALCACRES"])));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["LASTSALEPRICE"])));
  const saleDate = attrString(attrs, ["LASTSALEDT"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) pushFact(facts, "year_purchased", iso.slice(0, 4));
  }
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HXFLAG"])));
  const owner = attrString(attrs, ["OWNER1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromVolusiaCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    VOLUSIA_PARCEL_URL,
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

export function volusiaMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["volusia"]);
}
