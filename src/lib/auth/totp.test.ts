import { describe, expect, it } from "vitest";
import { DEMO_JAVY_TOTP_SECRET, hotp, otpauthUri, totpAt, verifyTotp } from "./totp";

describe("TOTP", () => {
  it("matches RFC 6238 SHA-1 vector at counter 1", () => {
    // Secret "12345678901234567890" in base32 is GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    expect(hotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1)).toBe("287082");
  });

  it("verifies the current code and rejects a wrong one", () => {
    const at = new Date("2026-09-04T16:00:00.000Z");
    const code = totpAt(DEMO_JAVY_TOTP_SECRET, at);
    expect(code).toHaveLength(6);
    expect(verifyTotp(DEMO_JAVY_TOTP_SECRET, code, at)).toBe(true);
    expect(verifyTotp(DEMO_JAVY_TOTP_SECRET, "000000", at)).toBe(false);
  });

  it("builds an otpauth URI for the QR stub", () => {
    const uri = otpauthUri({ secret: DEMO_JAVY_TOTP_SECRET, account: "javy@fitfirst.local" });
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("javy");
  });
});
