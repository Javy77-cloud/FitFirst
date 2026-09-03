import { addressFromSheet, curatedFactsFor, type AddressQuery, type PublicLookupResult } from "./facts";
import type { PublicFact } from "@/lib/quote-sheet/apply";

export { addressFromSheet };

/**
 * Gap-fill blanks from public records after the uploaded doc is applied.
 * Live county PA is attempted; Cloudflare often blocks it. Curated facts
 * cover known desk addresses. Zestimate / list price are never returned as Cov A.
 */
export async function lookupPublicFacts(address: AddressQuery): Promise<PublicLookupResult> {
  const street = (address.address1 ?? "").trim();
  if (!street) {
    return { facts: [], message: "No street on the sheet yet — public records skipped." };
  }

  const curated = curatedFactsFor(address);
  const live: PublicFact[] = [];
  const notes: string[] = [];

  const county = await tryCountyPa(address);
  if (county.facts.length) live.push(...county.facts);
  if (county.message) notes.push(county.message);

  const fema = await tryFemaFlood(address);
  if (fema.facts.length) live.push(...fema.facts);
  if (fema.message) notes.push(fema.message);

  const merged = new Map<string, PublicFact>();
  for (const fact of [...(curated?.facts ?? []), ...live]) {
    if (fact.kind === "zestimate" || fact.kind === "list_price") continue;
    if (fact.fieldKey === "coverage_a") continue;
    if (!merged.has(fact.fieldKey)) merged.set(fact.fieldKey, fact);
  }

  const facts = [...merged.values()];
  const message = [
    curated?.message,
    ...notes,
    facts.length
      ? `Public records offered ${facts.length} blank-fill fact(s). Dec values stay first.`
      : "No extra public-record facts for this address.",
  ]
    .filter(Boolean)
    .join(" ");

  return { facts, message };
}

async function tryCountyPa(address: AddressQuery): Promise<PublicLookupResult> {
  const q = encodeURIComponent(`${address.address1} ${address.city} ${address.state} ${address.zip}`);
  const url = `https://www.bcpao.us/api/v1/search?address=${q}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { facts: [], message: `County PA live lookup ${res.status} — using curated facts when we have them.` };
    }
    const data = (await res.json()) as {
      yearBuilt?: number;
      sqft?: number;
      beds?: number;
      baths?: number;
      construction?: string;
    };
    const facts: PublicFact[] = [];
    if (data.yearBuilt) {
      facts.push({ fieldKey: "year_built", value: String(data.yearBuilt), sourceLabel: "Brevard PA", kind: "county" });
    }
    if (data.sqft) {
      facts.push({ fieldKey: "square_feet", value: String(data.sqft), sourceLabel: "Brevard PA", kind: "county" });
    }
    if (data.beds) facts.push({ fieldKey: "beds", value: String(data.beds), sourceLabel: "Brevard PA", kind: "county" });
    if (data.baths) facts.push({ fieldKey: "baths", value: String(data.baths), sourceLabel: "Brevard PA", kind: "county" });
    if (data.construction) {
      facts.push({
        fieldKey: "construction",
        value: String(data.construction),
        sourceLabel: "Brevard PA",
        kind: "county",
      });
    }
    return { facts, message: facts.length ? "County PA responded." : "County PA returned no facts." };
  } catch {
    return { facts: [], message: "County PA not reachable from this desk — curated listing facts still apply." };
  }
}

async function tryFemaFlood(address: AddressQuery): Promise<PublicLookupResult> {
  const street = `${address.address1 ?? ""}, ${address.city ?? ""}, ${address.state ?? ""} ${address.zip ?? ""}`;
  try {
    const geo = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(street)}&maxLocations=1`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!geo.ok) return { facts: [], message: "" };
    const geoJson = (await geo.json()) as {
      candidates?: { location?: { x: number; y: number } }[];
    };
    const loc = geoJson.candidates?.[0]?.location;
    if (!loc) return { facts: [], message: "" };
    const nfhl = await fetch(
      `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?geometry=${loc.x},${loc.y}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE&returnGeometry=false&f=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!nfhl.ok) return { facts: [], message: "" };
    const nfhlJson = (await nfhl.json()) as { features?: { attributes?: { FLD_ZONE?: string } }[] };
    const zone = nfhlJson.features?.[0]?.attributes?.FLD_ZONE;
    if (!zone) return { facts: [], message: "" };
    return {
      facts: [{ fieldKey: "flood_zone", value: zone, sourceLabel: "FEMA flood", kind: "fema" }],
      message: `FEMA NFHL zone ${zone}.`,
    };
  } catch {
    return { facts: [], message: "" };
  }
}
