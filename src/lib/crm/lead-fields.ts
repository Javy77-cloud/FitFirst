import { LINES, type LineOfBusiness } from "@/lib/domain";
import { normalizeRecordSource } from "@/lib/crm/sources";

export { LEAD_SOURCES, sourceLabel } from "@/lib/crm/sources";

export const LEAD_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "ht", label: "Haitian Creole" },
] as const;

export type LeadFormValues = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  insuranceTypeDesired: string | null;
  source: string | null;
  preferredLanguage: string | null;
  notes: string | null;
};

const emptyToNull = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
};

export function insuranceTypeFromForm(value: string | null | undefined): LineOfBusiness | null {
  const raw = (value ?? "").trim();
  return (LINES as readonly string[]).includes(raw) ? (raw as LineOfBusiness) : null;
}

export function leadValuesFromForm(form: FormData): LeadFormValues {
  return {
    firstName: String(form.get("firstName") ?? "").trim() || "Unknown",
    middleName: emptyToNull(String(form.get("middleName") ?? "")),
    lastName: String(form.get("lastName") ?? "").trim() || "Lead",
    dateOfBirth: emptyToNull(String(form.get("dateOfBirth") ?? "")),
    email: emptyToNull(String(form.get("email") ?? "")),
    phone: emptyToNull(String(form.get("phone") ?? "")),
    mailingAddress: emptyToNull(String(form.get("mailingAddress") ?? "")),
    city: emptyToNull(String(form.get("city") ?? "")),
    state: emptyToNull(String(form.get("state") ?? "")),
    zip: emptyToNull(String(form.get("zip") ?? "")),
    insuranceTypeDesired: insuranceTypeFromForm(String(form.get("insuranceTypeDesired") ?? "")),
    source: normalizeRecordSource(String(form.get("source") ?? "")),
    preferredLanguage: emptyToNull(String(form.get("preferredLanguage") ?? "")),
    notes: emptyToNull(String(form.get("notes") ?? "")),
  };
}

export function namedInsuredFromLead(lead: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}): string {
  return [lead.firstName, lead.middleName, lead.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}
