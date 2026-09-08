import { geocodePropertyAddress } from "./geocode";
import {
  GETPARCELDATA_POINT_URL,
  MISSING_KEY_MESSAGE,
  getParcelDataKeyReady,
} from "./key";
import { factsFromGetParcel, pickFirstParcel, type PropertyRecordsFact } from "./map";

export type PropertyAddressQuery = {
  address1?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type GetParcelDataSearchResult = {
  status: "ok" | "needs_key" | "no_address" | "not_found" | "error";
  facts: PropertyRecordsFact[];
  message: string;
  called: boolean;
};

export const NO_ADDRESS_MESSAGE =
  "Add a property address on the quote sheet first. No lookup ran.";

export function formatPropertyAddress(address: PropertyAddressQuery): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function addressReadyForPropertyRecords(address: PropertyAddressQuery): boolean {
  return Boolean((address.address1 ?? "").trim());
}

type FetchLike = typeof fetch;

/**
 * Fill-from-property-records via getparceldata.com:
 * geocode sheet address → GET /v1/parcels/point?lat=&lng= with Bearer auth.
 */
export async function searchGetParcelDataRecords(
  address: PropertyAddressQuery,
  apiKey: string | null | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<GetParcelDataSearchResult> {
  if (!getParcelDataKeyReady(apiKey)) {
    return { status: "needs_key", facts: [], message: MISSING_KEY_MESSAGE, called: false };
  }
  if (!addressReadyForPropertyRecords(address)) {
    return { status: "no_address", facts: [], message: NO_ADDRESS_MESSAGE, called: false };
  }

  const geo = await geocodePropertyAddress(address, fetchImpl);
  if (!geo.ok) {
    return {
      status: "error",
      facts: [],
      message: geo.message,
      called: false,
    };
  }

  const params = new URLSearchParams({
    lat: String(geo.lat),
    lng: String(geo.lng),
    limit: "1",
  });
  const url = `${GETPARCELDATA_POINT_URL}?${params.toString()}`;

  try {
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${apiKey!.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) {
      return {
        status: "error",
        facts: [],
        message: "GetParcelData rejected the key (401). No fields were written.",
        called: true,
      };
    }
    if (res.status === 402) {
      return {
        status: "error",
        facts: [],
        message: "GetParcelData has insufficient credits (402). No fields were written.",
        called: true,
      };
    }
    if (!res.ok) {
      return {
        status: "error",
        facts: [],
        message: `GetParcelData returned ${res.status}. No fields were written.`,
        called: true,
      };
    }
    const payload = await res.json();
    const facts = factsFromGetParcel(pickFirstParcel(payload));
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
      message: `GetParcelData returned ${facts.length} field(s) for empty-only fill.`,
      called: true,
    };
  } catch {
    return {
      status: "error",
      facts: [],
      message: "GetParcelData was not reachable. No fields were written.",
      called: true,
    };
  }
}
