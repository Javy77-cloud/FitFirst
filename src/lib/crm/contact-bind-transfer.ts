import {
  CO_APPLICANT_TO_CONTACT_FIELD_MAP,
  DEAL_TO_CONTACT_FIELD_MAP,
} from "@/lib/contacts/contact-field-catalog";
import { dobFromDealSources } from "@/lib/contacts/dob-sync";
import { isCoApplicantEnabled } from "@/lib/custom-fields/co-applicant-fields";
import {
  isPrimaryResidence,
  resolveInsuredPropertyKind,
  type InsuredPropertyKind,
} from "@/lib/deals/insured-property-kind";
import { firstFilled } from "@/lib/desk/copy-once";

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
  _opts?: { propertyKind?: InsuredPropertyKind | null },
): Record<string, string> {
  // Address gating belongs in incomingContactValuesFromDeal so a lead home
  // address still copies when the insured location is rental / secondary.
  return emptyOnlyMapped(DEAL_TO_CONTACT_FIELD_MAP, existing, incoming);
}

function sheetStr(
  sheet: Record<string, { value?: unknown } | string | null | undefined> | undefined,
  key: string,
): string {
  const cell = sheet?.[key];
  if (cell == null) return "";
  if (typeof cell === "string") return cell.trim();
  return String((cell as { value?: unknown }).value ?? "").trim();
}

/** Build deal→contact incoming values. Deal custom DOB wins over empty lead/sheet. */
export function incomingContactValuesFromDeal(opts: {
  dealCustom?: Record<string, string | null | undefined> | null;
  leadCustom?: Record<string, string | null | undefined> | null;
  lead?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfBirth?: string | null;
    source?: string | null;
    preferredLanguage?: string | null;
    lifeNotes?: string | null;
    healthNotes?: string | null;
    notes?: string | null;
  } | null;
  sheetValues?: Record<string, { value?: unknown } | string | null | undefined> | null;
  risk?: { address1?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null;
  dealSource?: string | null;
  product?: string | null;
  quotingForm?: string | null;
}): { incoming: Record<string, string | null | undefined>; propertyKind: InsuredPropertyKind | null } {
  const dealCustom = opts.dealCustom ?? {};
  const leadCustom = opts.leadCustom ?? {};
  const dob = dobFromDealSources({
    dealValues: dealCustom,
    leadDob: opts.lead?.dateOfBirth,
    sheetValues: opts.sheetValues,
  });
  const propertyKind = resolveInsuredPropertyKind({
    stored: dealCustom.insured_property_kind,
    product: opts.product,
    quotingForm: opts.quotingForm,
    sheetUsage: sheetStr(opts.sheetValues ?? undefined, "usage") || String(dealCustom.usage ?? ""),
    occupancy: String(dealCustom.occupancy ?? ""),
  });
  const copyHome = isPrimaryResidence(propertyKind);
  const incoming: Record<string, string | null | undefined> = {
    ...leadCustom,
    ...dealCustom,
    first_name: firstFilled(dealCustom.first_name, opts.lead?.firstName, sheetStr(opts.sheetValues ?? undefined, "first_name")),
    middle_name: firstFilled(dealCustom.middle_name, opts.lead?.middleName, sheetStr(opts.sheetValues ?? undefined, "middle_name")),
    last_name: firstFilled(dealCustom.last_name, opts.lead?.lastName, sheetStr(opts.sheetValues ?? undefined, "last_name")),
    email: firstFilled(dealCustom.email, opts.lead?.email, sheetStr(opts.sheetValues ?? undefined, "email")),
    phone: firstFilled(dealCustom.phone, opts.lead?.phone, sheetStr(opts.sheetValues ?? undefined, "phone")),
    date_of_birth: dob ?? "",
    preferred_language: firstFilled(dealCustom.preferred_language, opts.lead?.preferredLanguage),
    life_notes: firstFilled(dealCustom.life_notes, opts.lead?.lifeNotes),
    health_notes: firstFilled(dealCustom.health_notes, opts.lead?.healthNotes),
    notes: firstFilled(dealCustom.notes, opts.lead?.notes),
    source: firstFilled(opts.dealSource, opts.lead?.source),
  };
  if (copyHome) {
    incoming.mailing_address = firstFilled(
      dealCustom.mailing_address,
      opts.risk?.address1,
      opts.lead?.mailingAddress,
      sheetStr(opts.sheetValues ?? undefined, "mailing_address"),
    );
    incoming.city = firstFilled(dealCustom.city, opts.risk?.city, opts.lead?.city, sheetStr(opts.sheetValues ?? undefined, "city"));
    incoming.state = firstFilled(dealCustom.state, opts.risk?.state, opts.lead?.state, sheetStr(opts.sheetValues ?? undefined, "state"));
    incoming.zip = firstFilled(dealCustom.zip, opts.risk?.zip, opts.lead?.zip, sheetStr(opts.sheetValues ?? undefined, "zip"));
  } else {
    incoming.mailing_address = firstFilled(opts.lead?.mailingAddress);
    incoming.city = firstFilled(opts.lead?.city);
    incoming.state = firstFilled(opts.lead?.state);
    incoming.zip = firstFilled(opts.lead?.zip);
  }
  return { incoming, propertyKind };
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
