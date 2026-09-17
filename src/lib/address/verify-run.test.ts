import { describe, expect, it } from "vitest";
import {
  ADDRESS_QUIET_VERIFY_DEFAULT,
  ADDRESS_VERIFY_INCOMPLETE,
  ADDRESS_VERIFY_NOT_CONFIGURED,
  ADDRESS_VERIFY_UNMATCHED,
  ADDRESS_VERIFY_UNREACHABLE,
  interpretAddressVerifyResponse,
  resolveAddressForVerify,
  shouldAttemptQuietVerify,
  shouldSkipQuietVerifyForFingerprint,
} from "./verify-run";

const HARBOR = {
  street: "412 Harbor Isle Dr",
  city: "Melbourne",
  state: "FL",
  zip: "32935",
  county: "Brevard",
  country: "US",
};

describe("FedEx verify attempt rules", () => {
  it("keeps quiet auto off by default — only the button runs FedEx", () => {
    expect(ADDRESS_QUIET_VERIFY_DEFAULT).toBe(false);
    expect(shouldAttemptQuietVerify(null)).toBe(false);
    expect(shouldAttemptQuietVerify(true)).toBe(false);
    expect(shouldAttemptQuietVerify(false)).toBe(false);
    expect(shouldAttemptQuietVerify(true, true)).toBe(true);
    expect(shouldAttemptQuietVerify(null, true)).toBe(true);
    expect(shouldAttemptQuietVerify(false, true)).toBe(false);
  });

  it("never skips a manual Verify click on the same fingerprint", () => {
    expect(shouldSkipQuietVerifyForFingerprint("button", "a", "a", "confirmed")).toBe(false);
    expect(shouldSkipQuietVerifyForFingerprint("blur", "a", "a", "confirmed")).toBe(true);
    expect(shouldSkipQuietVerifyForFingerprint("blur", "b", "a", "confirmed")).toBe(false);
    expect(shouldSkipQuietVerifyForFingerprint("save", "a", "a", "idle")).toBe(false);
    expect(shouldSkipQuietVerifyForFingerprint("blur", "a", "a", "not_verified")).toBe(true);
  });

  it("stamps confirmed / suggested, and is honest when FedEx is off, unreachable, or unmatched", () => {
    expect(interpretAddressVerifyResponse({ status: "verified", enabled: true }, "button")).toEqual({
      verifyEnabled: true,
      chip: "confirmed",
    });
    expect(interpretAddressVerifyResponse({ status: "suggested", enabled: true }, "button")).toEqual({
      verifyEnabled: true,
      chip: "suggested",
    });
    expect(interpretAddressVerifyResponse({ status: "disabled", enabled: false }, "button")).toEqual({
      verifyEnabled: false,
      chip: "not_configured",
    });
    expect(interpretAddressVerifyResponse({ enabled: false }, "button")).toEqual({
      verifyEnabled: false,
      chip: "not_configured",
    });
    expect(interpretAddressVerifyResponse({ enabled: false }, "blur")).toEqual({
      verifyEnabled: false,
      chip: "not_verified",
    });
    expect(interpretAddressVerifyResponse({ status: "error", enabled: false }, "button")).toEqual({
      verifyEnabled: false,
      chip: "not_configured",
    });
    expect(interpretAddressVerifyResponse({ status: "error", enabled: true }, "button")).toEqual({
      verifyEnabled: true,
      chip: "unreachable",
    });
    expect(interpretAddressVerifyResponse({ status: "error", enabled: true, errorKind: "auth" }, "button")).toEqual({
      verifyEnabled: true,
      chip: "unreachable",
    });
    expect(interpretAddressVerifyResponse({ status: "unmatched", enabled: true }, "button")).toEqual({
      verifyEnabled: true,
      chip: "not_verified",
    });
    expect(interpretAddressVerifyResponse({ status: "incomplete", enabled: true }, "button")).toEqual({
      verifyEnabled: true,
      chip: "incomplete",
    });
    expect(ADDRESS_VERIFY_NOT_CONFIGURED).toBe("Verification isn’t set up");
    expect(ADDRESS_VERIFY_UNREACHABLE).toBe("Couldn’t reach FedEx");
    expect(ADDRESS_VERIFY_UNMATCHED).toBe("Address not verified");
    expect(ADDRESS_VERIFY_INCOMPLETE).toBe("Add city, state, and ZIP to verify");
  });

  it("uses a Mapbox fill when siblings are not readable yet", () => {
    expect(
      resolveAddressForVerify({
        street: "412 Harbor Isle Dr",
        siblings: { city: "", state: "", zip: "", county: "", country: "US" },
        lastFilled: HARBOR,
      }),
    ).toEqual(HARBOR);
    expect(
      resolveAddressForVerify({
        street: "412 Harbor Isle Dr",
        siblings: { city: "Melbourne", state: "FL", zip: "32935", county: "Brevard", country: "US" },
        lastFilled: null,
      }),
    ).toMatchObject({ city: "Melbourne", state: "FL", zip: "32935" });
  });
});
