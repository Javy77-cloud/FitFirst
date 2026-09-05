import type { QuoteSheetFieldValue } from "@/lib/domain";
import { emptySheetValues, isSheetBlank } from "@/lib/lifecycle/quote-sheet";

/** First non-empty value the desk already has. Never invent. */
export function firstFilled(...values: Array<string | number | null | undefined>): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

export type AddressFields = {
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type LeadCopyFields = AddressFields & {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  source?: string | null;
  preferredLanguage?: string | null;
};

/** Lead mailing → Deal risk. Convert does not ask the agent to retype. */
export function leadOntoRisk(lead: LeadCopyFields, fallbackState = "FL") {
  return {
    address1: lead.mailingAddress?.trim() || null,
    city: lead.city?.trim() || null,
    state: lead.state?.trim() || fallbackState,
    zip: lead.zip?.trim() || null,
  };
}

/** Fill blank Quote Sheet cells from the Lead. Confirmed cells stay put. */
export function fillSheetFromLead(
  lead: LeadCopyFields,
  existing?: Record<string, QuoteSheetFieldValue>,
): Record<string, QuoteSheetFieldValue> {
  const values = { ...(existing ?? emptySheetValues()) };
  const put = (key: string, raw?: string | null) => {
    const value = (raw ?? "").trim();
    if (!value || !isSheetBlank(values[key])) return;
    values[key] = { value, status: "confirmed", source: "agent" };
  };
  put("address1", lead.mailingAddress);
  put("mailing_address", lead.mailingAddress);
  put("city", lead.city);
  put("state", lead.state);
  put("zip", lead.zip);
  const named = [lead.firstName, lead.middleName, lead.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  put("named_insured", named);
  const noteBits = [
    lead.notes?.trim(),
    lead.email ? `Email ${lead.email}` : "",
    lead.phone ? `Phone ${lead.phone}` : "",
    lead.dateOfBirth ? `DOB ${lead.dateOfBirth}` : "",
    lead.preferredLanguage ? `Language ${lead.preferredLanguage}` : "",
  ].filter(Boolean);
  if (noteBits.length) put("notes", noteBits.join(" · "));
  return values;
}

/** Fill only blank Contact / Business fields. Never overwrite a value already on the record. */
export function fillBlankParty<T extends AddressFields & { phone?: string | null; email?: string | null; dateOfBirth?: string | null }>(
  existing: T,
  incoming: LeadCopyFields,
): T {
  return {
    ...existing,
    mailingAddress: existing.mailingAddress || incoming.mailingAddress || null,
    city: existing.city || incoming.city || null,
    state: existing.state || incoming.state || null,
    zip: existing.zip || incoming.zip || null,
    phone: existing.phone || incoming.phone || null,
    email: existing.email || incoming.email || null,
    dateOfBirth: existing.dateOfBirth || incoming.dateOfBirth || null,
  };
}
