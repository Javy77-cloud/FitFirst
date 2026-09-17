import { EMPTY_ADDRESS, formatAddressLine, type AddressSuggestion, type ParsedAddress } from "@/lib/address/types";

type MapboxContext = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  address?: string;
  properties?: {
    address?: string;
    full_address?: string;
    name?: string;
    address_number?: string;
    street?: string;
    context?: {
      place?: { name?: string };
      locality?: { name?: string };
      region?: { name?: string; region_code?: string };
      postcode?: { name?: string };
      district?: { name?: string };
    };
  };
  context?: MapboxContext[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function contextText(list: MapboxContext[] | undefined, prefix: string): string {
  const row = (list ?? []).find((item) => String(item.id ?? "").startsWith(prefix));
  return asString(row?.text);
}

function contextShort(list: MapboxContext[] | undefined, prefix: string): string {
  const row = (list ?? []).find((item) => String(item.id ?? "").startsWith(prefix));
  const short = asString(row?.short_code);
  if (short.includes("-")) return short.split("-").pop()?.toUpperCase() ?? "";
  return short.toUpperCase();
}

export function parsedAddressFromMapbox(feature: MapboxFeature | null | undefined): ParsedAddress {
  if (!feature) return { ...EMPTY_ADDRESS };
  const v6 = feature.properties?.context;
  const number =
    asString(feature.address) ||
    asString(feature.properties?.address_number) ||
    asString(feature.properties?.address);
  const route = asString(feature.properties?.street) || asString(feature.text);
  const street =
    asString(feature.properties?.name) ||
    [number, route].filter(Boolean).join(" ").trim() ||
    (feature.place_name ?? feature.properties?.full_address ?? "").split(",")[0]?.trim() ||
    "";
  const city =
    contextText(feature.context, "place") ||
    contextText(feature.context, "locality") ||
    contextText(feature.context, "neighborhood") ||
    asString(v6?.place?.name) ||
    asString(v6?.locality?.name);
  const state =
    contextShort(feature.context, "region") ||
    asString(v6?.region?.region_code).replace(/^US-/, "").toUpperCase();
  const zip = contextText(feature.context, "postcode") || asString(v6?.postcode?.name);
  const county = (contextText(feature.context, "district") || asString(v6?.district?.name)).replace(
    /\s+County$/i,
    "",
  );
  return {
    street,
    city,
    state,
    zip,
    county,
    country: "US",
  };
}

export function parseMapboxSuggestPayload(payload: unknown): AddressSuggestion[] {
  const root = asRecord(payload);
  const list = Array.isArray(root?.features) ? root.features : [];
  const suggestions: AddressSuggestion[] = [];
  list.forEach((item, index) => {
    const row = asRecord(item) as MapboxFeature | null;
    if (!row) return;
    const address = parsedAddressFromMapbox(row);
    if (!address.street && !address.city && !address.zip) return;
    suggestions.push({
      id: asString(row.id) || `mapbox-${index}-${address.zip || address.city || index}`,
      label: asString(row.place_name) || asString(row.properties?.full_address) || formatAddressLine(address),
      address,
    });
  });
  return suggestions;
}
