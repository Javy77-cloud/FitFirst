/**
 * Forward-geocode a property address for GetParcelData point lookup.
 * Uses the same ArcGIS World GeocodeServer already used by public-records FEMA.
 */

export type GeocodeResult =
  | {
      ok: true;
      lat: number;
      lng: number;
      /** ArcGIS Subregion, "County" suffix removed so county PA adapters match. */
      county?: string;
      city?: string;
      state?: string;
      zip?: string;
    }
  | { ok: false; message: string };

export type GeocodeAddress = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

type FetchLike = typeof fetch;

const ARCGIS_GEOCODE_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

export function formatGeocodeLine(address: GeocodeAddress): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function geocodePropertyAddress(
  address: GeocodeAddress,
  fetchImpl: FetchLike = fetch,
): Promise<GeocodeResult> {
  const singleLine = formatGeocodeLine(address);
  if (!singleLine) {
    return { ok: false, message: "Add a property address on the sheet first. No lookup ran." };
  }
  const url = `${ARCGIS_GEOCODE_URL}?f=json&singleLine=${encodeURIComponent(singleLine)}&maxLocations=1&outFields=Subregion,City,Region,Postal`;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return { ok: false, message: `Geocoder returned ${res.status}. No parcel lookup ran.` };
    }
    const geoJson = (await res.json()) as {
      candidates?: {
        location?: { x: number; y: number };
        score?: number;
        attributes?: Record<string, unknown>;
      }[];
    };
    const candidate = geoJson.candidates?.[0];
    const loc = candidate?.location;
    if (!loc || !Number.isFinite(loc.x) || !Number.isFinite(loc.y)) {
      return { ok: false, message: "Could not geocode that property address. No parcel lookup ran." };
    }
    const attrs = candidate?.attributes ?? {};
    const text = (key: string) => String(attrs[key] ?? "").trim();
    const county = text("Subregion").replace(/\s+county$/i, "").trim();
    return {
      ok: true,
      lat: loc.y,
      lng: loc.x,
      county: county || undefined,
      city: text("City") || undefined,
      state: text("Region") || undefined,
      zip: text("Postal").slice(0, 5) || undefined,
    };
  } catch {
    return { ok: false, message: "Geocoder was not reachable. No parcel lookup ran." };
  }
}
