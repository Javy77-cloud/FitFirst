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

export const MANATEE_PARCEL_URL =
  "https://gis.manateepao.com/arcgis/rest/services/Website/WebLayers/MapServer/0/query";

const OUT_FIELDS = [
  "PARID",
  "SITUS_ADDRESS",
  "PAR_OWNER_NAME1",
  "BLDG_R1_YRBUILT",
  "BLDG_R1_SQFTLIVNG",
  "BLDG_R1_BEDRMS",
  "BLDG_R1_FBATHS",
  "BLDG_R1_HBATHS",
  "BLDG_R1_STORIES",
  "BLDGS_GARAGE_BAYS",
  "BLDGS_LIVINGUNITS",
  "CAD_JUST_VALUE",
  "CAD_JUST_LNDVAL",
  "CAD_JUST_IMPVAL",
  "CAD_ASSESSED_CTY",
  "PAR_SWIMPOOL_FLAG",
  "PAR_ZONING",
  "PAR_SUBDIV_NAME",
  "LAND_ACREAGE_CAMA",
  "SALE_PRICE_LAST",
  "SALE_DATE_LAST",
  "CAD_EXEM_HOM_FLAG",
  "CAD_ROLL_YEAR",
  "BLDG_R1_EXTWALL",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("SITUS_ADDRESS", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PARID"]));
  pushFact(facts, "year_built", skipZero(attrString(attrs, ["BLDG_R1_YRBUILT"])));
  pushFact(facts, "square_feet", skipZero(attrString(attrs, ["BLDG_R1_SQFTLIVNG"])));
  pushFact(facts, "beds", skipZero(attrString(attrs, ["BLDG_R1_BEDRMS"])));
  const full = attrString(attrs, ["BLDG_R1_FBATHS"]);
  const half = attrString(attrs, ["BLDG_R1_HBATHS"]);
  const baths = half && Number(half) > 0 && full ? String(Number(full) + Number(half) * 0.5) : full;
  pushFact(facts, "baths", skipZero(baths));
  pushFact(facts, "stories", skipZero(attrString(attrs, ["BLDG_R1_STORIES"])));
  pushFact(facts, "living_units", skipZero(attrString(attrs, ["BLDGS_LIVINGUNITS"])));
  pushFact(facts, "garage_spaces", skipZero(attrString(attrs, ["BLDGS_GARAGE_BAYS"])));
  pushFact(facts, "pool", ynFlag(attrString(attrs, ["PAR_SWIMPOOL_FLAG"])));
  pushFact(facts, "assessed_value", attrString(attrs, ["CAD_ASSESSED_CTY", "CAD_JUST_VALUE"]));
  pushFact(facts, "land_value", attrString(attrs, ["CAD_JUST_LNDVAL"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["CAD_JUST_IMPVAL"]));
  pushFact(facts, "zoning", attrString(attrs, ["PAR_ZONING"]));
  pushFact(facts, "subdivision", attrString(attrs, ["PAR_SUBDIV_NAME"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["LAND_ACREAGE_CAMA"])));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["SALE_PRICE_LAST"])));
  const saleDate = attrString(attrs, ["SALE_DATE_LAST"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) pushFact(facts, "year_purchased", iso.slice(0, 4));
  }
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["CAD_EXEM_HOM_FLAG"])));
  pushFact(facts, "assessment_year", attrString(attrs, ["CAD_ROLL_YEAR"]));
  pushFact(facts, "exterior", attrString(attrs, ["BLDG_R1_EXTWALL"]));
  const owner = attrString(attrs, ["PAR_OWNER_NAME1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromManateeCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    MANATEE_PARCEL_URL,
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

export function manateeMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["manatee"]);
}
