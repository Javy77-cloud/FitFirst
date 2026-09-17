import { EMPTY_ADDRESS, type ParsedAddress } from "./types";
import { normalizeStreet } from "@/lib/merge/normalize";

function normalizeCity(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeState(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeZip(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

export function addressFingerprint(address: ParsedAddress): string {
  return [
    normalizeStreet(address.street),
    normalizeCity(address.city),
    normalizeState(address.state),
    normalizeZip(address.zip),
  ]
    .filter(Boolean)
    .join("|");
}

export function addressesMatch(a: ParsedAddress, b: ParsedAddress): boolean {
  const left = addressFingerprint(a);
  const right = addressFingerprint(b);
  return Boolean(left) && left === right;
}

/** Split "412 Harbor Isle Dr, Melbourne, FL 32935" when city/state/ZIP siblings are empty. */
export function parseAddressLine(line: string): ParsedAddress {
  const raw = line.trim();
  if (!raw) return { ...EMPTY_ADDRESS };
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^(us|usa|united states)$/i.test(part));
  const street = parts[0] ?? raw;
  if (parts.length < 2) return { ...EMPTY_ADDRESS, street };
  const last = parts[parts.length - 1] ?? "";
  const stateZip = last.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (stateZip) {
    return {
      street,
      city: parts.slice(1, -1).join(", "),
      state: stateZip[1].toUpperCase(),
      zip: stateZip[2].slice(0, 5),
      county: "",
      country: "US",
    };
  }
  const zipOnly = last.match(/^(\d{5}(?:-\d{4})?)$/);
  if (zipOnly && parts.length >= 3) {
    const mid = parts[parts.length - 2] ?? "";
    const stateOnly = mid.match(/^([A-Za-z]{2})$/);
    return {
      street,
      city: stateOnly ? parts.slice(1, -2).join(", ") : parts.slice(1, -1).join(", "),
      state: stateOnly ? stateOnly[1].toUpperCase() : "",
      zip: zipOnly[1].slice(0, 5),
      county: "",
      country: "US",
    };
  }
  return { ...EMPTY_ADDRESS, street, city: parts[1] ?? "" };
}
