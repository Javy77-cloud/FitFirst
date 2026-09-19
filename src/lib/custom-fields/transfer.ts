import type { ConvertLead } from "@/lib/crm/convert";
import { mergeDealListCascadeSync } from "@/lib/deals/insurance-cascade";
import { canonicalizeSellingAgencyValues } from "@/lib/deals/selling-agency";
import { APPLICANT_CUSTOM_KEYS } from "./applicant-fields";

export const LEAD_CARRY_FIELDS = [
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name" },
  { key: "lastName", label: "Last name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "mailingAddress", label: "Insured Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
  { key: "notes", label: "Notes" },
  { key: "source", label: "Source" },
  { key: "preferredLanguage", label: "Language" },
  { key: "status", label: "Status" },
  { key: "temperature", label: "Temperature" },
  { key: "insuranceTypeDesired", label: "Insurance desired" },
] as const;

export type LeadCarryKey = (typeof LEAD_CARRY_FIELDS)[number]["key"];

export const LEAD_CARRY_KEYS = LEAD_CARRY_FIELDS.map((field) => field.key);

export function parseCarryFields(raw: unknown): LeadCarryKey[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const allowed = new Set<string>(LEAD_CARRY_KEYS);
  return list.map((item) => String(item)).filter((key): key is LeadCarryKey => allowed.has(key));
}

export function parseCarryFieldsFromForm(form: FormData): LeadCarryKey[] | null {
  if (!form.has("carryField") && !form.has("carryFields") && !form.has("carrySelective")) return null;
  const many = [...form.getAll("carryField"), ...form.getAll("carryFields")].flatMap((value) =>
    String(value).split(","),
  );
  return parseCarryFields(many);
}

/** Blank unselected lead fields so convert only copies what the agent checked. */
export function filterLeadForCarry(
  lead: ConvertLead,
  carry: readonly string[] | null | undefined,
): ConvertLead {
  if (carry == null) return lead;
  const allowed = new Set(carry);
  const pick = <T,>(key: LeadCarryKey, value: T, empty: T): T => (allowed.has(key) ? value : empty);
  return {
    ...lead,
    firstName: pick("firstName", lead.firstName ?? "", ""),
    middleName: pick("middleName", lead.middleName ?? null, null),
    lastName: pick("lastName", lead.lastName, allowed.has("lastName") ? lead.lastName : ""),
    dateOfBirth: pick("dateOfBirth", lead.dateOfBirth ?? null, null),
    email: pick("email", lead.email ?? null, null),
    phone: pick("phone", lead.phone ?? null, null),
    mailingAddress: pick("mailingAddress", lead.mailingAddress ?? null, null),
    city: pick("city", lead.city ?? null, null),
    state: pick("state", lead.state ?? null, null),
    zip: pick("zip", lead.zip ?? null, null),
    notes: pick("notes", lead.notes ?? null, null),
    source: pick("source", lead.source ?? null, null),
    preferredLanguage: pick("preferredLanguage", lead.preferredLanguage ?? null, null),
    status: pick("status", (lead as { status?: string | null }).status ?? null, null),
    temperature: pick("temperature", (lead as { temperature?: string | null }).temperature ?? null, null),
    insuranceTypeDesired: pick(
      "insuranceTypeDesired",
      lead.insuranceTypeDesired ?? null,
      null,
    ),
  };
}

const SYSTEM_TO_CARRY: Record<string, LeadCarryKey> = {
  firstName: "firstName",
  middleName: "middleName",
  lastName: "lastName",
  dateOfBirth: "dateOfBirth",
  email: "email",
  phone: "phone",
  mailingAddress: "mailingAddress",
  city: "city",
  state: "state",
  zip: "zip",
  notes: "notes",
  source: "source",
  preferredLanguage: "preferredLanguage",
  status: "status",
  temperature: "temperature",
  insuranceTypeDesired: "insuranceTypeDesired",
  primaryNamedInsured: "firstName",
};

export function systemValueFromLead(
  lead: ConvertLead,
  systemKey: string | null | undefined,
  carry?: readonly string[] | null,
): string {
  if (!systemKey) return "";
  const carryKey = SYSTEM_TO_CARRY[systemKey];
  if (carry && carryKey && !carry.includes(carryKey)) return "";
  const filtered = filterLeadForCarry(lead, carry ?? null);
  if (systemKey === "primaryNamedInsured") {
    return [filtered.firstName, filtered.middleName, filtered.lastName]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(" ");
  }
  const value = (filtered as Record<string, unknown>)[systemKey];
  return value == null ? "" : String(value);
}

/** Lead keys that land on matching deal field keys (catalog + native). */
export const LEAD_TO_DEAL_FIELD_KEYS: Array<{ key: string; systemKey: string }> = [
  { key: "first_name", systemKey: "firstName" },
  { key: "middle_name", systemKey: "middleName" },
  { key: "last_name", systemKey: "lastName" },
  { key: "email", systemKey: "email" },
  { key: "phone", systemKey: "phone" },
  { key: "date_of_birth", systemKey: "dateOfBirth" },
  { key: "mailing_address", systemKey: "mailingAddress" },
  { key: "city", systemKey: "city" },
  { key: "state", systemKey: "state" },
  { key: "zip", systemKey: "zip" },
  { key: "notes", systemKey: "notes" },
  { key: "named_insured", systemKey: "primaryNamedInsured" },
  { key: "source", systemKey: "source" },
  { key: "preferred_language", systemKey: "preferredLanguage" },
  { key: "status", systemKey: "status" },
  { key: "temperature", systemKey: "temperature" },
  { key: "insurance_type_desired", systemKey: "insuranceTypeDesired" },
];

/** Custom-field keys that copy Lead → Deal by the same field key (no native column). */
export const LEAD_TO_DEAL_CUSTOM_KEYS = [
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
  "pipeline",
  "insurance_type",
  "insurance_category",
  "insurance_subtype",
  "picklist_yp0c",
  ...APPLICANT_CUSTOM_KEYS,
  "co_applicant_first_name",
  "co_applicant_last_name",
  "co_applicant_email",
  "co_applicant_phone",
  "co_applicant_dob",
  "co_applicant_relationship_to_insured",
  "co_applicant_gender",
  "co_applicant_marital_status",
  "co_applicant_industry",
  "co_applicant_occupation",
  "co_applicant_education_level",
  "co_applicant_middle_name",
  "co_applicant_military_discount",
] as const;

export function dealValuesFromLead(
  lead: ConvertLead,
  fields: ReadonlyArray<{ key: string; systemKey?: string | null }>,
  carry?: readonly string[] | null,
  leadCustom?: Record<string, string> | null,
): Record<string, string> {
  const filtered = filterLeadForCarry(lead, carry);
  const values: Record<string, string> = {};

  for (const field of fields) {
    const systemKey =
      field.systemKey || LEAD_TO_DEAL_FIELD_KEYS.find((row) => row.key === field.key)?.systemKey;
    const value = systemValueFromLead(filtered, systemKey, carry);
    if (value) values[field.key] = value;
  }

  for (const row of LEAD_TO_DEAL_FIELD_KEYS) {
    if (values[row.key]) continue;
    const value = systemValueFromLead(filtered, row.systemKey, carry);
    if (value) values[row.key] = value;
  }

  if (leadCustom) {
    for (const key of LEAD_TO_DEAL_CUSTOM_KEYS) {
      const raw = (leadCustom[key] ?? "").trim();
      if (raw && !values[key]) values[key] = raw;
    }
    // Same layout keys Lead ↔ Deal: copy any filled lead custom value the deal catalog knows.
    for (const field of fields) {
      const raw = (leadCustom[field.key] ?? "").trim();
      if (raw && !values[field.key]) values[field.key] = raw;
    }
  }

  return canonicalizeSellingAgencyValues(mergeDealListCascadeSync(values));
}

