/**
 * Public outbound search URLs for a property address.
 * Browser-only: never fetch Zillow or FEMA, never store Zestimate / list price,
 * never use either as Coverage A.
 */

export type PropertyAddressInput = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export function formatPropertyAddress(parts: PropertyAddressInput): string | null {
  const street = parts.address1?.trim() ?? "";
  if (!street) return null;
  const city = parts.city?.trim() ?? "";
  const stateZip = [parts.state?.trim(), parts.zip?.trim()].filter(Boolean).join(" ");
  const locality = [city, stateZip].filter(Boolean).join(", ");
  return locality ? `${street}, ${locality}` : street;
}

export function zillowHomesUrl(address: string): string {
  return `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`;
}

export function femaFloodMapUrl(address: string): string {
  return `https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(address)}`;
}

/** Free public Google Maps search. Not Maps Platform, no API key, no billing. */
export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function propertyAddressLinks(
  parts: PropertyAddressInput,
): { zillow: string; femaFlood: string; maps: string; formatted: string } | null {
  const formatted = formatPropertyAddress(parts);
  if (!formatted) return null;
  return {
    formatted,
    zillow: zillowHomesUrl(formatted),
    femaFlood: femaFloodMapUrl(formatted),
    maps: googleMapsSearchUrl(formatted),
  };
}
