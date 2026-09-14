import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import {
  attrString,
  queryArcgis,
  type ArcgisAttrs,
} from "../arcgis";
import type { PropertyFillAddress } from "../types";
import {
  combineBaths,
  compactAddress1,
  countyAliasMatches,
  isFlorida,
  likeContains,
  pushFact,
  skipZero,
  type FetchLike,
} from "./helpers";

export const MIAMI_DADE_PARCEL_URL =
  "https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/26/query";

const OUT_FIELDS = [
  "FOLIO",
  "TRUE_SITE_ADDR",
  "TRUE_OWNER1",
  "YEAR_BUILT",
  "BEDROOM_COUNT",
  "BATHROOM_COUNT",
  "HALF_BATHROOM_COUNT",
  "FLOOR_COUNT",
  "UNIT_COUNT",
  "BUILDING_HEATED_AREA",
  "TOTAL_VAL_CUR",
  "LAND_VAL_CUR",
  "BUILDING_VAL_CUR",
  "DOR_DESC",
  "PRIMARY_ZONE",
  "SUBDIVISION",
  "ASSESSMENT_YEAR_CUR",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("TRUE_SITE_ADDR", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["FOLIO"]));
  pushFact(facts, "year_built", skipZero(attrString(attrs, ["YEAR_BUILT"])));
  pushFact(facts, "beds", skipZero(attrString(attrs, ["BEDROOM_COUNT"])));
  pushFact(
    facts,
    "baths",
    skipZero(combineBaths(attrString(attrs, ["BATHROOM_COUNT"]), attrString(attrs, ["HALF_BATHROOM_COUNT"]))),
  );
  pushFact(facts, "stories", skipZero(attrString(attrs, ["FLOOR_COUNT"])));
  pushFact(facts, "living_units", skipZero(attrString(attrs, ["UNIT_COUNT"])));
  pushFact(facts, "square_feet", skipZero(attrString(attrs, ["BUILDING_HEATED_AREA"])));
  pushFact(facts, "assessed_value", attrString(attrs, ["TOTAL_VAL_CUR"]));
  pushFact(facts, "land_value", attrString(attrs, ["LAND_VAL_CUR"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["BUILDING_VAL_CUR"]));
  pushFact(facts, "land_use", attrString(attrs, ["DOR_DESC"]));
  pushFact(facts, "zoning", attrString(attrs, ["PRIMARY_ZONE"]));
  pushFact(facts, "subdivision", attrString(attrs, ["SUBDIVISION"]));
  pushFact(facts, "assessment_year", attrString(attrs, ["ASSESSMENT_YEAR_CUR"]));
  const owner = attrString(attrs, ["TRUE_OWNER1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromMiamiDadeCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    MIAMI_DADE_PARCEL_URL,
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

export function miamiDadeMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["miami-dade", "miami dade", "dade"]);
}
