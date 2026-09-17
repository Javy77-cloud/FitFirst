import { stateCodeFromLabel } from "@/lib/address/compare";
import type { ParsedAddress } from "@/lib/address/types";

const UNIT_SPLIT =
  /^(.+?)[,\s]+((?:apt|apartment|unit|ste|suite|#|fl|floor|bldg|building)\.?\s*.+)$/i;

export function streetLinesForFedEx(street: string, unit?: string): string[] {
  const trimmed = street.trim();
  const extra = unit?.trim();
  if (extra) return [trimmed, extra].filter(Boolean);
  const match = trimmed.match(UNIT_SPLIT);
  if (match?.[1] && match[2]) return [match[1].trim(), match[2].trim()];
  return trimmed ? [trimmed] : [];
}

export function normalizePostalForFedEx(zip: string): string {
  const digits = String(zip ?? "").replace(/\D/g, "");
  if (digits.length >= 9) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  return digits.slice(0, 5);
}

export function normalizeCountryForFedEx(country: string | undefined): string {
  const raw = String(country ?? "").trim();
  if (!raw || /^(us|usa|united states)$/i.test(raw)) return "US";
  return raw.length === 2 ? raw.toUpperCase() : raw;
}

export function fedexResolveRequestAddress(
  address: ParsedAddress,
  unit?: string,
): {
  streetLines: string[];
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
} {
  const state = stateCodeFromLabel(address.state) || address.state.trim().toUpperCase();
  return {
    streetLines: streetLinesForFedEx(address.street, unit),
    city: address.city.trim(),
    stateOrProvinceCode: state,
    postalCode: normalizePostalForFedEx(address.zip),
    countryCode: normalizeCountryForFedEx(address.country),
  };
}

export function classifyFedExHttpStatus(status: number): "ok" | "auth" | "transport" | "unmatched" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 404 || status === 422) return "unmatched";
  return "transport";
}
