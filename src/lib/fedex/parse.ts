import { EMPTY_ADDRESS, formatAddressLine, type AddressSuggestion, type ParsedAddress } from "@/lib/address/types";

type FedExResolved = {
  streetLines?: string[];
  streetLinesAddress?: { streetLines?: string[] };
  city?: string;
  stateOrProvinceCode?: string;
  postalCode?: string;
  countryCode?: string;
  county?: string;
  classification?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function streetFromResolved(row: FedExResolved): string {
  const lines =
    (Array.isArray(row.streetLinesAddress?.streetLines) ? row.streetLinesAddress?.streetLines : null) ??
    (Array.isArray(row.streetLines) ? row.streetLines : []);
  return lines.map((line) => String(line ?? "").trim()).filter(Boolean).join(" ");
}

export function parsedAddressFromFedEx(row: FedExResolved | null | undefined): ParsedAddress {
  if (!row) return { ...EMPTY_ADDRESS };
  return {
    street: streetFromResolved(row),
    city: asString(row.city),
    state: asString(row.stateOrProvinceCode),
    zip: asString(row.postalCode),
    county: asString(row.county).replace(/\s+County$/i, ""),
    country: asString(row.countryCode) || "US",
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
