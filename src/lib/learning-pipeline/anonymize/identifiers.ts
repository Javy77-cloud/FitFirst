/** HIPAA Safe Harbor 18 identifiers + GLBA nonpublic personal information. */

export const HIPAA_GLBA_IDENTIFIERS = [
  "name",
  "geographic_subdivision",
  "dates_except_year",
  "telephone",
  "fax",
  "email",
  "ssn",
  "medical_record_number",
  "health_plan_beneficiary_number",
  "account_number",
  "certificate_license_number",
  "vehicle_identifier",
  "device_identifier",
  "web_url",
  "ip_address",
  "biometric",
  "full_face_photo",
  "unique_identifying_number",
] as const;

export type HipaaGlbaIdentifier = (typeof HIPAA_GLBA_IDENTIFIERS)[number];

export const PII_FIELD_TYPES = new Set([
  "name",
  "first_name",
  "last_name",
  "full_name",
  "named_insured",
  "applicant",
  "applicant_name",
  "insured_name",
  "contact_name",
  "agent_name",
  "corrected_by",
  "address",
  "street",
  "street_address",
  "mailing_address",
  "city",
  "county",
  "zip",
  "zip_code",
  "postal_code",
  "phone",
  "phone_number",
  "fax",
  "fax_number",
  "email",
  "email_address",
  "ssn",
  "social_security",
  "fein",
  "ein",
  "tax_id",
  "policy_number",
  "account_number",
  "certificate_number",
  "license_number",
  "medical_record_number",
  "beneficiary_number",
  "dob",
  "date_of_birth",
  "birth_date",
  "vin",
  "vehicle_id",
  "device_id",
  "ip_address",
  "url",
  "website",
  "photo",
  "biometric",
]);

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE =
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
const FEIN = /\b\d{2}-\d{7}\b/;
const POLICY = /\b(?:HO3?|AUTO|POL|POLNO|POLICY)[-#]\s*[A-Z0-9]*\d{5,}[A-Z0-9]*\b/i;
const STREET =
  /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+)*\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Way|Circle|Cir\.?|Terrace|Ter\.?)\b/i;
const ZIP4 = /\b\d{5}-\d{4}\b/;
const IP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const URL = /https?:\/\/[^\s]+/i;
const VIN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

export function isPiiFieldType(fieldType: string): boolean {
  return PII_FIELD_TYPES.has(fieldType.trim().toLowerCase());
}

export function looksLikePii(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  return (
    EMAIL.test(raw) ||
    SSN.test(raw) ||
    FEIN.test(raw) ||
    POLICY.test(raw) ||
    STREET.test(raw) ||
    ZIP4.test(raw) ||
    IP.test(raw) ||
    URL.test(raw) ||
    VIN.test(raw) ||
    PHONE.test(raw)
  );
}

export function redactIfPii(fieldType: string, value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (isPiiFieldType(fieldType) || looksLikePii(raw)) return null;
  return raw;
}

export function collectPiiHits(value: unknown, path = ""): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    return looksLikePii(value) ? [path || "(root)"] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectPiiHits(item, `${path}[${i}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      collectPiiHits(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}
