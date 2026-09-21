import { normalizeVin, isDecodableVin } from "./normalize";
import { parseDecodeVinValuesRow, decodeLooksSuccessful } from "./map";
import type { VinDecodeValues } from "./types";
import { NHTSA_VPIC_DECODE_VALUES_URL } from "./types";

type FetchLike = typeof fetch;

const cache = new Map<string, VinDecodeValues>();

/** Stay inside a default serverless budget so a hung vPIC call returns this error. */
export const NHTSA_FETCH_TIMEOUT_MS = 8_000;
export const NHTSA_TIMEOUT_MESSAGE = "NHTSA vPIC timed out. Try again, or fill year/make/model by hand.";

/** Network / HTTP / timeout — the browser can call vPIC directly (CORS *). */
export function isNhtsaTransportFailure(message: string): boolean {
  return /timed out|timeout|NHTSA vPIC HTTP|non-JSON|NHTSA vPIC request failed|fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|aborted|socket|getaddrinfo/i.test(
    message,
  );
}

export function clearVinDecodeCache(): void {
  cache.clear();
}

export function peekVinDecodeCache(vin: string): VinDecodeValues | undefined {
  return cache.get(normalizeVin(vin));
}

export type DecodeVinResult =
  | { ok: true; vin: string; values: VinDecodeValues; cached: boolean }
  | { ok: false; vin: string; message: string };

/**
 * Free NHTSA vPIC DecodeVinValues — no key. Cached per normalized VIN in-process.
 */
export async function decodeVinValues(
  rawVin: string,
  fetchImpl: FetchLike = fetch,
  options?: { timeoutMs?: number },
): Promise<DecodeVinResult> {
  const vin = normalizeVin(rawVin);
  if (!isDecodableVin(vin)) {
    return { ok: false, vin, message: "VIN must be 17 characters." };
  }

  const hit = cache.get(vin);
  if (hit) return { ok: true, vin, values: hit, cached: true };

  const url = `${NHTSA_VPIC_DECODE_VALUES_URL}/${encodeURIComponent(vin)}?format=json`;
  const timeoutMs = options?.timeoutMs ?? NHTSA_FETCH_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Browsers ignore this forbidden header; Node/Vercel send it.
        "User-Agent": "FitFirst/vin-decode",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (name === "AbortError" || /aborted|timeout/i.test(error instanceof Error ? error.message : "")) {
      return { ok: false, vin, message: NHTSA_TIMEOUT_MESSAGE };
    }
    const message = error instanceof Error ? error.message : "NHTSA vPIC request failed";
    return { ok: false, vin, message };
  }

  if (!response.ok) {
    return { ok: false, vin, message: `NHTSA vPIC HTTP ${response.status}` };
  }

  let body: { Results?: Array<Record<string, unknown>> };
  try {
    body = (await response.json()) as { Results?: Array<Record<string, unknown>> };
  } catch {
    return { ok: false, vin, message: "NHTSA vPIC returned non-JSON." };
  }

  const row = body.Results?.[0];
  const values = parseDecodeVinValuesRow(row);
  if (!decodeLooksSuccessful(values)) {
    return {
      ok: false,
      vin,
      message: values.errorText || "NHTSA vPIC could not decode that VIN.",
    };
  }

  cache.set(vin, values);
  return { ok: true, vin, values, cached: false };
}
