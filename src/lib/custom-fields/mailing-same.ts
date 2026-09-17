export const MAILING_SAME_AS_INSURED_KEY = "mailing_same_as_insured";

export const MAILING_ADDRESS_FIELD_KEYS = [
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
] as const;

export const PREVIOUS_ADDRESS_FIELD_KEYS = [
  "previous_address",
  "previous_city",
  "previous_state",
  "previous_zip",
] as const;

export const LIVED_AT_ADDRESS_5_YEARS_KEY = "lived_at_address_5_years";

const LIVED_AT_ADDRESS_5_YEARS_KEYS = [
  LIVED_AT_ADDRESS_5_YEARS_KEY,
  "lived_at_this_address_5_years",
  "lived_here_5_years",
  "lived_5_years",
] as const;

const PREVIOUS_ADDRESS_KEY_RE =
  /^(previous_|prior_address|prior_city|prior_state|prior_zip|prev_address|prev_city|prev_state|prev_zip)/;

function flagOn(raw: unknown): boolean | null {
  const flag = String(raw ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(flag)) return true;
  if (["false", "0", "no", "off"].includes(flag)) return false;
  return null;
}

export function mailingAddressHasValue(
  stored: Record<string, string | null | undefined> | null | undefined,
): boolean {
  const bag = stored ?? {};
  return MAILING_ADDRESS_FIELD_KEYS.some((key) => String(bag[key] ?? "").trim());
}

/**
 * Checkbox default: same as insured when unset and mailing fields are blank
 * (header already treats empty mailing as same).
 */
export function isMailingSameAsInsured(
  stored: Record<string, string | null | undefined> | null | undefined,
): boolean {
  const bag = stored ?? {};
  const explicit = flagOn(bag[MAILING_SAME_AS_INSURED_KEY]);
  if (explicit !== null) return explicit;
  return !mailingAddressHasValue(bag);
}

export function normalizeMailingSameFlag(raw: unknown): "true" | "false" {
  return flagOn(raw) === false ? "false" : "true";
}

export function livedAtAddress5YearsValue(
  stored: Record<string, string | null | undefined> | string | null | undefined,
): string {
  if (typeof stored === "string" || stored == null) return String(stored ?? "").trim();
  for (const key of LIVED_AT_ADDRESS_5_YEARS_KEYS) {
    const raw = String(stored[key] ?? "").trim();
    if (raw) return raw;
  }
  return "";
}

export function isNoLivedAtAddress5Years(
  stored: Record<string, string | null | undefined> | string | null | undefined,
): boolean {
  const raw = livedAtAddress5YearsValue(stored).toLowerCase();
  return ["no", "false", "0", "n"].includes(raw);
}

/** Previous-address block is only for an explicit No. Yes / blank stay hidden. */
export function shouldShowPreviousAddressFields(
  stored: Record<string, string | null | undefined> | string | null | undefined,
): boolean {
  return isNoLivedAtAddress5Years(stored);
}

export function isPreviousAddressFieldKey(key: string): boolean {
  const normalized = String(key ?? "")
    .trim()
    .toLowerCase();
  if ((PREVIOUS_ADDRESS_FIELD_KEYS as readonly string[]).includes(normalized)) return true;
  return PREVIOUS_ADDRESS_KEY_RE.test(normalized);
}

export function isMailingAddressFieldKey(key: string): boolean {
  return (MAILING_ADDRESS_FIELD_KEYS as readonly string[]).includes(key);
}

export function isMailingAddressSection(section: { id?: string; label?: string } | null | undefined): boolean {
  if (!section) return false;
  return section.id === "mailing_address" || /^mailing address$/i.test(String(section.label ?? "").trim());
}
