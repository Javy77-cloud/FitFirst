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
  status: string | null;
  temperature: string | null;
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

function formStr(form: FormData, ...names: string[]) {
  for (const name of names) {
    const value = String(form.get(name) ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function leadValuesFromForm(form: FormData): LeadFormValues {
  return {
    firstName: formStr(form, "firstName", "field_first_name") || "Unknown",
    middleName: emptyToNull(formStr(form, "middleName", "field_middle_name")),
    lastName: formStr(form, "lastName", "field_last_name") || "Lead",
    dateOfBirth: emptyToNull(formStr(form, "dateOfBirth", "field_date_of_birth")),
    email: emptyToNull(formStr(form, "email", "field_email")),
    phone: emptyToNull(formStr(form, "phone", "field_phone")),
    mailingAddress: emptyToNull(formStr(form, "mailingAddress", "field_mailing_address")),
    city: emptyToNull(formStr(form, "city", "field_city")),
    state: emptyToNull(formStr(form, "state", "field_state")),
    zip: emptyToNull(formStr(form, "zip", "field_zip")),
    insuranceTypeDesired: insuranceTypeFromForm(formStr(form, "insuranceTypeDesired", "field_insurance_type_desired")),
    source: normalizeRecordSource(formStr(form, "source", "field_source")),
    preferredLanguage: emptyToNull(formStr(form, "preferredLanguage", "field_preferred_language")),
    status: emptyToNull(formStr(form, "status", "field_status")),
    temperature: emptyToNull(formStr(form, "temperature", "field_temperature")),
    notes: emptyToNull(formStr(form, "notes", "field_notes")),
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
