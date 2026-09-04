import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isMaskedSecretInput, maskUsername } from "./vault";

const PREV_CARRIER = process.env.CARRIER_SECRETS_KEY;
const PREV_PII = process.env.PII_ENCRYPTION_KEY;

afterEach(() => {
  if (PREV_CARRIER == null) delete process.env.CARRIER_SECRETS_KEY;
  else process.env.CARRIER_SECRETS_KEY = PREV_CARRIER;
  if (PREV_PII == null) delete process.env.PII_ENCRYPTION_KEY;
  else process.env.PII_ENCRYPTION_KEY = PREV_PII;
});

describe("carrier secrets vault", () => {
  it("round-trips AES-256-GCM and never stores plaintext on the sealed bag", () => {
    const sealed = encryptSecret("AT-portal-demo-2026");
    expect(sealed.enc.includes("AT-portal")).toBe(false);
    expect(sealed.enc.includes("demo-2026")).toBe(false);
    expect(decryptSecret(sealed.enc, sealed.iv)).toBe("AT-portal-demo-2026");
  });

  it("treats empty and bullet masks as keep-existing", () => {
    expect(isMaskedSecretInput("")).toBe(true);
    expect(isMaskedSecretInput("••••••••")).toBe(true);
    expect(isMaskedSecretInput("fi••••mo")).toBe(true);
    expect(isMaskedSecretInput("fitfirst.at.demo")).toBe(false);
  });

  it("masks username without echoing the full login", () => {
    expect(maskUsername("fitfirst.at.demo")).toBe("fi••••mo");
    expect(maskUsername("ab")).toBe("a••••");
  });
});
