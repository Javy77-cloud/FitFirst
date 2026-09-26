import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { firstFilled } from "@/lib/desk/copy-once";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";

function cellBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

/**
 * Home / MHO / HO3 / Flood — where Fill copies an address.
 *
 * Deal Details keys (UI labels):
 * - `mailing_address` = Insured Address (the risk / property location)
 * - `contact_mailing_address` = Mailing Address (only when it is a different place)
 *
 * Risk Profile:
 * - Property address (`address1`, plus `property_address` when that key exists) is the
 *   location property + flood APIs geocode.
 * - Mailing (`mailing_address`) is filled only when a mailing street differs from that
 *   property street. Same location, blank mailing, or "same as insured" stays blank.
 *   Do not copy the property street onto mailing.
 *
 * Property street, first filled:
 * 1. Risk row `address1` (already a located risk)
 * 2. Deal Details insured address (`mailing_address` + city/state/zip)
 * 3. Deal Details mailing (`contact_mailing_address`) when property is still empty
 *    — confirmed mailing is the only location (Catherine / liability-only)
 * 4. Contact or lead mailing when property is still empty
 */

export type HomeAddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

export type HomeMailingParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type HomeMailingReason = "distinct" | "same_as_property" | "blank";

export type ResolvedHomeAddresses = {
  property: HomeAddressParts;
  mailing: HomeMailingParts;
  mailingReason: HomeMailingReason;
};

type PartyAddress = {
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type HomeAddressDealInput = {
  propertyOneliner?: string | null;
  stored?: Record<string, string | null | undefined>;
  risk?: {
    address1?: string | null;
    city?: string | null;
    county?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  contact?: PartyAddress | null;
  lead?: PartyAddress | null;
  /**
   * DP1/DP3: the contact/lead home is mailing, never a stand-in for the rental.
   * HO3 and other products keep the party-home fallback.
   */
  dwellingFire?: boolean;
  /** Other products' risk streets. Fill must not copy them onto this sheet's mailing. */
  excludeMailingStreets?: readonly (string | null | undefined)[];
};

function compactStreet(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** True when two printed addresses are the same location (street contained either way). */
export function streetsAreSameLocation(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = compactStreet(String(a ?? ""));
  const right = compactStreet(String(b ?? ""));
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function parts(
  street: string,
  city: string,
  state: string,
  zip: string,
  county = "",
): HomeAddressParts {
  return { street, city, state, zip, county };
}

export function resolveHomeRiskAddresses(input: HomeAddressDealInput): ResolvedHomeAddresses {
  const stored = input.stored ?? {};
  const riskStreet = firstFilled(input.risk?.address1);
  const insuredStreet = firstFilled(
    stored.mailing_address,
    (input.propertyOneliner ?? "").split("·")[0],
  );
  const detailsMail = firstFilled(stored.contact_mailing_address);
  const partyMail = firstFilled(input.contact?.mailingAddress, input.lead?.mailingAddress);

  let property = parts("", "", "", "");
  let propertyKind: "risk" | "insured" | "details_mailing" | "party" | "" = "";

  if (riskStreet) {
    propertyKind = "risk";
    property = parts(
      riskStreet,
      firstFilled(input.risk?.city, stored.city),
      firstFilled(input.risk?.state, stored.state),
      firstFilled(input.risk?.zip, stored.zip),
      firstFilled(input.risk?.county, stored.county, stored.contact_mailing_county),
    );
  } else if (insuredStreet) {
    propertyKind = "insured";
    property = input.dwellingFire
      ? parts(
          insuredStreet,
          firstFilled(stored.city),
          firstFilled(stored.state),
          firstFilled(stored.zip),
          firstFilled(stored.county, input.risk?.county),
        )
      : parts(
          insuredStreet,
          firstFilled(stored.city, input.contact?.city, input.lead?.city),
          firstFilled(stored.state, input.contact?.state, input.lead?.state),
          firstFilled(stored.zip, input.contact?.zip, input.lead?.zip),
          firstFilled(stored.county, stored.contact_mailing_county, input.risk?.county),
        );
  } else if (detailsMail && !input.dwellingFire) {
    propertyKind = "details_mailing";
    property = parts(
      detailsMail,
      firstFilled(stored.contact_mailing_city, stored.city, input.contact?.city),
      firstFilled(stored.contact_mailing_state, stored.state, input.contact?.state),
      firstFilled(stored.contact_mailing_zip, stored.zip, input.contact?.zip),
      firstFilled(stored.contact_mailing_county, stored.county, input.risk?.county),
    );
  } else if (partyMail && !input.dwellingFire) {
    propertyKind = "party";
    property = parts(
      partyMail,
      firstFilled(input.contact?.city, input.lead?.city, stored.city),
      firstFilled(input.contact?.state, input.lead?.state, stored.state),
      firstFilled(input.contact?.zip, input.lead?.zip, stored.zip),
      firstFilled(stored.county, input.risk?.county),
    );
  }

  const mailingCandidates: HomeMailingParts[] = [];
  if (detailsMail && propertyKind !== "details_mailing") {
    mailingCandidates.push({
      street: detailsMail,
      city: firstFilled(stored.contact_mailing_city),
      state: firstFilled(stored.contact_mailing_state),
      zip: firstFilled(stored.contact_mailing_zip),
    });
  }
  if (insuredStreet && propertyKind === "risk") {
    mailingCandidates.push({
      street: insuredStreet,
      city: firstFilled(stored.city),
      state: firstFilled(stored.state),
      zip: firstFilled(stored.zip),
    });
  }
  if (partyMail && propertyKind !== "party") {
    mailingCandidates.push({
      street: partyMail,
      city: firstFilled(input.contact?.city, input.lead?.city),
      state: firstFilled(input.contact?.state, input.lead?.state),
      zip: firstFilled(input.contact?.zip, input.lead?.zip),
    });
  }

  const blocked = input.excludeMailingStreets ?? [];
  const distinct = mailingCandidates.find(
    (row) =>
      row.street &&
      !streetsAreSameLocation(row.street, property.street) &&
      !blocked.some((street) => streetsAreSameLocation(row.street, street)),
  );
  const mailing = distinct ?? { street: "", city: "", state: "", zip: "" };
  const mailingReason: HomeMailingReason = distinct
    ? "distinct"
    : property.street
      ? "same_as_property"
      : "blank";

  return { property, mailing, mailingReason };
}

/** MHO / MH quoting form. Not MDP (that sheet product is renters). */
export function quotingFormIsManufacturedHome(
  ...ids: Array<string | null | undefined>
): boolean {
  return ids.some((id) => {
    const compact = String(id ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return (
      compact === "MHO" ||
      compact === "MMHO" ||
      compact === "MH" ||
      compact === "MOBILEHOME" ||
      compact === "MOBILEHOMEOWNERS" ||
      compact === "MANUFACTUREDHOME" ||
      compact === "MANUFACTUREDHOMEOWNERS"
    );
  });
}

export function propertyOneLiner(property: HomeAddressParts): string {
  const locality = [property.city, [property.state, property.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [property.street, locality].filter(Boolean).join(", ");
}

/**
 * Home Risk Profile mailing is one line (no separate mailing city cell).
 * Keep the street when it shares the property city. Include city/state/zip when
 * the mailing city is a different place (Rosa: Miami vs Fort Myers).
 */
export function mailingSheetLine(mailing: HomeMailingParts, property: HomeAddressParts): string {
  const city = mailing.city.trim().toLowerCase();
  const propertyCity = property.city.trim().toLowerCase();
  if (!city || city === propertyCity) return mailing.street;
  return propertyOneLiner({ ...mailing, county: "" });
}

const BLANK_CELL: QuoteSheetFieldValue = { value: "", status: "missing", source: "blank" };

/**
 * Property address empty and mailing is the only location: move it onto property
 * and clear mailing unless an agent locked that cell.
 * Distinct mailing (property already filled) is left alone.
 */
export function moveSoleSheetMailingToProperty(
  existing: Record<string, QuoteSheetFieldValue>,
  opts?: { dwellingFire?: boolean },
): { values: Record<string, QuoteSheetFieldValue>; filledKeys: string[] } {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  // DP1/DP3 mailing is the owner's home. Do not move it onto the rental.
  if (opts?.dwellingFire) return { values, filledKeys };
  const propertyStreet = firstFilled(values.address1?.value, values.property_address?.value);
  const mailing = values.mailing_address;
  const mailStreet = (mailing?.value ?? "").trim();
  if (propertyStreet || !mailStreet) return { values, filledKeys };
  if (isLockedSheetField(values.address1)) return { values, filledKeys };

  const copyFrom = (key: string, fallback?: QuoteSheetFieldValue) => {
    const cell = values[key];
    if (!cellBlank(cell) || !fallback || cellBlank(fallback)) return;
    values[key] = { ...fallback };
    filledKeys.push(key);
  };

  values.address1 = { ...mailing };
  filledKeys.push("address1");
  copyFrom("city", values.mailing_city);
  copyFrom("state", values.mailing_state);
  copyFrom("zip", values.mailing_zip);
  if (
    Object.prototype.hasOwnProperty.call(values, "property_address") &&
    cellBlank(values.property_address)
  ) {
    values.property_address = { ...mailing };
    filledKeys.push("property_address");
  }
  if (!isLockedSheetField(mailing)) {
    values.mailing_address = { ...BLANK_CELL };
  }
  return { values, filledKeys };
}
