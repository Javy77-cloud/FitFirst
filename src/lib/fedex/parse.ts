import { EMPTY_ADDRESS, formatAddressLine, type AddressSuggestion, type ParsedAddress } from "@/lib/address/types";

type FedExResolved = {
  streetLines?: string[];
  streetLinesToken?: string[];
  streetLinesAddress?: { streetLines?: string[] };
  city?: string;
  stateOrProvinceCode?: string;
  postalCode?: string;
  countryCode?: string;
  county?: string;
  classification?: string;
  resolvedAddress?: FedExResolved;
  address?: FedExResolved;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function linesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => String(line ?? "").trim())
    .filter((line) => line && !/^TOK-/i.test(line));
}

function streetFromResolved(row: FedExResolved): string {
  const lines =
    linesFrom(row.streetLinesAddress?.streetLines).length > 0
      ? linesFrom(row.streetLinesAddress?.streetLines)
      : linesFrom(row.streetLines).length > 0
        ? linesFrom(row.streetLines)
        : linesFrom(row.streetLinesToken);
  return lines.join(" ");
}

export function parsedAddressFromFedEx(row: FedExResolved | null | undefined): ParsedAddress {
  if (!row) return { ...EMPTY_ADDRESS };
  const nested = row.resolvedAddress ?? row.address;
  const street = streetFromResolved(row) || (nested ? streetFromResolved(nested) : "");
  const city = asString(row.city) || asString(nested?.city);
  const state = asString(row.stateOrProvinceCode) || asString(nested?.stateOrProvinceCode);
  const zip = asString(row.postalCode) || asString(nested?.postalCode);
  const county = (asString(row.county) || asString(nested?.county)).replace(/\s+County$/i, "");
  const country = asString(row.countryCode) || asString(nested?.countryCode) || "US";
  return {
    street,
    city,
    state,
    zip,
    county,
    country,
  };
}

export function parseFedExResolvePayload(payload: unknown): AddressSuggestion[] {
  const root = asRecord(payload);
  const output = asRecord(root?.output) ?? root;
  const resolved = output?.resolvedAddresses;
  const list = Array.isArray(resolved) ? resolved : [];
  const suggestions: AddressSuggestion[] = [];
  list.forEach((item, index) => {
    const row = asRecord(item);
    if (!row) return;
    const address = parsedAddressFromFedEx(row as FedExResolved);
    if (!address.street && !address.city && !address.zip) return;
    suggestions.push({
      id: `fedex-${index}-${address.zip || address.city || index}`,
      label: formatAddressLine(address),
      address,
    });
  });
  return suggestions;
}
