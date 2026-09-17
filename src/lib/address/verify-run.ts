import { parseAddressLine } from "./compare";
import { addressIsComplete, type ParsedAddress } from "./types";

export type AddressVerifyAttemptReason = "button" | "blur" | "confirm" | "save";

export type AddressVerifyChip =
  | "idle"
  | "checking"
  | "confirmed"
  | "updated"
  | "suggested"
  | "unmatched"
  | "not_verified"
  | "not_configured"
  | "unreachable"
  | "incomplete";

export type AddressVerifyApiBody = {
  status?: string;
  enabled?: boolean;
  errorKind?: string;
};

/**
 * Quiet FedEx auto-verify is off unless a caller opts in.
 * Javy’s primary path is the explicit Verify address button.
 */
export const ADDRESS_QUIET_VERIFY_DEFAULT = false;

export const ADDRESS_VERIFY_NOT_CONFIGURED = "Verification isn’t set up";
export const ADDRESS_VERIFY_UNREACHABLE = "Couldn’t reach FedEx";
export const ADDRESS_VERIFY_UNMATCHED = "Address not verified";
export const ADDRESS_VERIFY_INCOMPLETE = "Add city, state, and ZIP to verify";

export function shouldAttemptQuietVerify(
  verifyEnabled: boolean | null,
  quietEnabled: boolean = ADDRESS_QUIET_VERIFY_DEFAULT,
): boolean {
  return quietEnabled === true && verifyEnabled !== false;
}

export function shouldSkipQuietVerifyForFingerprint(
  reason: AddressVerifyAttemptReason,
  sig: string,
  lastSig: string,
  status: AddressVerifyChip,
): boolean {
  if (reason === "button") return false;
  if (!sig || sig !== lastSig) return false;
  return (
    status === "confirmed" ||
    status === "updated" ||
    status === "checking" ||
    status === "suggested" ||
    status === "not_verified" ||
    status === "not_configured" ||
    status === "unreachable" ||
    status === "incomplete"
  );
}

export function interpretAddressVerifyResponse(
  data: AddressVerifyApiBody,
  reason: AddressVerifyAttemptReason,
): {
  verifyEnabled: boolean;
  chip: Extract<
    AddressVerifyChip,
    "confirmed" | "suggested" | "not_verified" | "not_configured" | "unreachable" | "incomplete" | "idle"
  >;
} {
  if (data.enabled === false || data.status === "disabled") {
    return {
      verifyEnabled: false,
      chip: reason === "button" ? "not_configured" : "not_verified",
    };
  }
  if (data.status === "error" || data.errorKind === "auth" || data.errorKind === "transport") {
    return {
      verifyEnabled: true,
      chip: reason === "button" ? "unreachable" : "not_verified",
    };
  }
  if (data.status === "verified") return { verifyEnabled: true, chip: "confirmed" };
  if (data.status === "suggested") return { verifyEnabled: true, chip: "suggested" };
  if (data.status === "incomplete") {
    return { verifyEnabled: true, chip: reason === "button" ? "incomplete" : "idle" };
  }
  if (data.status === "unmatched") return { verifyEnabled: true, chip: "not_verified" };
  return { verifyEnabled: true, chip: "not_verified" };
}

function streetsAlign(entered: string, filled: string): boolean {
  const left = entered.trim().toLowerCase();
  const right = filled.trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

/**
 * After a Mapbox pick, city/state/ZIP may live in siblings or only in the
 * last filled structured address. Prefer a complete block so Verify actually
 * POSTs FedEx instead of stamping "not verified" for a filled form.
 */
export function resolveAddressForVerify(input: {
  street: string;
  siblings: Pick<ParsedAddress, "city" | "state" | "zip" | "county" | "country">;
  lastFilled?: ParsedAddress | null;
}): ParsedAddress {
  const street = input.street.trim();
  const fromSiblings: ParsedAddress = {
    street,
    city: input.siblings.city.trim(),
    state: input.siblings.state.trim(),
    zip: input.siblings.zip.trim(),
    county: input.siblings.county.trim(),
    country: input.siblings.country.trim() || "US",
  };
  if (addressIsComplete(fromSiblings)) return fromSiblings;

  const filled = input.lastFilled;
  if (filled && addressIsComplete(filled) && streetsAlign(street || filled.street, filled.street)) {
    return {
      ...filled,
      street: street || filled.street,
      city: fromSiblings.city || filled.city,
      state: fromSiblings.state || filled.state,
      zip: fromSiblings.zip || filled.zip,
      county: fromSiblings.county || filled.county,
      country: fromSiblings.country || filled.country || "US",
    };
  }

  const parsed = parseAddressLine(street);
  return {
    street: fromSiblings.street || parsed.street,
    city: fromSiblings.city || parsed.city,
    state: fromSiblings.state || parsed.state,
    zip: fromSiblings.zip || parsed.zip,
    county: fromSiblings.county || parsed.county,
    country: fromSiblings.country || parsed.country || "US",
  };
}
