import { firstFilled } from "@/lib/desk/copy-once";
import { normalizeStreet } from "@/lib/merge/normalize";
import { formatMailingLine } from "@/lib/deals/package-lines";

export type HeaderAddressParts = {
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export const EMPTY_HEADER_ADDRESS: HeaderAddressParts = {
  address1: "",
  city: "",
  state: "",
  zip: "",
};

export const INSURED_ADDRESS_LABEL = "Insured address";
export const MAILING_ADDRESS_LABEL = "Mailing address";
export const SAME_AS_INSURED_VALUE = "Same as insured address";

type StreetCityStateZip = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

type PartyAddress = {
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

type AccountAddress = PartyAddress & {
  primaryAddress1?: string | null;
  primaryCity?: string | null;
  primaryState?: string | null;
  primaryZip?: string | null;
  mailingSameAsPrimary?: boolean | null;
};

export type DealHeaderAddressSource = {
  stored?: Record<string, string | null | undefined> | null;
  risk?: StreetCityStateZip | null;
  contact?: PartyAddress | null;
  lead?: PartyAddress | null;
  account?: AccountAddress | null;
  /** DP1/DP3: contact/lead home is mailing, not the insured rental. */
  dwellingFire?: boolean;
};

export function isHeaderAddressEmpty(parts: HeaderAddressParts | null | undefined): boolean {
  if (!parts) return true;
  return !formatMailingLine(parts).trim();
}

function normalizeZip(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

function normalizeLocality(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHeaderAddress(parts: HeaderAddressParts | null | undefined): string | null {
  if (!parts) return null;
  const street = normalizeStreet(parts.address1);
  const city = normalizeLocality(parts.city);
  const state = normalizeLocality(parts.state);
  const zip = normalizeZip(parts.zip);
  const key = [street, city, state, zip].filter(Boolean).join("|");
  return key.length ? key : null;
}

function fieldKey(kind: keyof HeaderAddressParts, value: string | null | undefined): string {
  if (kind === "address1") return normalizeStreet(value);
  if (kind === "zip") return normalizeZip(value);
  return normalizeLocality(value);
}

/** True when mailing is empty or every filled mailing part matches insured. */
export function headerAddressesEqual(
  insured: HeaderAddressParts | null | undefined,
  mailing: HeaderAddressParts | null | undefined,
): boolean {
  if (isHeaderAddressEmpty(mailing)) return true;
  const left = insured ?? EMPTY_HEADER_ADDRESS;
  const right = mailing ?? EMPTY_HEADER_ADDRESS;
  const fullA = normalizeHeaderAddress(left);
  const fullB = normalizeHeaderAddress(right);
  if (fullA && fullB && fullA === fullB) return true;

  const keys: Array<keyof HeaderAddressParts> = ["address1", "city", "state", "zip"];
  let compared = 0;
  for (const key of keys) {
    const mailVal = fieldKey(key, right[key]);
    if (!mailVal) continue;
    compared += 1;
    if (mailVal !== fieldKey(key, left[key])) return false;
  }
  return compared > 0;
}

/** True when mailing is a distinct address and should be printed in full. */
export function shouldShowMailingAddress(
  insured: HeaderAddressParts | null | undefined,
  mailing: HeaderAddressParts | null | undefined,
): boolean {
  if (isHeaderAddressEmpty(mailing)) return false;
  return !headerAddressesEqual(insured, mailing);
}

export function mailingHeaderValue(
  insured: HeaderAddressParts | null | undefined,
  mailing: HeaderAddressParts | null | undefined,
): string {
  if (shouldShowMailingAddress(insured, mailing)) {
    return formatHeaderAddress(mailing);
  }
  return SAME_AS_INSURED_VALUE;
}

function partsFrom(
  street: string,
  city: string,
  state: string,
  zip: string,
): HeaderAddressParts {
  return { address1: street, city, state, zip };
}

function accountMailing(account: AccountAddress | null | undefined): HeaderAddressParts {
  if (!account || account.mailingSameAsPrimary !== false) return EMPTY_HEADER_ADDRESS;
  return partsFrom(
    firstFilled(account.mailingAddress),
    firstFilled(account.city),
    firstFilled(account.state),
    firstFilled(account.zip),
  );
}

export function resolveDealHeaderAddresses(input: DealHeaderAddressSource): {
  insured: HeaderAddressParts;
  mailing: HeaderAddressParts;
  showMailing: boolean;
} {
  const stored = input.stored ?? {};
  const accountMail = accountMailing(input.account);
  const dwellingFire = input.dwellingFire === true;

  const insured = dwellingFire
    ? partsFrom(
        firstFilled(stored.mailing_address, input.risk?.address1),
        firstFilled(stored.city, input.risk?.city),
        firstFilled(stored.state, input.risk?.state),
        firstFilled(stored.zip, input.risk?.zip),
      )
    : partsFrom(
        firstFilled(
          stored.mailing_address,
          input.risk?.address1,
          input.contact?.mailingAddress,
          input.lead?.mailingAddress,
          input.account?.primaryAddress1,
        ),
        firstFilled(
          stored.city,
          input.risk?.city,
          input.contact?.city,
          input.lead?.city,
          input.account?.primaryCity,
        ),
        firstFilled(
          stored.state,
          input.risk?.state,
          input.contact?.state,
          input.lead?.state,
          input.account?.primaryState,
        ),
        firstFilled(
          stored.zip,
          input.risk?.zip,
          input.contact?.zip,
          input.lead?.zip,
          input.account?.primaryZip,
        ),
      );

  const mailing = dwellingFire
    ? partsFrom(
        firstFilled(
          stored.contact_mailing_address,
          accountMail.address1,
          input.contact?.mailingAddress,
          input.lead?.mailingAddress,
        ),
        firstFilled(
          stored.contact_mailing_city,
          accountMail.city,
          input.contact?.city,
          input.lead?.city,
        ),
        firstFilled(
          stored.contact_mailing_state,
          accountMail.state,
          input.contact?.state,
          input.lead?.state,
        ),
        firstFilled(
          stored.contact_mailing_zip,
          accountMail.zip,
          input.contact?.zip,
          input.lead?.zip,
        ),
      )
    : partsFrom(
        firstFilled(stored.contact_mailing_address, accountMail.address1),
        firstFilled(stored.contact_mailing_city, accountMail.city),
        firstFilled(stored.contact_mailing_state, accountMail.state),
        firstFilled(stored.contact_mailing_zip, accountMail.zip),
      );

  return {
    insured,
    mailing,
    showMailing: shouldShowMailingAddress(insured, mailing),
  };
}

export function formatHeaderAddress(parts: HeaderAddressParts | null | undefined): string {
  if (!parts) return "";
  return formatMailingLine(parts);
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Last 10 digits so +1 (786) 555-0100 matches 786-555-0100. */
export function normalizePhoneDigits(value: string | null | undefined): string {
  const digits = phoneDigits(String(value ?? ""));
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** One row when primary and secondary normalize to the same number. */
export function uniqueDisplayPhones(
  phones: readonly (string | null | undefined)[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phones) {
    const text = String(raw ?? "").trim();
    if (!text) continue;
    const key = normalizePhoneDigits(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Header DOB is always MM/DD/YYYY. */
export function formatHeaderDob(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
    const mdy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (mdy) return `${pad2(Number(mdy[1]))}/${pad2(Number(mdy[2]))}/${mdy[3]}`;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return "—";
    return `${pad2(parsed.getUTCMonth() + 1)}/${pad2(parsed.getUTCDate())}/${parsed.getUTCFullYear()}`;
  }
  if (Number.isNaN(value.getTime())) return "—";
  if (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    return `${pad2(value.getUTCMonth() + 1)}/${pad2(value.getUTCDate())}/${value.getUTCFullYear()}`;
  }
  return `${pad2(value.getMonth() + 1)}/${pad2(value.getDate())}/${value.getFullYear()}`;
}
