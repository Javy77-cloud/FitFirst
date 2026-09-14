import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, ynFlag, type ArcgisAttrs } from "../arcgis";
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

export const PASCO_PARCEL_URL =
  "https://maps.pascopa.com/arcgis/rest/services/Parcels/MapServer/3/query";

const OUT_FIELDS = [
  "ParcelID",
  "PHYS_STREET",
  "NAD_NAME_1",
  "VAL_ACRES",
  "VAL_LAND",
  "VAL_BLDG_DEPR",
  "VAL_APPR",
  "SALE_YEAR",
  "SALE_AMT",
  "HAS_HX",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("PHYS_STREET", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["ParcelID"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["VAL_ACRES"])));
  pushFact(facts, "land_value", attrString(attrs, ["VAL_LAND"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["VAL_BLDG_DEPR"]));
  pushFact(facts, "assessed_value", attrString(attrs, ["VAL_APPR"]));
  pushFact(facts, "year_purchased", skipZero(attrString(attrs, ["SALE_YEAR"])));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["SALE_AMT"])));
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HAS_HX"])));
  const owner = attrString(attrs, ["NAD_NAME_1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromPascoCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    PASCO_PARCEL_URL,
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

export function pascoMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["pasco"]);
}
