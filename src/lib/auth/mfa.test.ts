import { describe, expect, it } from "vitest";
import {
  hashOpaque,
  isMfaChallengePath,
  isMfaMethod,
  isMfaSetupPath,
  mfaDemoBypassEnabled,
  mfaStatusLabel,
  needsMfaEnroll,
  newRecoveryToken,
  newStubCode,
  normalizeMfaMethod,
  opaqueMatches,
  resolveMfaStatus,
  userSkipsMfaChallenge,
} from "./mfa";

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

describe("MFA helpers", () => {
  it("treats javy/maya seed flags as enrolled + bypass when the demo flag is on", () => {
    expect(mfaDemoBypassEnabled()).toBe(true);
    expect(userSkipsMfaChallenge({ mfaEnrolled: true, mfaDemoBypass: true })).toBe(true);
    expect(userSkipsMfaChallenge({ mfaEnrolled: false, mfaDemoBypass: true })).toBe(false);
    expect(resolveMfaStatus({ mfaEnrolled: true, mfaDemoBypass: true }, "challenge")).toBe("ok");
  });

  it("gates unenrolled users and honors a challenge cookie", () => {
    expect(resolveMfaStatus({ mfaEnrolled: false, mfaDemoBypass: false }, undefined)).toBe(
      "pending",
    );
    expect(resolveMfaStatus({ mfaEnrolled: false, mfaDemoBypass: false }, "ok")).toBe("pending");
    expect(resolveMfaStatus({ mfaEnrolled: true, mfaDemoBypass: false }, "challenge")).toBe(
      "challenge",
    );
    expect(resolveMfaStatus({ mfaEnrolled: true, mfaDemoBypass: false }, undefined)).toBe("ok");
  });

  it("hashes stub codes and recovery tokens", () => {
    const code = newStubCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(opaqueMatches(code, hashOpaque(code))).toBe(true);
    expect(opaqueMatches("000000", hashOpaque(code))).toBe(false);
    const token = newRecoveryToken();
    expect(token.token).toHaveLength(48);
    expect(opaqueMatches(token.token, token.hash)).toBe(true);
  });

  it("recognizes enroll and challenge paths", () => {
    expect(isMfaMethod("totp")).toBe(true);
    expect(isMfaMethod("voice")).toBe(false);
    expect(isMfaSetupPath("/enroll-mfa")).toBe(true);
    expect(isMfaSetupPath("/settings/security")).toBe(true);
    expect(isMfaSetupPath("/me")).toBe(true);
    expect(isMfaSetupPath("/pipeline")).toBe(false);
    expect(isMfaChallengePath("/login/mfa")).toBe(true);
    expect(isMfaChallengePath("/login")).toBe(false);
  });
});
