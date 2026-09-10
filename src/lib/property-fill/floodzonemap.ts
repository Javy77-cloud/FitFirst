/**
 * FloodZoneMap.org free flood-zone lookup (no API key).
 * Prefer lat/lon lookup; address embed geocodes when coords are unavailable.
 * Attribution: FloodZoneMap.org (FEMA NFHL data).
 */

import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { FLOODZONEMAP_LABEL } from "./types";

const LOOKUP_URL = "https://floodzonemap.org/api/lookup";
const EMBED_URL = "https://floodzonemap.org/api/embed";

type FetchLike = typeof fetch;

export type FloodZoneMapZone = {
  zone?: string | null;
  zone_subtype?: string | null;
  sfha?: boolean | null;
  base_flood_elevation?: string | number | null;
  dfirm_id?: string | null;
  risk_level?: string | null;
  risk_description?: string | null;
};

export type FloodZoneMapPayload = {
  lat?: number;
  lon?: number;
  zone_count?: number;
  zones?: FloodZoneMapZone[];
  /** Embed may flatten primary zone onto the root. */
  zone?: string | null;
  sfha?: boolean | null;
  base_flood_elevation?: string | number | null;
  dfirm_id?: string | null;
  risk_level?: string | null;
  address?: string | null;
  matched_address?: string | null;
  web_url?: string | null;
};

function push(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value) return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: FLOODZONEMAP_LABEL,
    kind: "fema",
  });
}

function asTrimmed(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

function validBfe(raw: unknown): string {
  const s = asTrimmed(raw);
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n) || n <= -9990 || n >= 9990) return "";
  return String(n);
}

function primaryZone(payload: FloodZoneMapPayload): FloodZoneMapZone {
  const fromList = payload.zones?.find((z) => asTrimmed(z?.zone));
  if (fromList) return fromList;
  return {
    zone: payload.zone,
    sfha: payload.sfha,
    base_flood_elevation: payload.base_flood_elevation,
    dfirm_id: payload.dfirm_id,
    risk_level: payload.risk_level,
  };
}

/** Map FloodZoneMap JSON → PropertyRecordsFact (catalog keys only). */
export function mapFloodZoneMapToFacts(payload: unknown): PropertyRecordsFact[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as FloodZoneMapPayload;
  const zone = primaryZone(data);
  const facts: PropertyRecordsFact[] = [];

  push(facts, "flood_zone", asTrimmed(zone.zone));
  push(facts, "bfe", validBfe(zone.base_flood_elevation));
  // dfirm_id ≈ community/map id — map onto firm_panel when present
  push(facts, "firm_panel", asTrimmed(zone.dfirm_id));
  // sfha not in quote-sheet catalog — skip

  return facts;
}

export type FloodZoneMapLookupInput = {
  lat?: number;
  lng?: number;
  address?: string | null;
};

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<unknown | null> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * Lookup flood facts: lat/lon preferred, else address embed.
 * Soft-fails to [] on network/API errors.
 */
export async function factsFromFloodZoneMap(
  input: FloodZoneMapLookupInput,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const lat = input.lat;
  const lon = input.lng;
  if (typeof lat === "number" && Number.isFinite(lat) && typeof lon === "number" && Number.isFinite(lon)) {
    const url = `${LOOKUP_URL}?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
    const json = await fetchJson(url, fetchImpl);
    if (json) return mapFloodZoneMapToFacts(json);
  }

  const q = (input.address ?? "").trim();
  if (!q) return [];
  const embedUrl = `${EMBED_URL}?q=${encodeURIComponent(q)}`;
  const embed = await fetchJson(embedUrl, fetchImpl);
  return embed ? mapFloodZoneMapToFacts(embed) : [];
}
