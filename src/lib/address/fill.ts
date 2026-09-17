import { parseAddressLine } from "./compare";
import { EMPTY_ADDRESS, type AddressFillMap, type ParsedAddress } from "./types";

/** Deal/contact inputs are `field_<key>`. Live values and layout keys are unprefixed. */
export function layoutKeyFromControlName(name: string | undefined): string {
  return String(name ?? "").replace(/^field_/i, "");
}

export function mergeParsedAddress(
  address: ParsedAddress | null | undefined,
  label: string,
): ParsedAddress {
  const base = address ?? { ...EMPTY_ADDRESS };
  const fromLabel = parseAddressLine(label);
  const street =
    base.street ||
    fromLabel.street ||
    label.split(",")[0]?.trim() ||
    "";
  return {
    street,
    city: base.city || fromLabel.city,
    state: base.state || fromLabel.state,
    zip: base.zip || fromLabel.zip,
    county: base.county || fromLabel.county,
    country: "US",
  };
}

/** Map a confirmed address onto layout keys (city / contact_mailing_city / …). */
export function siblingPatchFromAddress(
  fill: AddressFillMap,
  address: ParsedAddress,
  streetControlName?: string,
): Record<string, string> {
  const patch: Record<string, string> = {};
  const assign = (controlName: string | undefined, value: string) => {
    const key = layoutKeyFromControlName(controlName);
    if (!key || !value) return;
    patch[key] = value;
  };
  assign(streetControlName, address.street);
  assign(fill.city, address.city);
  assign(fill.state, address.state);
  assign(fill.zip, address.zip);
  assign(fill.county, address.county);
  return patch;
}
