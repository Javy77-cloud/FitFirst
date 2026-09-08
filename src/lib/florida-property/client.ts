import {
  FLORIDA_PROPERTY_SEARCH_URL,
  MISSING_KEY_MESSAGE,
  floridaPropertyKeyReady,
} from "./key";
import { factsFromFloridaParcel, pickFirstParcel, type PropertyRecordsFact } from "./map";

export type PropertyAddressQuery = {
  address1?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type FloridaPropertySearchResult = {
  status: "ok" | "needs_key" | "no_address" | "not_found" | "error";
  facts: PropertyRecordsFact[];
  message: string;
  called: boolean;
};

export const NO_ADDRESS_MESSAGE =
  "Add a property address on the sheet or the deal first. No lookup ran.";

export function formatPropertyAddress(address: PropertyAddressQuery): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function countySlug(county: string | null | undefined): string {
  return (county ?? "")
    .trim()
    .toLowerCase()
    .replace(/county$/i, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function addressReadyForPropertyRecords(address: PropertyAddressQuery): boolean {
  return Boolean((address.address1 ?? "").trim());
}

type FetchLike = typeof fetch;

export async function searchFloridaPropertyRecords(
  address: PropertyAddressQuery,
  apiKey: string | null | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<FloridaPropertySearchResult> {
  if (!floridaPropertyKeyReady(apiKey)) {
    return { status: "needs_key", facts: [], message: MISSING_KEY_MESSAGE, called: false };
  }
  if (!addressReadyForPropertyRecords(address)) {
    return { status: "no_address", facts: [], message: NO_ADDRESS_MESSAGE, called: false };
  }

  const params = new URLSearchParams();
  const street = (address.address1 ?? "").trim();
  const city = address.city?.trim() ?? "";
  const zip = address.zip?.trim() ?? "";
  const county = countySlug(address.county);
  // Prefer street-only in query when city/zip/county filters are also sent
  // (API rejects unknown `address=` and works with query/q + filters).
  const hasLocationFilters = Boolean(county || city || zip);
  params.set("query", hasLocationFilters ? street : formatPropertyAddress(address));
  if (county) params.set("county", county);
  if (city) params.set("city", city);
  if (zip) params.set("zip", zip);
  params.set("limit", "1");

  const url = `${FLORIDA_PROPERTY_SEARCH_URL}?${params.toString()}`;
  try {
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${apiKey!.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      return {
        status: "error",
        facts: [],
        message: "Florida Property API rejected the key (401). No fields were written.",
        called: true,
      };
    }
    if (!res.ok) {
      return {
        status: "error",
        facts: [],
        message: `Florida Property API returned ${res.status}. No fields were written.`,
        called: true,
      };
    }
    const payload = await res.json();
    const facts = factsFromFloridaParcel(pickFirstParcel(payload));
    if (!facts.length) {
      return {
        status: "not_found",
        facts: [],
        message: "No parcel matched that address. Empty cells were left alone.",
        called: true,
      };
    }
    return {
      status: "ok",
      facts,
      message: `Florida Property API returned ${facts.length} field(s) for empty-only fill.`,
      called: true,
    };
  } catch {
    return {
      status: "error",
      facts: [],
      message: "Florida Property API was not reachable. No fields were written.",
      called: true,
    };
  }
}
