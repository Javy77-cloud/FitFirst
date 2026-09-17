export type AddressVerifyAttemptReason = "button" | "blur" | "confirm" | "save";

export type AddressVerifyChip =
  | "idle"
  | "checking"
  | "confirmed"
  | "updated"
  | "suggested"
  | "unmatched"
  | "not_verified"
  | "not_configured";

export type AddressVerifyApiBody = {
  status?: string;
  enabled?: boolean;
};

/**
 * Quiet FedEx auto-verify is off unless a caller opts in.
 * Javy’s primary path is the explicit Verify address button.
 */
export const ADDRESS_QUIET_VERIFY_DEFAULT = false;

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
    status === "not_configured"
  );
}

export function interpretAddressVerifyResponse(
  data: AddressVerifyApiBody,
  reason: AddressVerifyAttemptReason,
): {
  verifyEnabled: boolean;
  chip: Extract<AddressVerifyChip, "confirmed" | "suggested" | "not_verified" | "not_configured" | "idle">;
} {
  if (data.enabled === false || data.status === "disabled") {
    return {
      verifyEnabled: false,
      chip: reason === "button" ? "not_configured" : "not_verified",
    };
  }
  if (data.status === "verified") return { verifyEnabled: true, chip: "confirmed" };
  if (data.status === "suggested") return { verifyEnabled: true, chip: "suggested" };
  if (data.status === "incomplete") return { verifyEnabled: true, chip: "idle" };
  return { verifyEnabled: true, chip: "not_verified" };
}

export const ADDRESS_VERIFY_NOT_CONFIGURED = "Verification isn’t set up";
