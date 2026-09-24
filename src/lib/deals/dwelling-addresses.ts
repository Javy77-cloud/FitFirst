import { isMailingSameAsInsured } from "@/lib/custom-fields/mailing-same";
import { headerAddressesEqual } from "@/lib/deals/header-addresses";
import { firstFilled } from "@/lib/desk/copy-once";
import { streetsAreSameLocation } from "@/lib/quote-sheet/home-address-fill";

/**
 * DP1 / DP3 (dwelling fire / landlord) keep two addresses on the deal:
 * - Insured address = the rental / premises (quoting + policy premises)
 * - Mailing address = the owner's home
 *
 * Stored on existing deal custom keys (no new columns):
 * - insured: `mailing_address` + city / state / zip, and the risk row
 * - mailing: `contact_mailing_*`
 * - `mailing_same_as_insured` is the existing same-as toggle
 */

export const DWELLING_INSURED_ADDRESS_LABEL = "Insured address (rental property)";
export const DWELLING_MAILING_ADDRESS_LABEL = "Mailing address (owner)";

export type DwellingAddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export const EMPTY_DWELLING_ADDRESS: DwellingAddressParts = {
  street: "",
  city: "",
  state: "",
  zip: "",
};

const DWELLING_FIRE_IDS = new Set(["DP1", "DP3", "LANDLORD", "DWELLINGFIRE"]);

export function isDwellingFireProduct(...ids: Array<string | null | undefined>): boolean {
  return ids.some((id) => {
    const compact = String(id ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return DWELLING_FIRE_IDS.has(compact);
  });
}

export function dwellingDetailsSectionLabel(
  section: { id?: string; label?: string } | null | undefined,
  dwellingFire: boolean,
): string {
  const label = String(section?.label ?? "");
  if (!dwellingFire || !section) return label;
  const id = String(section.id ?? "");
  if (id === "insured_address" || /^insured address$/i.test(label.trim())) {
    return DWELLING_INSURED_ADDRESS_LABEL;
  }
  if (id === "mailing_address" || /^mailing address$/i.test(label.trim())) {
    return DWELLING_MAILING_ADDRESS_LABEL;
  }
  return label;
}

/** Deal Details street labels. City / state / ZIP stay as they are. */
export function dwellingDetailsFieldLabel(key: string, dwellingFire: boolean, fallback: string): string {
  if (!dwellingFire) return fallback;
  if (key === "mailing_address") return DWELLING_INSURED_ADDRESS_LABEL;
  if (key === "contact_mailing_address") return DWELLING_MAILING_ADDRESS_LABEL;
  return fallback;
}

/** Risk Profile street labels. HO3 keeps "Property address". */
export function dwellingRiskFieldLabel(key: string, dwellingFire: boolean, fallback: string): string {
  if (!dwellingFire) return fallback;
  if (key === "address1" || key === "property_address") return DWELLING_INSURED_ADDRESS_LABEL;
  if (key === "mailing_address") return DWELLING_MAILING_ADDRESS_LABEL;
  return fallback;
}

function part(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function dwellingParts(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): DwellingAddressParts {
  return { street: part(street), city: part(city), state: part(state), zip: part(zip) };
}

function sameStreet(left: string, right: string): boolean {
  return Boolean(left && right && streetsAreSameLocation(left, right));
}

function flagTrue(raw: string | null | undefined): boolean {
  return ["true", "1", "yes", "on"].includes(part(raw).toLowerCase());
}

/**
 * Going-forward seed for a new DP1/DP3 deal.
 * Contact / lead home prefills mailing. It does not become the insured (rental) address.
 * An insured street that is only a copy of that home is cleared unless the agent
 * explicitly checked "mailing same as insured".
 */
export function seedDwellingFireAddresses(input: {
  insured?: Partial<DwellingAddressParts> | null;
  mailing?: Partial<DwellingAddressParts> | null;
  partyHome?: Partial<DwellingAddressParts> | null;
  sameFlag?: string | null;
}): {
  insured: DwellingAddressParts;
  mailing: DwellingAddressParts;
  sameFlag: "true" | "false";
  custom: Record<string, string>;
} {
  const insuredIn = dwellingParts(input.insured?.street, input.insured?.city, input.insured?.state, input.insured?.zip);
  const mailingIn = dwellingParts(input.mailing?.street, input.mailing?.city, input.mailing?.state, input.mailing?.zip);
  const party = dwellingParts(
    input.partyHome?.street,
    input.partyHome?.city,
    input.partyHome?.state,
    input.partyHome?.zip,
  );
  const explicitSame = flagTrue(input.sameFlag);

  let mailing = mailingIn.street ? mailingIn : party.street ? party : EMPTY_DWELLING_ADDRESS;
  let insured = insuredIn;
  const insuredIsHome = sameStreet(insured.street, party.street);
  if (!explicitSame && insuredIsHome && (!mailingIn.street || sameStreet(mailing.street, insured.street))) {
    insured = EMPTY_DWELLING_ADDRESS;
  }

  let sameFlag: "true" | "false";
  if (explicitSame && insured.street) {
    sameFlag = "true";
    if (!mailing.street) mailing = insured;
  } else if (insured.street && mailing.street && sameStreet(insured.street, mailing.street)) {
    sameFlag = "true";
  } else if (mailing.street) {
    sameFlag = "false";
  } else {
    sameFlag = "true";
  }

  const custom: Record<string, string> = {
    mailing_address: insured.street,
    city: insured.city,
    state: insured.state,
    zip: insured.zip,
    mailing_same_as_insured: sameFlag,
  };
  if (mailing.street || mailingIn.street) {
    custom.contact_mailing_address = mailing.street;
    custom.contact_mailing_city = mailing.city;
    custom.contact_mailing_state = mailing.state;
    custom.contact_mailing_zip = mailing.zip;
  }
  return { insured, mailing, sameFlag, custom };
}

type SheetAddressCell = {
  value: string;
  status: "confirmed" | "missing";
  source: "agent" | "blank";
};

/** Quote-sheet cells: property = insured rental, mailing = owner home. */
export function dwellingSheetAddressCells(seed: {
  insured: DwellingAddressParts;
  mailing: DwellingAddressParts;
}): Record<string, SheetAddressCell> {
  const cell = (value: string): SheetAddressCell =>
    value
      ? { value, status: "confirmed", source: "agent" }
      : { value: "", status: "missing", source: "blank" };
  return {
    address1: cell(seed.insured.street),
    city: cell(seed.insured.city),
    state: cell(seed.insured.state),
    zip: cell(seed.insured.zip),
    mailing_address: cell(seed.mailing.street),
    mailing_city: cell(seed.mailing.city),
    mailing_state: cell(seed.mailing.state),
    mailing_zip: cell(seed.mailing.zip),
  };
}

export function dwellingAddressLine(parts: DwellingAddressParts | null | undefined): string {
  if (!parts?.street && !parts?.city && !parts?.zip) return "";
  const locality = [parts.city, [parts.state, parts.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [parts.street, locality].filter(Boolean).join(", ");
}

/**
 * Bind / mint split. Premises is the insured rental only — never the owner's home
 * standing in for an empty rental. Mailing is the owner address when the deal has one.
 */
export function dwellingPolicyAddresses(input: {
  stored?: Record<string, string | null | undefined> | null;
  risk?: { address1?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null;
  partyHome?: {
    mailingAddress?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
}): {
  premises: DwellingAddressParts;
  mailing: DwellingAddressParts;
  insuredSameAsMailing: boolean;
} {
  const stored = input.stored ?? {};
  const premises = dwellingParts(
    firstFilled(stored.mailing_address, input.risk?.address1),
    firstFilled(stored.city, input.risk?.city),
    firstFilled(stored.state, input.risk?.state),
    firstFilled(stored.zip, input.risk?.zip),
  );
  const explicitMail = dwellingParts(
    stored.contact_mailing_address,
    stored.contact_mailing_city,
    stored.contact_mailing_state,
    stored.contact_mailing_zip,
  );
  const party = dwellingParts(
    input.partyHome?.street || input.partyHome?.mailingAddress,
    input.partyHome?.city,
    input.partyHome?.state,
    input.partyHome?.zip,
  );
  const same = isMailingSameAsInsured(stored);
  let mailing = explicitMail.street ? explicitMail : same && premises.street ? premises : party;
  if (!mailing.street && premises.street && same) mailing = premises;
  const insuredSameAsMailing = premises.street
    ? headerAddressesEqual(
        { address1: premises.street, city: premises.city, state: premises.state, zip: premises.zip },
        { address1: mailing.street, city: mailing.city, state: mailing.state, zip: mailing.zip },
      )
    : false;
  return { premises, mailing, insuredSameAsMailing };
}
