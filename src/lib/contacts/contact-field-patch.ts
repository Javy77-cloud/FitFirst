/** Pure helpers for contact blur-save field patches. */

export const CONTACT_SYSTEM_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "mailingAddress",
  "city",
  "state",
  "zip",
  "dateOfBirth",
  "maritalStatus",
  "preferredLanguage",
  "notes",
  "lifeNotes",
  "healthNotes",
  "source",
  "clientStatus",
] as const;

export type ContactSystemColumn = (typeof CONTACT_SYSTEM_COLUMNS)[number];

const FIELD_KEY_TO_SYSTEM: Record<string, ContactSystemColumn> = {
  first_name: "firstName",
  firstName: "firstName",
  last_name: "lastName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  mailing_address: "mailingAddress",
  mailingAddress: "mailingAddress",
  city: "city",
  state: "state",
  zip: "zip",
  date_of_birth: "dateOfBirth",
  dateOfBirth: "dateOfBirth",
  marital_status: "maritalStatus",
  maritalStatus: "maritalStatus",
  preferred_language: "preferredLanguage",
  preferredLanguage: "preferredLanguage",
  notes: "notes",
  life_notes: "lifeNotes",
  lifeNotes: "lifeNotes",
  health_notes: "healthNotes",
  healthNotes: "healthNotes",
  source: "source",
  client_status: "clientStatus",
  clientStatus: "clientStatus",
};

/** Map catalog / camel field key → contacts table column, if any. */
export function systemColumnForFieldKey(fieldKey: string): ContactSystemColumn | null {
  return FIELD_KEY_TO_SYSTEM[fieldKey] ?? null;
}

/** Normalize catalog field key for custom-value storage. */
export function customFieldKeyFor(fieldKey: string): string {
  const system = systemColumnForFieldKey(fieldKey);
  if (!system) return fieldKey;
  const reverse: Record<ContactSystemColumn, string> = {
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    phone: "phone",
    mailingAddress: "mailing_address",
    city: "city",
    state: "state",
    zip: "zip",
    dateOfBirth: "date_of_birth",
    maritalStatus: "marital_status",
    preferredLanguage: "preferred_language",
    notes: "notes",
    lifeNotes: "life_notes",
    healthNotes: "health_notes",
    source: "source",
    clientStatus: "client_status",
  };
  return reverse[system];
}

export function isContactSystemColumn(key: string): key is ContactSystemColumn {
  return (CONTACT_SYSTEM_COLUMNS as readonly string[]).includes(key);
}
