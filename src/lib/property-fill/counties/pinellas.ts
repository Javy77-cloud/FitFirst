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

export const PINELLAS_PARCEL_URL =
  "https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/1/query";

const OUT_FIELDS = [
  "PARCELID",
  "STRAP",
  "SITE_ADDRESS",
  "OWNER1",
  "LAND_VALUE",
  "IMP_VALUE",
  "TAXABLE_VALUE",
  "Acres",
  "HOMESTEAD",
  "SALEPRICE1",
  "SALEDATE1",
  "USE_CODE",
  "FIRE_DISTRICT",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("SITE_ADDRESS", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["PARCELID", "STRAP"]));
  pushFact(facts, "land_value", attrString(attrs, ["LAND_VALUE"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["IMP_VALUE"]));
  pushFact(facts, "assessed_value", attrString(attrs, ["TAXABLE_VALUE"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["Acres"])));
  pushFact(facts, "homestead", ynFlag(attrString(attrs, ["HOMESTEAD"])));
  pushFact(facts, "sale_price", skipZero(attrString(attrs, ["SALEPRICE1"])));
  const saleDate = attrString(attrs, ["SALEDATE1"]);
  if (saleDate) {
    const iso = epochToIsoDate(saleDate);
    if (iso) pushFact(facts, "year_purchased", iso.slice(0, 4));
  }
  pushFact(facts, "land_use", attrString(attrs, ["USE_CODE"]));
  pushFact(facts, "fire_district", attrString(attrs, ["FIRE_DISTRICT"]));
  const owner = attrString(attrs, ["OWNER1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromPinellasCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    PINELLAS_PARCEL_URL,
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

export function pinellasMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["pinellas"]);
}
