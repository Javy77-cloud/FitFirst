import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { COUNTY_PA_LABEL, type PropertyFillAddress } from "../types";

export type FetchLike = typeof fetch;

export function pushFact(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value || sheetKey === "coverage_a") return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: COUNTY_PA_LABEL,
    kind: "county",
  });
}

export function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export function isFlorida(state: string): boolean {
  const s = state.trim().toUpperCase();
  return !s || s === "FL" || s === "FLORIDA";
}

export function countyAliasMatches(county: string, aliases: string[]): boolean {
  const c = county.trim().toLowerCase();
  if (!c) return true;
  return aliases.some((alias) => c === alias || c.includes(alias));
}

export function compactAddress1(address: PropertyFillAddress): string | null {
  const raw = (address.address1 ?? "").trim().toUpperCase();
  if (!raw) return null;
  return raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

export function parseHouseStreet(address: PropertyFillAddress): {
  compact: string;
  num: string;
  street: string;
} | null {
  const compact = compactAddress1(address);
  if (!compact) return null;
  const parts = compact.split(" ");
  if (parts.length < 2) return { compact, num: parts[0] ?? "", street: "" };
  return { compact, num: parts[0]!, street: parts.slice(1).join(" ") };
}

const STREET_SKIP = new Set([
  "N",
  "S",
  "E",
  "W",
  "NE",
  "NW",
  "SE",
  "SW",
  "ST",
  "STREET",
  "AVE",
  "AVENUE",
  "RD",
  "ROAD",
  "DR",
  "DRIVE",
  "LN",
  "LANE",
  "BLVD",
  "BOULEVARD",
  "CT",
  "COURT",
  "CIR",
  "CIRCLE",
  "WAY",
  "PL",
  "PLACE",
  "TER",
  "TERRACE",
  "HWY",
  "HIGHWAY",
  "PKWY",
  "PARKWAY",
  "TRL",
  "TRAIL",
  "US",
  "FL",
  "THE",
  "OF",
]);

/** First meaningful street token for split-field county layers. */
export function streetSearchToken(street: string): string {
  const parts = street
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = parts.filter((p) => !STREET_SKIP.has(p));
  return meaningful[0] || parts[0] || "";
}

export function likeContains(field: string, value: string): string {
  return `UPPER(${field}) LIKE '%${escapeSql(value.toUpperCase())}%'`;
}

/** Drop year_built / counts that are literally zero (vacant / unknown). */
export function skipZero(value: string): string {
  if (!value) return "";
  const n = Number(value);
  if (Number.isFinite(n) && n === 0) return "";
  return value;
}

export function combineBaths(full: string, half: string): string {
  if (!full && !half) return "";
  const f = Number(full);
  const h = Number(half);
  if (Number.isFinite(f) && Number.isFinite(h) && h > 0) return String(f + h * 0.5);
  return full;
}

export function garageFromBays(raw: string): string {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return "garage";
  return "";
}

export function homesteadFromAmount(raw: string): string {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return "yes";
  return "";
}
