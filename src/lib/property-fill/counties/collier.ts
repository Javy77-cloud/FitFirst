import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { formatAcres } from "@/lib/getparceldata/map";
import { attrString, queryArcgis, type ArcgisAttrs } from "../arcgis";
import type { PropertyFillAddress } from "../types";
import {
  compactAddress1,
  countyAliasMatches,
  homesteadFromAmount,
  isFlorida,
  likeContains,
  pushFact,
  type FetchLike,
} from "./helpers";

export const COLLIER_PARCEL_URL =
  "https://services2.arcgis.com/SlIq32SqARUHIhSx/arcgis/rest/services/Parcel_Tax_Assessment_and_Ownership/FeatureServer/0/query";

const OUT_FIELDS = [
  "Folio",
  "OwnerLine1",
  "SiteStreetAddress",
  "TotalAcres",
  "LandJustValue",
  "ImprovementsJustValue",
  "TotalJustValue",
  "CountyAssessedValue",
  "HmstdExemptAmount",
  "TaxYear",
].join(",");

function siteWhere(address: PropertyFillAddress): string | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  return likeContains("SiteStreetAddress", compact.replace(/ /g, "%"));
}

function mapAttrs(attrs: ArcgisAttrs): PropertyRecordsFact[] {
  const facts: PropertyRecordsFact[] = [];
  pushFact(facts, "parcel_id", attrString(attrs, ["Folio"]));
  pushFact(facts, "acres", formatAcres(attrString(attrs, ["TotalAcres"])));
  pushFact(facts, "land_value", attrString(attrs, ["LandJustValue"]));
  pushFact(facts, "improvement_value", attrString(attrs, ["ImprovementsJustValue"]));
  pushFact(facts, "assessed_value", attrString(attrs, ["CountyAssessedValue", "TotalJustValue"]));
  pushFact(facts, "homestead", homesteadFromAmount(attrString(attrs, ["HmstdExemptAmount"])));
  pushFact(facts, "assessment_year", attrString(attrs, ["TaxYear"]));
  const owner = attrString(attrs, ["OwnerLine1"]);
  if (owner) {
    pushFact(facts, "applicant_name", owner);
    pushFact(facts, "named_insured", owner);
  }
  return facts;
}

export async function factsFromCollierCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const where = siteWhere(address);
  if (!where) return [];
  const features = await queryArcgis(
    COLLIER_PARCEL_URL,
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

export function collierMatches(county: string, state: string): boolean {
  if (!isFlorida(state)) return false;
  return countyAliasMatches(county, ["collier"]);
}
