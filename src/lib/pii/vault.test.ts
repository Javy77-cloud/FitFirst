import { afterEach, describe, expect, it } from "vitest";
import { decryptPii, encryptPii, last4Of, maskEin, maskLicense, maskSsn, piiLookupHash } from "./vault";
import { writeEin, writeLicense, writeSsn } from "./write";

const PREV = process.env.PII_ENCRYPTION_KEY;

afterEach(() => {
  if (PREV == null) delete process.env.PII_ENCRYPTION_KEY;
  else process.env.PII_ENCRYPTION_KEY = PREV;
});

describe("pii vault", () => {
  it("round-trips AES-256-GCM and never stores the plaintext on the sealed bag", () => {
    const sealed = encryptPii("123-45-6789");
    expect(sealed.last4).toBe("6789");
    expect(sealed.enc.includes("123")).toBe(false);
    expect(decryptPii(sealed.enc, sealed.iv)).toBe("123-45-6789");
    expect(maskSsn(sealed.last4)).toBe("***-**-6789");
  });

  it("masks EIN and driver license last4", () => {
    expect(maskEin(last4Of("59-1234567"))).toBe("**-***4567");
    expect(maskLicense(last4Of("S400123846180"))).toBe("********6180");
  });

  it("writes EIN/SSN/DL bags without plaintext", () => {
    const ssn = writeSsn("000-00-4444");
    const ein = writeEin("59-1234567");
    const dl = writeLicense("S400123846180");
    expect(ssn.ssnLast4).toBe("4444");
    expect(ein.ein).toBeNull();
    expect(ein.einLast4).toBe("4567");
    expect(ein.einLookup).toBe(piiLookupHash("591234567"));
    expect(dl.licenseNumber).toBeNull();
    expect(dl.licenseNumberLast4).toBe("6180");
    expect(decryptPii(ssn.ssnEnc!, ssn.ssnIv!)).toBe("000-00-4444");
    expect(decryptPii(ein.einEnc!, ein.einIv!)).toBe("59-1234567");
    expect(decryptPii(dl.licenseNumberEnc!, dl.licenseNumberIv!)).toBe("S400123846180");
  });

  it("matches EIN through the lookup hash, not the digits", () => {
    const a = writeEin("59-1234567");
    const b = writeEin("591234567");
    expect(a.einLookup).toBe(b.einLookup);
    expect(a.einLookup).not.toBe("591234567");
  });
});
