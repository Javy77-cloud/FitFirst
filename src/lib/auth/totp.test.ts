import { describe, expect, it } from "vitest";
import { SEED_TOTP_SECRET, totpAt, verifyTotp, otpauthUri, generateTotpSecret } from "./totp";

describe("TOTP", () => {
  it("verifies a code at the current step and rejects a wrong code", () => {
    const now = Date.parse("2026-09-04T14:00:00.000Z");
    const code = totpAt(SEED_TOTP_SECRET, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(SEED_TOTP_SECRET, code, now)).toBe(true);
    expect(verifyTotp(SEED_TOTP_SECRET, "000000", now)).toBe(false);
  });

  it("accepts an adjacent 30-second window", () => {
    const now = Date.parse("2026-09-04T14:00:15.000Z");
    const previous = totpAt(SEED_TOTP_SECRET, now - 30_000);
    expect(verifyTotp(SEED_TOTP_SECRET, previous, now)).toBe(true);
  });

  it("builds an otpauth URI and a new secret", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    const uri = otpauthUri(SEED_TOTP_SECRET, "javy@fitfirst.local");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("FitFirst");
  });
});
