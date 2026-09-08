import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import type { PropertyFillAddress } from "../types";
import { factsFromHillsboroughCountyPa, hillsboroughMatches } from "./hillsborough";
import { factsFromLeeCountyPa, leeCountyMatches } from "./lee";
import { factsFromOrangeCountyPa, orangeMatches } from "./orange";

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
