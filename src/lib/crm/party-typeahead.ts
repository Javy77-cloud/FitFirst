import { formatPersonName } from "@/lib/crm/display";

export type PartyKind = "contact" | "business";

/** Compact Contact or Business row for Deal Name typeahead. All name fields are optional — Zoho imports leave blanks. */
export type PartyRecord = {
  kind: PartyKind;
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  legalName?: string | null;
  dba?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  partyName?: string | null;
};

export type PartyHit = {
  kind: PartyKind;
  id: string;
  title: string;
  subtitle: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Case-fold and drop apostrophes so Javy / O'Brien still contains-match. */
export function foldPartyQuery(value: string | null | undefined): string {
  return asText(value)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function phoneDigits(value: string | null | undefined): string {
  return asText(value).replace(/\D/g, "");
}

export function partyDisplayName(row: PartyRecord): string {
  if (row.kind === "business") {
    return asText(row.name) || asText(row.legalName) || asText(row.dba) || asText(row.partyName) || "Business";
  }
  const formatted = formatPersonName({
    firstName: asText(row.firstName) || null,
    lastName: asText(row.lastName) || null,
  });
  if (formatted !== "—") return formatted;
  return asText(row.partyName) || asText(row.name) || asText(row.title) || "Contact";
}

export function partyHaystack(row: PartyRecord): string {
  const parts = [
    row.firstName,
    row.lastName,
    row.name,
    row.legalName,
    row.dba,
    row.email,
    row.phone,
    row.title,
    row.partyName,
    phoneDigits(row.phone),
  ]
    .map((part) => foldPartyQuery(part))
    .filter(Boolean);
  return parts.join(" ");
}

export function matchesPartyQuery(query: string, row: PartyRecord): boolean {
  const q = foldPartyQuery(query);
  if (!q) return false;
  const hay = partyHaystack(row);
  if (hay.includes(q)) return true;
  const digits = phoneDigits(query);
  if (digits.length >= 3) {
    const phone = phoneDigits(row.phone);
    if (phone && phone.includes(digits)) return true;
  }
  return false;
}

export function splitTypedPartyName(query: string): { firstName: string; lastName: string } {
  const text = asText(query);
  if (!text) return { firstName: "", lastName: "" };
  if (text.includes(",")) {
    const [last, ...rest] = text.split(",");
    return { firstName: asText(rest.join(" ")), lastName: asText(last) };
  }
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function subtitleFor(row: PartyRecord): string {
  const email = asText(row.email);
  const phone = asText(row.phone);
  const bits = [email, phone].filter(Boolean);
  if (row.kind === "business") {
    return bits.length ? `Business · ${bits.join(" · ")}` : "Business";
  }
  return bits.length ? `Contact · ${bits.join(" · ")}` : "Contact";
}

export function toPartyHit(row: PartyRecord): PartyHit {
  const title = partyDisplayName(row);
  const split = splitTypedPartyName(title);
  return {
    kind: row.kind,
    id: row.id,
    title,
    subtitle: subtitleFor(row),
    firstName: asText(row.firstName) || split.firstName,
    lastName: asText(row.lastName) || (row.kind === "business" ? asText(row.name) || split.lastName : split.lastName),
    email: asText(row.email) || null,
    phone: asText(row.phone) || null,
  };
}

function rankPartyHits(hits: PartyHit[], query: string): PartyHit[] {
  const q = foldPartyQuery(query);
  return [...hits].sort((a, b) => {
    const aTitle = foldPartyQuery(a.title);
    const bTitle = foldPartyQuery(b.title);
    const aExact = aTitle === q ? 0 : aTitle.startsWith(q) ? 1 : aTitle.includes(q) ? 2 : 3;
    const bExact = bTitle === q ? 0 : bTitle.startsWith(q) ? 1 : bTitle.includes(q) ? 2 : 3;
    if (aExact !== bExact) return aExact - bExact;
    if (a.kind !== b.kind) return a.kind === "contact" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** Contains, case-insensitive, live typeahead. Empty query returns no rows — keep typing. */
export function suggestParties(rows: PartyRecord[], query: string, limit = 12): PartyHit[] {
  const q = foldPartyQuery(query);
  if (!q) return [];
  const hits = rows.filter((row) => matchesPartyQuery(query, row)).map(toPartyHit);
  return rankPartyHits(hits, query).slice(0, limit);
}
