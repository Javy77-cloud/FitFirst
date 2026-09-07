import type { AddressQuery } from "@/lib/public-records/facts";

/** Local stub parcels. County / listing facts — never a Zestimate or list price. */
export type StubProperty = {
  match: string;
  yearBuilt: string;
  construction: string;
  exterior: string;
  roofMaterial: string;
  squareFeet: string;
  beds: string;
  baths: string;
  garage: string;
  pool: string;
  floodZone: string;
  floridaYearBuilt?: string;
  floridaExterior?: string;
  floridaRoofMaterial?: string;
};

export const STUB_PROPERTIES: StubProperty[] = [
  {
    match: "1098 adige",
    yearBuilt: "1989",
    construction: "frame",
    exterior: "frame",
    roofMaterial: "clay tile",
    squareFeet: "1592",
    beds: "3",
    baths: "2",
    garage: "2 car",
    pool: "false",
    floodZone: "A",
    floridaYearBuilt: "1989",
    floridaExterior: "frame",
    floridaRoofMaterial: "clay tile",
  },
  {
    match: "412 harbor isle",
    yearBuilt: "2014",
    construction: "masonry",
    exterior: "masonry",
    roofMaterial: "shingle",
    squareFeet: "2104",
    beds: "4",
    baths: "2",
    garage: "2 car",
    pool: "false",
    floodZone: "X",
    floridaYearBuilt: "2014",
    floridaExterior: "masonry",
    floridaRoofMaterial: "shingle",
  },
  {
    match: "2140 tropic breeze",
    yearBuilt: "1998",
    construction: "masonry",
    exterior: "stucco",
    roofMaterial: "shingle",
    squareFeet: "2100",
    beds: "3",
    baths: "2",
    garage: "2 car",
    pool: "false",
    floodZone: "X",
    floridaYearBuilt: "1998",
    floridaExterior: "stucco",
    floridaRoofMaterial: "architectural shingle",
  },
];

function haystack(address: AddressQuery): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

export function stubPropertyFor(address: AddressQuery): StubProperty | null {
  const hay = haystack(address);
  if (!hay) return null;
  return STUB_PROPERTIES.find((row) => hay.includes(row.match)) ?? null;
}

export function addressCacheKey(address: AddressQuery): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .join("|");
}

export function isFloridaAddress(address: AddressQuery): boolean {
  const state = (address.state ?? "").trim().toUpperCase();
  if (state === "FL" || state === "FLORIDA") return true;
  return /\bfl(?:orida)?\b/i.test(address.address1 ?? "");
}
