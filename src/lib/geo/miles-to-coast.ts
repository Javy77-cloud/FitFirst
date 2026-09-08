/**
 * Free INTERNAL miles-to-coast: nearest geodesic miles from a point to the
 * bundled Florida Gulf+Atlantic shoreline (no Google Maps / Distance Matrix).
 * Rounding: 1 decimal mile (e.g. 15.2).
 */

import coastline from "@/data/florida-coastline.json";

export const MILES_TO_COAST_SOURCE = "property-records" as const;
export const MILES_TO_COAST_LABEL = "computed coastline";
export const MILES_TO_COAST_SHEET_KEY = "miles_to_coast";

/** Earth mean radius in statute miles. */
const EARTH_RADIUS_MI = 3958.7613;

export type LatLng = { lat: number; lng: number };

type CoastJson = {
  features?: Array<{
    geometry?: { type?: string; coordinates?: number[][] };
  }>;
};

function coastlineRing(): LatLng[] {
  const collection = coastline as CoastJson;
  const coords = collection.features?.[0]?.geometry?.coordinates ?? [];
  return coords
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest point on segment AB to P using local equirectangular projection. */
export function nearestPointOnSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const cos = Math.cos((p.lat * Math.PI) / 180);
  const ax = a.lng * cos;
  const ay = a.lat;
  const bx = b.lng * cos;
  const by = b.lat;
  const px = p.lng * cos;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return a;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { lat: ay + t * dy, lng: (ax + t * dx) / cos };
}

export function distancePointToSegmentMiles(p: LatLng, a: LatLng, b: LatLng): number {
  return haversineMiles(p, nearestPointOnSegment(p, a, b));
}

/**
 * Miles from point to nearest segment on the bundled FL coastline.
 * Returns Infinity if coastline data is missing.
 */
export function milesToNearestCoast(point: LatLng, ring?: LatLng[]): number {
  const line = ring?.length ? ring : coastlineRing();
  if (line.length < 2) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const d = distancePointToSegmentMiles(point, line[i]!, line[i + 1]!);
    if (d < best) best = d;
  }
  return best;
}

/** Round to 1 decimal mile for sheet fill. */
export function formatMilesToCoast(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return "";
  return (Math.round(miles * 10) / 10).toFixed(1);
}

export function sheetCellForMilesToCoast(miles: number): {
  value: string;
  status: "check";
  source: typeof MILES_TO_COAST_SOURCE;
  sourceLabel: typeof MILES_TO_COAST_LABEL;
} {
  return {
    value: formatMilesToCoast(miles),
    status: "check",
    source: MILES_TO_COAST_SOURCE,
    sourceLabel: MILES_TO_COAST_LABEL,
  };
}
