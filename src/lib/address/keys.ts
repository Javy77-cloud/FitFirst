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
  "previousaddress",
  "prioraddress",
  "applicantaddress",
  "mortgageeaddress",
]);

const FILL_BY_KEY: Record<string, AddressFillMap> = {
  mailingaddress: { city: "city", state: "state", zip: "zip", county: "county" },
  contactmailingaddress: {
    city: "contact_mailing_city",
    state: "contact_mailing_state",
    zip: "contact_mailing_zip",
    county: "contact_mailing_county",
  },
  address: { city: "city", state: "state", zip: "zip", county: "county" },
  address1: { city: "city", state: "state", zip: "zip", county: "county" },
  street: { city: "city", state: "state", zip: "zip", county: "county" },
  premisesaddress: { city: "premisesCity", state: "premisesState", zip: "premisesZip" },
  insuredaddress: { city: "city", state: "state", zip: "zip" },
  propertyaddress: { city: "city", state: "state", zip: "zip", county: "county" },
  garagingaddress: { zip: "garaging_zip" },
  location: { city: "city", state: "state", zip: "zip" },
  previousaddress: { city: "previous_city", state: "previous_state", zip: "previous_zip" },
  prioraddress: { city: "city", state: "state", zip: "zip" },
  applicantaddress: { city: "city", state: "state", zip: "zip" },
};

function normalizeKey(key: string | null | undefined): string {
  return String(key ?? "")
    .trim()
    .replace(/^field_/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Deal/contact layouts prefix inputs as field_<key>. Qualify sibling names the same way. */
export function qualifyAddressFill(fill: AddressFillMap, controlName: string): AddressFillMap {
  const prefix = /^field_/i.test(controlName) ? "field_" : "";
  if (!prefix) return fill;
  const qualify = (value?: string) => {
    if (!value) return value;
    return value.startsWith(prefix) ? value : `${prefix}${value}`;
  };
  return {
    city: qualify(fill.city),
    state: qualify(fill.state),
    zip: qualify(fill.zip),
    county: qualify(fill.county),
  };
}

export function isStreetAddressField(key: string | null | undefined, type?: string | null): boolean {
  if (type === "address") return true;
  return STREET_KEYS.has(normalizeKey(key));
}

export function addressFillForKey(key: string | null | undefined): AddressFillMap {
  return FILL_BY_KEY[normalizeKey(key)] ?? { city: "city", state: "state", zip: "zip", county: "county" };
}

/**
 * Prefer city / state / ZIP / county keys that actually sit next to the street
 * field (Deal Details section, quote-sheet row). Static FILL_BY_KEY is fallback.
 */
export function addressFillFromSiblingKeys(
  streetKey: string | null | undefined,
  siblingKeys: readonly string[] | null | undefined,
): AddressFillMap {
  const street = normalizeKey(streetKey);
  const streetRaw = String(streetKey ?? "").replace(/^field_/i, "");
  const prefix = streetRaw.replace(/_?(address|street|line1|address1)$/i, "");
  const pick = (kind: "city" | "state" | "zip" | "county"): string | undefined => {
    const rows = (siblingKeys ?? [])
      .map((key) => String(key ?? "").replace(/^field_/i, ""))
      .filter((raw) => raw && normalizeKey(raw) !== street);
    const prefixed = prefix
      ? rows.find((raw) => raw.toLowerCase() === `${prefix.toLowerCase()}_${kind}`)
      : undefined;
    if (prefixed) return prefixed;
    const re = new RegExp(`(^|_)${kind}$`, "i");
    return rows.find((raw) => re.test(raw));
  };
  return {
    city: pick("city"),
    state: pick("state"),
    zip: pick("zip"),
    county: pick("county"),
  };
}

function firstFillPart(...parts: Array<string | undefined>): string | undefined {
  return parts.find((part) => Boolean(part && String(part).trim()));
}

export function addressFillNames(
  key: string | null | undefined,
  controlName?: string,
  siblingKeys?: readonly string[] | null,
): AddressFillMap {
  const fromSiblings = addressFillFromSiblingKeys(key ?? controlName, siblingKeys);
  const fallback = addressFillForKey(key ?? controlName);
  const fill: AddressFillMap = {
    city: firstFillPart(fromSiblings.city, fallback.city),
    state: firstFillPart(fromSiblings.state, fallback.state),
    zip: firstFillPart(fromSiblings.zip, fallback.zip),
    county: firstFillPart(fromSiblings.county, fallback.county),
  };
  return qualifyAddressFill(fill, controlName ?? key ?? "");
}
