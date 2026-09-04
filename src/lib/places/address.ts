export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

function pick(
  components: GoogleAddressComponent[],
  type: string,
  useShort = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return "";
  return useShort ? match.short_name : match.long_name;
}

/** Map Google Place address_components onto desk street / city / state / ZIP / county. */
export function parseGoogleAddressComponents(
  components: GoogleAddressComponent[] | null | undefined,
): ParsedAddress {
  const list = components ?? [];
  const number = pick(list, "street_number");
  const route = pick(list, "route");
  const street = [number, route].filter(Boolean).join(" ").trim();
  const city =
    pick(list, "locality") ||
    pick(list, "postal_town") ||
    pick(list, "sublocality_level_1") ||
    pick(list, "neighborhood");
  const county = pick(list, "administrative_area_level_2").replace(/\s+County$/i, "");
  const state = pick(list, "administrative_area_level_1", true);
  const zip = pick(list, "postal_code");
  return { street, city, state, zip, county };
}

export function placesApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    "";
  return key || null;
}
