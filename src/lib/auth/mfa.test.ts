import { describe, expect, it } from "vitest";
import { mfaStatusLabel, needsMfaEnroll, normalizeMfaMethod } from "./mfa";

describe("MFA enrollment flags", () => {
  it("treats Javy/Maya as enrolled and a new agent as pending", () => {
    expect(mfaStatusLabel({ mfaEnrolled: true, mustEnrollMfa: false })).toBe("Enrolled");
    expect(mfaStatusLabel({ mfaEnrolled: false, mustEnrollMfa: true })).toBe("Pending");
    expect(needsMfaEnroll({ mfaEnrolled: true, mustEnrollMfa: false })).toBe(false);
    expect(needsMfaEnroll({ mfaEnrolled: false, mustEnrollMfa: true })).toBe(true);
    expect(needsMfaEnroll({ mfaEnrolled: true, mustEnrollMfa: true })).toBe(true);
  });

  it("accepts SMS, email, or authenticator", () => {
    expect(normalizeMfaMethod("sms")).toBe("sms");
    expect(normalizeMfaMethod("email")).toBe("email");
    expect(normalizeMfaMethod("authenticator")).toBe("totp");
    expect(normalizeMfaMethod("totp")).toBe("totp");
    expect(normalizeMfaMethod("fax")).toBeNull();
  });
});
