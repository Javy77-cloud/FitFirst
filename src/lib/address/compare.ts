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

/** Mapbox labels use "Florida 32935"; desk siblings need FL. */
const US_STATE_BY_NAME: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

export function stateCodeFromLabel(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return US_STATE_BY_NAME[trimmed.toLowerCase()] ?? "";
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
  const stateZip = last.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
  if (stateZip) {
    const state = stateCodeFromLabel(stateZip[1]);
    if (state) {
      return {
        street,
        city: parts.slice(1, -1).join(", "),
        state,
        zip: stateZip[2].slice(0, 5),
        county: "",
        country: "US",
      };
    }
  }
  const zipOnly = last.match(/^(\d{5}(?:-\d{4})?)$/);
  if (zipOnly && parts.length >= 3) {
    const mid = parts[parts.length - 2] ?? "";
    const state = stateCodeFromLabel(mid);
    return {
      street,
      city: state ? parts.slice(1, -2).join(", ") : parts.slice(1, -1).join(", "),
      state,
      zip: zipOnly[1].slice(0, 5),
      county: "",
      country: "US",
    };
  }
  return { ...EMPTY_ADDRESS, street, city: parts[1] ?? "" };
}
