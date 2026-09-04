export type LeadIdentity = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  insuranceTypeDesired?: string | null;
};

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v || null;
}

/** Last 10 digits so +1 / punctuation still match. */
export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function namesMatch(a: LeadIdentity, b: LeadIdentity): boolean {
  return (
    normalizeName(a.firstName) === normalizeName(b.firstName) &&
    normalizeName(a.lastName) === normalizeName(b.lastName)
  );
}

/**
 * Match when name + (phone or email) are present on both sides.
 * Name-only is never a match — that would duplicate or collide.
 */
export function isSameLead(existing: LeadIdentity, incoming: LeadIdentity): boolean {
  if (!namesMatch(existing, incoming)) return false;
  const incomingEmail = normalizeEmail(incoming.email);
  const incomingPhone = normalizePhone(incoming.phone);
  if (incomingEmail && incomingEmail === normalizeEmail(existing.email)) return true;
  if (incomingPhone && incomingPhone === normalizePhone(existing.phone)) return true;
  return false;
}

export function splitNamedInsured(raw: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "Lead" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Lead" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseLeadFromPacket(text: string): LeadIdentity & { notes: string } {
  const named =
    /(?:named\s*insured|insured\s*name|applicant)\s*[:#]\s*([a-z][a-z .'-]+)/i.exec(text)?.[1] ??
    "";
  const { firstName, lastName } = splitNamedInsured(named);
  const email = /(?:e-?mail)\s*[:#]\s*(\S+@\S+)/i.exec(text)?.[1] ?? null;
  const phone =
    /(?:phone|mobile|cell)\s*[:#]\s*([+()0-9. -]{7,})/i.exec(text)?.[1] ?? null;
  return {
    firstName: firstName || "Unknown",
    lastName: lastName || "Lead",
    email,
    phone: phone?.trim() ?? null,
    notes: "Created from a dropped source packet (dec / wind mit / 4-point / inspection).",
  };
}
