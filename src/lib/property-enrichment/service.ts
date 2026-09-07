/**
 * County / property enrichment on address confirmation.
 *
 * Fills year built, construction, exterior, roof material, sqft, beds, baths,
 * garage, pool, flood zone as CHECK cells — same confirm gate as document
 * extract. Target 90%+ on year built / exterior / roof type when a BYO key
 * is present; remainder stays in the agent review bucket.
 *
 * No Zillow. No county website scrape. Paid APIs stop at the key wall.
 */

import type { PublicFact } from "@/lib/quote-sheet/apply";
import type { AddressQuery } from "@/lib/public-records/facts";
import {
  addressCacheKey,
  isFloridaAddress,
  stubPropertyFor,
  type StubProperty,
} from "./fixtures";
import {
  allProviderWalls,
  pickPrimaryProvider,
  providerWall,
  type PropertyProviderId,
  type ProviderWall,
} from "./providers";

export const ENRICHMENT_SHEET_FIELDS = [
  "year_built",
  "construction",
  "exterior",
  "roof_covering",
  "square_feet",
  "beds",
  "baths",
  "garage_type",
  "pool",
  "flood_zone",
] as const;

export type EnrichmentConflict = {
  fieldKey: string;
  primaryValue: string;
  floridaValue: string;
};

export type EnrichmentResult = {
  triggered: boolean;
  facts: PublicFact[];
  walls: ProviderWall[];
  conflicts: EnrichmentConflict[];
  cacheKey: string;
  provider: PropertyProviderId;
  message: string;
};

const memoryCache = new Map<string, EnrichmentResult>();

export function clearEnrichmentCache(): void {
  memoryCache.clear();
}

export function addressReadyForEnrichment(address: AddressQuery): boolean {
  return Boolean((address.address1 ?? "").trim());
}

export const ADDRESS_CONFIRM_KEYS = new Set(["address1", "city", "state", "zip"]);

function factsFromStub(
  stub: StubProperty,
  sourceLabel: string,
  kind: PublicFact["kind"] = "listing",
): PublicFact[] {
  const rows: Array<[string, string]> = [
    ["year_built", stub.yearBuilt],
    ["construction", stub.construction],
    ["exterior", stub.exterior],
    ["roof_covering", stub.roofMaterial],
    ["square_feet", stub.squareFeet],
    ["beds", stub.beds],
    ["baths", stub.baths],
    ["garage", stub.garage],
    ["pool", stub.pool],
    ["flood_zone", stub.floodZone],
  ];
  return rows
    .filter(([, value]) => value.trim())
    .map(([fieldKey, value]) => ({ fieldKey, value, sourceLabel, kind }));
}

function floridaFactsFromStub(stub: StubProperty): PublicFact[] {
  const rows: Array<[string, string | undefined]> = [
    ["year_built", stub.floridaYearBuilt],
    ["exterior", stub.floridaExterior],
    ["roof_covering", stub.floridaRoofMaterial],
  ];
  return rows
    .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .map(([fieldKey, value]) => ({
      fieldKey,
      value,
      sourceLabel: "Florida Property API (stub)",
      kind: "county" as const,
    }));
}

function mergePrimaryWithFlorida(
  primary: PublicFact[],
  florida: PublicFact[],
): { facts: PublicFact[]; conflicts: EnrichmentConflict[] } {
  const conflicts: EnrichmentConflict[] = [];
  const byKey = new Map<string, PublicFact>();
  for (const fact of primary) {
    if (fact.fieldKey === "coverage_a" || fact.kind === "zestimate" || fact.kind === "list_price") {
      continue;
    }
    byKey.set(fact.fieldKey, fact);
  }
  for (const fact of florida) {
    if (fact.fieldKey === "coverage_a") continue;
    const existing = byKey.get(fact.fieldKey);
    if (existing && existing.value.trim() && fact.value.trim() && existing.value !== fact.value) {
      conflicts.push({
        fieldKey: fact.fieldKey,
        primaryValue: existing.value,
        floridaValue: fact.value,
      });
      continue;
    }
    if (!existing) byKey.set(fact.fieldKey, fact);
  }
  return { facts: [...byKey.values()], conflicts };
}

async function lookupPrimaryStub(address: AddressQuery): Promise<{
  facts: PublicFact[];
  provider: PropertyProviderId;
}> {
  const provider = pickPrimaryProvider();
  const stub = stubPropertyFor(address);
  if (!stub) return { facts: [], provider };
  const label =
    provider === "estated" ? "Estated (stub)" : providerWall("attom").status === "ready" ? "ATTOM (stub)" : "ATTOM (stub · BYO key)";
  return { facts: factsFromStub(stub, label), provider };
}

async function lookupFloridaStub(address: AddressQuery): Promise<PublicFact[]> {
  if (!isFloridaAddress(address)) return [];
  const stub = stubPropertyFor(address);
  if (!stub) return [];
  return floridaFactsFromStub(stub);
}

export async function enrichPropertyOnAddressConfirm(
  address: AddressQuery,
  options?: { bypassCache?: boolean },
): Promise<EnrichmentResult> {
  const walls = allProviderWalls();
  const cacheKey = addressCacheKey(address);
  if (!addressReadyForEnrichment(address)) {
    return {
      triggered: false,
      facts: [],
      walls,
      conflicts: [],
      cacheKey,
      provider: pickPrimaryProvider(),
      message: "Address not confirmed — property enrichment skipped.",
    };
  }

  if (!options?.bypassCache && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  const primary = await lookupPrimaryStub(address);
  const florida = await lookupFloridaStub(address);
  const merged = mergePrimaryWithFlorida(primary.facts, florida);
  const wallNotes = walls.map((wall) => wall.message);
  const conflictNote = merged.conflicts.length
    ? ` Florida cross-check disagreed on ${merged.conflicts.map((row) => row.fieldKey).join(", ")} — primary kept, conflict in review.`
    : florida.length
      ? " Florida Property API stub cross-checked ATTOM."
      : "";
  const result: EnrichmentResult = {
    triggered: true,
    facts: merged.facts,
    walls,
    conflicts: merged.conflicts,
    cacheKey,
    provider: primary.provider,
    message: [
      merged.facts.length
        ? `Property enrichment offered ${merged.facts.length} CHECK field(s) from ${primary.provider}.`
        : "No stub parcel for this address — paid API wall (ATTOM / Estated / Florida Property). Agency BYO keys later.",
      conflictNote,
      wallNotes[0],
    ]
      .filter(Boolean)
      .join(" "),
  };
  memoryCache.set(cacheKey, result);
  return result;
}

export function enrichmentCacheSnapshot(): Map<string, EnrichmentResult> {
  return memoryCache;
}
