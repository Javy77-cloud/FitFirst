import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  namesMatch,
  type LeadIdentity,
} from "@/lib/lifecycle/lead-match";
import { formatPersonName } from "@/lib/crm/display";

export type ExistingContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type ContactMatchReason = "email" | "phone" | "name";

export type ContactMatch = {
  contact: ExistingContactRow;
  reason: ContactMatchReason;
};

/** Incoming identity from New Lead / New Deal layout fields. */
export type IncomingPartyIdentity = LeadIdentity & {
  middleName?: string | null;
};

export function identityFromLayoutFields(get: (key: string) => string): IncomingPartyIdentity {
  return {
    firstName: get("first_name") || get("firstName") || "",
    middleName: get("middle_name") || get("middleName") || null,
    lastName: get("last_name") || get("lastName") || "",
    email: get("email") || null,
    phone: get("phone") || null,
  };
}

function middleOk(a: IncomingPartyIdentity, b: ExistingContactRow): boolean {
  const aMid = normalizeName(a.middleName);
  const bMid = normalizeName(b.middleName);
  if (aMid && bMid && aMid !== bMid) return false;
  return true;
}

/**
 * Prefer email, then phone, then full name (first + last; middle must agree when both set).
 * Name-only still pops the confirm so the agent can link or decline — never silent merge.
 */
export function findExistingContactMatch(
  contacts: readonly ExistingContactRow[],
  incoming: IncomingPartyIdentity,
): ContactMatch | null {
  const email = normalizeEmail(incoming.email);
  const phone = normalizePhone(incoming.phone);
  const hasName =
    Boolean(normalizeName(incoming.firstName)) && Boolean(normalizeName(incoming.lastName));

  if (email) {
    const hit = contacts.find((row) => normalizeEmail(row.email) === email);
    if (hit) return { contact: hit, reason: "email" };
  }
  if (phone) {
    const hit = contacts.find((row) => normalizePhone(row.phone) === phone);
    if (hit) return { contact: hit, reason: "phone" };
  }
  if (hasName) {
    const hit = contacts.find(
      (row) => namesMatch(row, incoming) && middleOk(incoming, row),
    );
    if (hit) return { contact: hit, reason: "name" };
  }
  return null;
}

export function contactMatchLabel(match: ContactMatch): string {
  const name = formatPersonName(match.contact);
  const bits = [name];
  if (match.contact.email) bits.push(match.contact.email);
  if (match.contact.phone) bits.push(match.contact.phone);
  return bits.filter(Boolean).join(" · ");
}

export function contactMatchReasonText(reason: ContactMatchReason): string {
  if (reason === "email") return "matching email";
  if (reason === "phone") return "matching phone";
  return "matching name";
}

/** Empty-only fill map for layout field_* keys when the agent links. */
export function contactPrefillForLayout(contact: ExistingContactRow): Record<string, string> {
  return {
    first_name: contact.firstName ?? "",
    last_name: contact.lastName ?? "",
    middle_name: contact.middleName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mailing_address: contact.mailingAddress ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    zip: contact.zip ?? "",
    named_insured: formatPersonName(contact),
  };
}
