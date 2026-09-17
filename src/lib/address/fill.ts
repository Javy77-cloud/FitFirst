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

/** Layout keys from Deal Details `data-ff-deal-field` (or control key) nodes. */
export function siblingKeysFromScope(scope: ParentNode | null | undefined): string[] {
  if (!scope || typeof (scope as Element).querySelectorAll !== "function") return [];
  const nodes = (scope as Element).querySelectorAll("[data-ff-deal-field], [data-ff-control-key]");
  const keys: string[] = [];
  const seen = new Set<string>();
  nodes.forEach((node) => {
    const key =
      node.getAttribute("data-ff-deal-field") || node.getAttribute("data-ff-control-key") || "";
    if (!key || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  });
  return keys;
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
