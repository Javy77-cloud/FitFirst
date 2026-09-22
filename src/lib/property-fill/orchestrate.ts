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
import { searchPermitStackHistory } from "@/lib/permitstack/client";
import { permitStackKeyReady } from "@/lib/permitstack/key";
import { factsFromCountyPa } from "./counties/registry";
import { factsFromFemaNfhl } from "./fema";
import { factsFromFloodZoneMap } from "./floodzonemap";
import { isZoneXNoBfe, mergePropertyFillFacts, toastForPropertyFill } from "./merge";
import type { PropertyFillBundle, PropertyFillSourceId } from "./types";

type FetchLike = typeof fetch;

export type OrchestrateInput = {
  address: PropertyAddressQuery;
  apiKey: string | null | undefined;
  permitStackKey?: string | null;
  fetchImpl?: FetchLike;
};

/**
 * Single Fill-from-property-records pipeline:
 * County PA GIS (free) → FloodZoneMap (free) → FEMA NFHL empty-only (free)
 * → GetParcelData (BYO key, live HTTP) → PermitStack (BYO key, live HTTP).
 * One fact list, empty-only apply upstream. Docs/Gemini stay on a separate Fill step.
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
      warnings: [],
      toast: "Add a property address on the quote sheet first.",
      lookup,
    };
  }

  const keyReady = getParcelDataKeyReady(input.apiKey);
  const permitKeyReady = permitStackKeyReady(input.permitStackKey);
  const geo = await geocodePropertyAddress(input.address, fetchImpl);
  const warnings: string[] = [];
  if (!geo.ok) warnings.push(geo.message);
  const countyName = (input.address.county ?? "").trim() || (geo.ok ? geo.county ?? "" : "");
  if (!countyName) {
    warnings.push("County property records skipped — no county on the address. Flood lookup still runs.");
  }
  const countyAddress = { ...input.address, county: countyName };
  const addressLine = formatPropertyAddress(countyAddress);

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

  const permitStackPromise = permitKeyReady
    ? searchPermitStackHistory(input.address, input.permitStackKey, fetchImpl).catch(() => ({
        status: "error" as const,
        facts: [] as PropertyRecordsFact[],
        message: "PermitStack was not reachable. No permit years were written.",
        called: true,
      }))
    : Promise.resolve({
        status: "needs_key" as const,
        facts: [] as PropertyRecordsFact[],
        message: "PermitStack key not configured; continuing with other sources.",
        called: false,
      });

  const countyPromise = factsFromCountyPa(countyAddress, fetchImpl);

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

  const [lookup, permitStack, county, floodZoneMapFacts, femaFacts] = await Promise.all([
    getParcelPromise,
    permitStackPromise,
    countyPromise,
    floodZoneMapPromise,
    femaPromise,
  ]);

  if (lookup.status === "needs_key") {
    warnings.push("GetParcelData key missing — county and flood results still apply.");
  } else if (lookup.status === "error") {
    warnings.push(lookup.message || "GetParcelData failed. Other property sources still apply.");
  }
  if (permitStack.status === "error") {
    warnings.push(permitStack.message || "PermitStack failed. Other property sources still apply.");
  }
  if (!county.adapterId && countyName) {
    warnings.push(`No county property adapter for ${countyName}. Flood lookup still runs.`);
  } else if (county.adapterId && !county.facts.length) {
    warnings.push(`County property records (${county.adapterId}) returned no fields.`);
  }
  if (!floodZoneMapFacts.length && !femaFacts.length) {
    warnings.push("Flood lookup returned no flood fields.");
  }

  const { facts: mergedFacts, sourcesUsed } = mergePropertyFillFacts({
    getParcel: lookup.status === "ok" ? lookup.facts : [],
    countyPa: county.facts,
    floodZoneMap: floodZoneMapFacts,
    fema: femaFacts,
    permitStack: permitStack.status === "ok" ? permitStack.facts : [],
  });
  const facts = [...mergedFacts];
  if (countyName && !facts.some((fact) => fact.sheetKey === "county")) {
    facts.push({
      fieldKey: "county",
      sheetKey: "county",
      value: countyName,
      sourceLabel: geo.ok && geo.county ? "geocode" : "deal details",
      kind: "county",
    });
  }

  const vintage =
    (lookup.hit ? parcelVintage(lookup.hit) : "") ||
    "";

  if (!facts.length) {
    if (
      !keyReady &&
      !permitKeyReady &&
      !county.facts.length &&
      !floodZoneMapFacts.length &&
      !femaFacts.length
    ) {
      return {
        status: "needs_key",
        facts: [],
        sourcesUsed: [],
        message: [lookup.message, ...warnings].filter(Boolean).join(" · "),
        warnings,
        toast: "property-records-needs-key",
        lookup,
      };
    }
    const status = lookup.status === "error" && permitStack.status === "error" ? "error" : "not_found";
    const baseMessage =
      lookup.message ||
      permitStack.message ||
      "No parcel fields from county PA, FloodZoneMap, FEMA, GetParcel, or PermitStack.";
    return {
      status,
      facts: [],
      sourcesUsed,
      message: [baseMessage, ...warnings].filter(Boolean).join(" · "),
      warnings,
      toast: status === "error" ? "property-records-error" : "property-records-not-found",
      lookup,
    };
  }

  const sourceNote = sourcesUsed
    .map((id: PropertyFillSourceId) => {
      if (id === "property-records") return "GetParcelData";
      if (id === "county-pa") return `county PA (${county.adapterId ?? "?"})`;
      if (id === "floodzonemap") return "FloodZoneMap";
      if (id === "permitstack") return "PermitStack";
      return "FEMA";
    })
    .join(", ");

  const message = [
    `Merged ${facts.length} field(s) from ${sourceNote || "geocode"} for empty-only fill`,
    vintage ? `vintage ${vintage}` : "",
    warnings.length ? warnings.join(" · ") : "",
  ]
    .filter(Boolean)
    .join(". ")
    .concat(".");

  return {
    status: "ok",
    facts,
    sourcesUsed,
    message,
    warnings,
    toast: toastForPropertyFill({
      filledCount: facts.length,
      sourcesUsed,
      vintage,
      zoneXNoBfe: isZoneXNoBfe(facts),
    }),
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
