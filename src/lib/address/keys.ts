import type { AddressFillMap } from "./types";

const STREET_KEYS = new Set([
  "mailingaddress",
  "address",
  "address1",
  "street",
  "premisesaddress",
  "insuredaddress",
  "propertyaddress",
  "garagingaddress",
  "meetingaddress",
  "officeaddress",
  "location",
  "contactmailingaddress",
]);

const FILL_BY_KEY: Record<string, AddressFillMap> = {
  mailingaddress: { city: "city", state: "state", zip: "zip", county: "county" },
  contactmailingaddress: {
    city: "contact_mailing_city",
    state: "contact_mailing_state",
    zip: "contact_mailing_zip",
  },
  address: { city: "city", state: "state", zip: "zip", county: "county" },
  address1: { city: "city", state: "state", zip: "zip", county: "county" },
  street: { city: "city", state: "state", zip: "zip", county: "county" },
  premisesaddress: { city: "premisesCity", state: "premisesState", zip: "premisesZip" },
  insuredaddress: { city: "city", state: "state", zip: "zip" },
  propertyaddress: { city: "city", state: "state", zip: "zip", county: "county" },
  garagingaddress: { zip: "garaging_zip" },
  location: { city: "city", state: "state", zip: "zip" },
};

function normalizeKey(key: string | null | undefined): string {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function isStreetAddressField(key: string | null | undefined, type?: string | null): boolean {
  if (type === "address") return true;
  return STREET_KEYS.has(normalizeKey(key));
}

export function addressFillForKey(key: string | null | undefined): AddressFillMap {
  return FILL_BY_KEY[normalizeKey(key)] ?? { city: "city", state: "state", zip: "zip", county: "county" };
}
