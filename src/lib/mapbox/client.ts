import { parseMapboxSuggestPayload } from "./parse";
import type { AddressSuggestion } from "@/lib/address/types";

export type FetchLike = (
  input: string | URL,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

/** Server-only. Never log or return this value. */
export function mapboxAccessToken(): string | null {
  const token = (
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    ""
  ).trim();
  return token || null;
}

export function mapboxAutocompleteEnabled(): boolean {
  return Boolean(mapboxAccessToken());
}

export async function suggestMapboxAddresses(
  query: string,
  fetchImpl: FetchLike = fetch,
): Promise<AddressSuggestion[]> {
  const token = mapboxAccessToken();
  const q = query.trim();
  if (!token || q.length < 3) return [];
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("types", "address");
  url.searchParams.set("country", "US");
  url.searchParams.set("limit", "6");
  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  return parseMapboxSuggestPayload(await res.json());
}
