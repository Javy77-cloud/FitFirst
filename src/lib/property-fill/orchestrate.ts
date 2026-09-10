import {
  addressReadyForPropertyRecords,
  formatPropertyAddress,
  searchGetParcelDataRecords,
  type GetParcelDataSearchResult,
  type PropertyAddressQuery,
} from "@/lib/getparceldata/client";
import { geocodePropertyAddress } from "@/lib/getparceldata/geocode";
import { getParcelDataKeyReady } from "@/lib/getparceldata/key";
import { parcelVintage, type PropertyRecordsFact } from "@/lib/getparceldata/map";
import { NO_ADDRESS_MESSAGE } from "@/lib/getparceldata/client";
import { factsFromCountyPa } from "./counties/registry";
import { factsFromFemaNfhl } from "./fema";
import { factsFromFloodZoneMap } from "./floodzonemap";
import { mergePropertyFillFacts, toastForPropertyFill } from "./merge";
import type { PropertyFillBundle, PropertyFillSourceId } from "./types";

type FetchLike = typeof fetch;

export type OrchestrateInput = {
  address: PropertyAddressQuery;
  apiKey: string | null | undefined;
  fetchImpl?: FetchLike;
};

/**
 * Single Fill-from-property-records pipeline:
 * GetParcelData (BYO key) → County PA GIS (free) → FloodZoneMap (free) → FEMA NFHL empty-only (free).
 * One fact list, empty-only apply upstream. FloodZoneMap wins over FEMA on conflicts.
 */
export async function orchestratePropertyFill(
  input: OrchestrateInput,
): Promise<PropertyFillBundle & { lookup: GetParcelDataSearchResult; toast: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!addressReadyForPropertyRecords(input.address)) {
    const lookup: GetParcelDataSearchResult = {
      status: "no_address",
      facts: [],
      message: NO_ADDRESS_MESSAGE,
      called: false,
    };
    return {
      status: "no_address",
      facts: [],
      sourcesUsed: [],
      message: NO_ADDRESS_MESSAGE,
      toast: "Add a property address on the quote sheet first.",
      lookup,
    };
  }

  const keyReady = getParcelDataKeyReady(input.apiKey);
  const geo = await geocodePropertyAddress(input.address, fetchImpl);
  const addressLine = formatPropertyAddress(input.address);

  const getParcelPromise: Promise<GetParcelDataSearchResult> = keyReady
    ? searchGetParcelDataRecords(
        input.address,
        input.apiKey,
        fetchImpl,
        geo.ok ? { lat: geo.lat, lng: geo.lng } : null,
      )
    : Promise.resolve({
        status: "needs_key" as const,
        facts: [] as PropertyRecordsFact[],
        message: "GetParcelData key not configured; continuing with free sources.",
        called: false,
      });

  const countyPromise = factsFromCountyPa(input.address, fetchImpl);

  const floodZoneMapPromise = factsFromFloodZoneMap(
    geo.ok
      ? { lat: geo.lat, lng: geo.lng, address: addressLine }
      : { address: addressLine },
    fetchImpl,
  ).catch(() => [] as PropertyRecordsFact[]);

  const femaPromise =
    geo.ok
      ? factsFromFemaNfhl(geo.lat, geo.lng, fetchImpl).catch(() => [] as PropertyRecordsFact[])
      : Promise.resolve([] as PropertyRecordsFact[]);

  const [lookup, county, floodZoneMapFacts, femaFacts] = await Promise.all([
    getParcelPromise,
    countyPromise,
    floodZoneMapPromise,
    femaPromise,
  ]);

  const { facts, sourcesUsed } = mergePropertyFillFacts({
    getParcel: lookup.status === "ok" ? lookup.facts : [],
    countyPa: county.facts,
    floodZoneMap: floodZoneMapFacts,
    fema: femaFacts,
  });

  const vintage =
    (lookup.hit ? parcelVintage(lookup.hit) : "") ||
    "";

  if (!facts.length) {
    if (!keyReady && !county.facts.length && !floodZoneMapFacts.length && !femaFacts.length) {
      return {
        status: "needs_key",
        facts: [],
        sourcesUsed: [],
        message: lookup.message,
        toast: "property-records-needs-key",
        lookup,
      };
    }
    const status = lookup.status === "error" ? "error" : "not_found";
    return {
      status,
      facts: [],
      sourcesUsed,
      message: lookup.message || "No parcel fields from GetParcel, county PA, FloodZoneMap, or FEMA.",
      toast: status === "error" ? "property-records-error" : "property-records-not-found",
      lookup,
    };
  }

  const sourceNote = sourcesUsed
    .map((id: PropertyFillSourceId) => {
      if (id === "property-records") return "GetParcelData";
      if (id === "county-pa") return `county PA (${county.adapterId ?? "?"})`;
      if (id === "floodzonemap") return "FloodZoneMap";
      return "FEMA";
    })
    .join(", ");

  const message = [
    `Merged ${facts.length} field(s) from ${sourceNote} for empty-only fill`,
    vintage ? `vintage ${vintage}` : "",
  ]
    .filter(Boolean)
    .join(". ")
    .concat(".");

  return {
    status: "ok",
    facts,
    sourcesUsed,
    message,
    toast: toastForPropertyFill({ filledCount: facts.length, sourcesUsed, vintage }),
    lookup: {
      ...lookup,
      status: "ok",
      facts,
      message,
      lat: geo.ok ? geo.lat : lookup.lat,
      lng: geo.ok ? geo.lng : lookup.lng,
    },
  };
}

export function describeFillAddress(address: PropertyAddressQuery): string {
  return formatPropertyAddress(address);
}
