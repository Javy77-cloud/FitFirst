import type { MatchReason } from "@/lib/domain";

export type PersonLike = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  dateOfBirth?: string | Date | null;
  status?: string | null;
  archivedAt?: Date | string | null;
  mergedIntoId?: string | null;
};

const STREET_ABBR: Record<string, string> = {
  street: "st",
  st: "st",
  avenue: "ave",
  ave: "ave",
  boulevard: "blvd",
  blvd: "blvd",
  drive: "dr",
  dr: "dr",
  lane: "ln",
  ln: "ln",
  court: "ct",
  ct: "ct",
  road: "rd",
  rd: "rd",
  place: "pl",
  pl: "pl",
  terrace: "ter",
  ter: "ter",
  circle: "cir",
  cir: "cir",
};

export function blank(value: unknown): boolean {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return String(value).trim() === "";
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (blank(value)) return null;
  return String(value).trim().toLowerCase();
}

export function normalizePhone(value: string | null | undefined): string | null {
  if (blank(value)) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length >= 10 ? digits : digits || null;
}

export function normalizeName(first: string, last: string): string {
  return `${first} ${last}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDob(value: string | Date | null | undefined): string | null {
  if (blank(value)) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const us = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw.toLowerCase();
}

export function normalizeStreet(value: string | null | undefined): string {
  if (blank(value)) return "";
  return String(value)
    .toLowerCase()
    .replace(/[#.,']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => STREET_ABBR[part] ?? part)
    .join(" ");
}

export function normalizeAddress(person: {
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const street = normalizeStreet(person.mailingAddress);
  const city = (person.city ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const state = (person.state ?? "").toLowerCase().trim();
  const zip = (person.zip ?? "").replace(/\D/g, "").slice(0, 5);
  const key = [street, city, state, zip].filter(Boolean).join("|");
  return key.length ? key : null;
}

export function matchReasons(a: PersonLike, b: PersonLike): MatchReason[] {
  const reasons: MatchReason[] = [];
  const emailA = normalizeEmail(a.email);
  const emailB = normalizeEmail(b.email);
  if (emailA && emailB && emailA === emailB) reasons.push("email");

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB) reasons.push("phone");

  const nameA = normalizeName(a.firstName, a.lastName);
  const nameB = normalizeName(b.firstName, b.lastName);
  const sameName = Boolean(nameA && nameB && nameA === nameB);

  const dobA = normalizeDob(a.dateOfBirth);
  const dobB = normalizeDob(b.dateOfBirth);
  if (sameName && dobA && dobB && dobA === dobB) reasons.push("name_dob");

  const addrA = normalizeAddress(a);
  const addrB = normalizeAddress(b);
  if (sameName && addrA && addrB && addrA === addrB) reasons.push("name_address");

  return reasons;
}

export function isRetired(person: PersonLike): boolean {
  return person.status === "archived" || !blank(person.archivedAt) || !blank(person.mergedIntoId);
}

export function pairKey(leftId: string, rightId: string): [string, string] {
  return leftId < rightId ? [leftId, rightId] : [rightId, leftId];
}
