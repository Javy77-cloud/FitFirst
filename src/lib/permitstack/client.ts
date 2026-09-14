import {
  addressReadyForPropertyRecords,
  formatPropertyAddress,
  type PropertyAddressQuery,
} from "@/lib/getparceldata/client";
import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import {
  MISSING_PERMITSTACK_KEY_MESSAGE,
  PERMITSTACK_HISTORY_URL,
  permitStackKeyReady,
} from "./key";
import {
  factsFromPermitHistory,
  summarizePermitStackFill,
  type PermitStackHistoryPayload,
} from "./map";

export type PermitStackSearchResult = {
  status: "ok" | "needs_key" | "no_address" | "not_found" | "error";
  facts: PropertyRecordsFact[];
  message: string;
  called: boolean;
};

const NO_ADDRESS_MESSAGE =
  "Add a property address on the quote sheet first. No PermitStack lookup ran.";

type FetchLike = typeof fetch;

/**
 * Live PermitStack property history. Never stubbed — missing key skips the call.
 * Free tier returns the last 30 days; paid plans return full history. Mapping is the same.
 */
export async function searchPermitStackHistory(
  address: PropertyAddressQuery,
  apiKey: string | null | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<PermitStackSearchResult> {
  if (!permitStackKeyReady(apiKey)) {
    return {
      status: "needs_key",
      facts: [],
      message: MISSING_PERMITSTACK_KEY_MESSAGE,
      called: false,
    };
  }
  if (!addressReadyForPropertyRecords(address)) {
    return { status: "no_address", facts: [], message: NO_ADDRESS_MESSAGE, called: false };
  }

  const params = new URLSearchParams({
    address: (address.address1 ?? "").trim(),
    page: "1",
    per_page: "50",
  });
  if (address.city?.trim()) params.set("city", address.city.trim());
  if (address.state?.trim()) params.set("state", address.state.trim());
  if (address.zip?.trim()) params.set("zip", address.zip.trim());
  const url = `${PERMITSTACK_HISTORY_URL}?${params.toString()}`;

  try {
    const res = await fetchImpl(url, {
      headers: {
        "X-API-Key": apiKey!.trim(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) {
      return {
        status: "error",
        facts: [],
        message: "PermitStack rejected the key (401). No permit years were written.",
        called: true,
      };
    }
    if (res.status === 429) {
      return {
        status: "error",
        facts: [],
        message: "PermitStack rate-limited the request (429). No permit years were written.",
        called: true,
      };
    }
    if (!res.ok) {
      return {
        status: "error",
        facts: [],
        message: `PermitStack returned ${res.status}. No permit years were written.`,
        called: true,
      };
    }
    const payload = (await res.json()) as PermitStackHistoryPayload;
    const facts = factsFromPermitHistory(payload);
    if (!facts.length) {
      return {
        status: "not_found",
        facts: [],
        message: payload.found
          ? summarizePermitStackFill(0)
          : `No PermitStack history for ${formatPropertyAddress(address)}.`,
        called: true,
      };
    }
    return {
      status: "ok",
      facts,
      message: summarizePermitStackFill(facts.length),
      called: true,
    };
  } catch {
    return {
      status: "error",
      facts: [],
      message: "PermitStack was not reachable. No permit years were written.",
      called: true,
    };
  }
}
