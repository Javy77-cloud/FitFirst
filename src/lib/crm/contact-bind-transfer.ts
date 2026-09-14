import {
  CO_APPLICANT_TO_CONTACT_FIELD_MAP,
  DEAL_TO_CONTACT_FIELD_MAP,
} from "@/lib/contacts/contact-field-catalog";
import { isCoApplicantEnabled } from "@/lib/custom-fields/co-applicant-fields";

function blank(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

function emptyOnlyMapped(
  map: Record<string, string>,
  existing: Record<string, string>,
  incoming: Record<string, string | null | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [fromKey, toKey] of Object.entries(map)) {
    const next = String(incoming[fromKey] ?? "").trim();
    if (!next) continue;
    const cur = existing[toKey];
    if (!blank(cur)) continue;
    out[toKey] = next;
  }
  return out;
}

/**
 * Empty-only merge: never overwrite a filled Contact value with Deal/Lead data.
 * Maps deal/lead layout keys onto contact keys via DEAL_TO_CONTACT_FIELD_MAP.
 */
export function emptyOnlyContactValues(
  existing: Record<string, string>,
  incoming: Record<string, string | null | undefined>,
): Record<string, string> {
  return emptyOnlyMapped(DEAL_TO_CONTACT_FIELD_MAP, existing, incoming);
}

/** Co-applicant deal keys → second contact field keys (empty-only). */
export function emptyOnlyCoApplicantContactValues(
  existing: Record<string, string>,
  incoming: Record<string, string | null | undefined>,
): Record<string, string> {
  return emptyOnlyMapped(CO_APPLICANT_TO_CONTACT_FIELD_MAP, existing, incoming);
}

/** True when deal/lead payload has any co-applicant identity to spawn/link. */
export function hasCoApplicantIdentity(
  incoming: Record<string, string | null | undefined>,
): boolean {
  if (!isCoApplicantEnabled(incoming)) return false;
  const first = String(incoming.co_applicant_first_name ?? "").trim();
  const last = String(incoming.co_applicant_last_name ?? "").trim();
  return Boolean(first || last);
}

/** System columns on contacts table from mapped keys. */
export function contactSystemPatchFromValues(values: Record<string, string>) {
  const patch: Record<string, string | undefined> = {
    firstName: values.first_name,
    lastName: values.last_name,
    email: values.email,
    phone: values.phone,
    dateOfBirth: values.date_of_birth,
    mailingAddress: values.mailing_address,
    city: values.city,
    state: values.state,
    zip: values.zip,
    maritalStatus: values.marital_status,
    preferredLanguage: values.preferred_language,
    lifeNotes: values.life_notes,
    healthNotes: values.health_notes,
    notes: values.notes,
    source: values.source,
  };
  return Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v != null && String(v).trim() !== ""),
  ) as Record<string, string>;
}

/** Custom (non-system) contact keys from an empty-only patch. */
export function contactCustomPatchFromValues(values: Record<string, string>): Record<string, string> {
  const system = new Set([
    "first_name",
    "last_name",
    "email",
    "phone",
    "date_of_birth",
    "mailing_address",
    "city",
    "state",
    "zip",
    "marital_status",
    "preferred_language",
    "life_notes",
    "health_notes",
    "notes",
    "source",
    "client_status",
  ]);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (system.has(key)) continue;
    if (!String(value ?? "").trim()) continue;
    out[key] = value;
  }
  return out;
}
