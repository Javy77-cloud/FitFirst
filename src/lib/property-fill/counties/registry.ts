import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import type { PropertyFillAddress } from "../types";
import { factsFromBrevardCountyPa, brevardMatches } from "./brevard";
import { factsFromCollierCountyPa, collierMatches } from "./collier";
import { factsFromDuvalCountyPa, duvalMatches } from "./duval";
import { factsFromHillsboroughCountyPa, hillsboroughMatches } from "./hillsborough";
import { factsFromLeeCountyPa, leeCountyMatches } from "./lee";
import { factsFromManateeCountyPa, manateeMatches } from "./manatee";
import { factsFromMiamiDadeCountyPa, miamiDadeMatches } from "./miami-dade";
import { factsFromOrangeCountyPa, orangeMatches } from "./orange";
import { factsFromPalmBeachCountyPa, palmBeachMatches } from "./palm-beach";
import { factsFromPascoCountyPa, pascoMatches } from "./pasco";
import { factsFromPinellasCountyPa, pinellasMatches } from "./pinellas";
import { factsFromPolkCountyPa, polkMatches } from "./polk";
import { factsFromSarasotaCountyPa, sarasotaMatches } from "./sarasota";
import { factsFromVolusiaCountyPa, volusiaMatches } from "./volusia";

type FetchLike = typeof fetch;

export type CountyPaAdapter = {
  id: string;
  label: string;
  matches: (county: string, state: string) => boolean;
  fetchFacts: (address: PropertyFillAddress, fetchImpl?: FetchLike) => Promise<PropertyRecordsFact[]>;
};

/** Free public county PA GIS adapters (no API key). Skip counties with no free endpoint. */
export const COUNTY_PA_ADAPTERS: CountyPaAdapter[] = [
  {
    id: "lee",
    label: "Lee County PA",
    matches: leeCountyMatches,
    fetchFacts: factsFromLeeCountyPa,
  },
  {
    id: "hillsborough",
    label: "Hillsborough County PA",
    matches: hillsboroughMatches,
    fetchFacts: factsFromHillsboroughCountyPa,
  },
  {
    id: "orange",
    label: "Orange County PA",
    matches: orangeMatches,
    fetchFacts: factsFromOrangeCountyPa,
  },
  {
    id: "miami-dade",
    label: "Miami-Dade County PA",
    matches: miamiDadeMatches,
    fetchFacts: factsFromMiamiDadeCountyPa,
  },
  {
    id: "palm-beach",
    label: "Palm Beach County PA",
    matches: palmBeachMatches,
    fetchFacts: factsFromPalmBeachCountyPa,
  },
  {
    id: "pinellas",
    label: "Pinellas County PA",
    matches: pinellasMatches,
    fetchFacts: factsFromPinellasCountyPa,
  },
  {
    id: "duval",
    label: "Duval County PA",
    matches: duvalMatches,
    fetchFacts: factsFromDuvalCountyPa,
  },
  {
    id: "sarasota",
    label: "Sarasota County PA",
    matches: sarasotaMatches,
    fetchFacts: factsFromSarasotaCountyPa,
  },
  {
    id: "collier",
    label: "Collier County PA",
    matches: collierMatches,
    fetchFacts: factsFromCollierCountyPa,
  },
  {
    id: "manatee",
    label: "Manatee County PA",
    matches: manateeMatches,
    fetchFacts: factsFromManateeCountyPa,
  },
  {
    id: "pasco",
    label: "Pasco County PA",
    matches: pascoMatches,
    fetchFacts: factsFromPascoCountyPa,
  },
  {
    id: "polk",
    label: "Polk County PA",
    matches: polkMatches,
    fetchFacts: factsFromPolkCountyPa,
  },
  {
    id: "brevard",
    label: "Brevard County PA",
    matches: brevardMatches,
    fetchFacts: factsFromBrevardCountyPa,
  },
  {
    id: "volusia",
    label: "Volusia County PA",
    matches: volusiaMatches,
    fetchFacts: factsFromVolusiaCountyPa,
  },
];

export function resolveCountyPaAdapter(
  address: PropertyFillAddress,
): CountyPaAdapter | null {
  const county = (address.county ?? "").trim();
  const state = (address.state ?? "").trim();
  // Prefer explicit county match; if county blank but FL, leave null (avoid wrong county).
  if (!county) return null;
  return COUNTY_PA_ADAPTERS.find((a) => a.matches(county, state || "FL")) ?? null;
}

export async function factsFromCountyPa(
  address: PropertyFillAddress,
  fetchImpl: FetchLike = fetch,
): Promise<{ adapterId: string | null; facts: PropertyRecordsFact[] }> {
  const adapter = resolveCountyPaAdapter(address);
  if (!adapter) return { adapterId: null, facts: [] };
  try {
    const facts = await adapter.fetchFacts(address, fetchImpl);
    return { adapterId: adapter.id, facts };
  } catch {
    return { adapterId: adapter.id, facts: [] };
  }
}

export function wiredCountyIds(): string[] {
  return COUNTY_PA_ADAPTERS.map((a) => a.id);
}
