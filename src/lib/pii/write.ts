import { normalizeEin } from "@/lib/wire/match-party";
import { encryptPii, isMaskedInput, piiLookupHash } from "./vault";

export type SsnVaultCols = {
  ssnEnc: string | null;
  ssnIv: string | null;
  ssnLast4: string | null;
};

export type EinVaultCols = {
  ein: null;
  einEnc: string | null;
  einIv: string | null;
  einLast4: string | null;
  einLookup: string | null;
};

export type LicenseVaultCols = {
  licenseNumber: null;
  licenseNumberEnc: string | null;
  licenseNumberIv: string | null;
  licenseNumberLast4: string | null;
};

export function writeSsn(plaintext: string | null | undefined): SsnVaultCols {
  const value = plaintext?.trim() || null;
  if (!value) return { ssnEnc: null, ssnIv: null, ssnLast4: null };
  const sealed = encryptPii(value);
  return { ssnEnc: sealed.enc, ssnIv: sealed.iv, ssnLast4: sealed.last4 };
}

export function writeEin(plaintext: string | null | undefined): EinVaultCols {
  const value = plaintext?.trim() || null;
  if (!value) {
    return { ein: null, einEnc: null, einIv: null, einLast4: null, einLookup: null };
  }
  const sealed = encryptPii(value);
  const normalized = normalizeEin(value) ?? value;
  return {
    ein: null,
    einEnc: sealed.enc,
    einIv: sealed.iv,
    einLast4: sealed.last4,
    einLookup: piiLookupHash(normalized),
  };
}

export function writeLicense(plaintext: string | null | undefined): LicenseVaultCols {
  const value = plaintext?.trim() || null;
  if (!value) {
    return {
      licenseNumber: null,
      licenseNumberEnc: null,
      licenseNumberIv: null,
      licenseNumberLast4: null,
    };
  }
  const sealed = encryptPii(value);
  return {
    licenseNumber: null,
    licenseNumberEnc: sealed.enc,
    licenseNumberIv: sealed.iv,
    licenseNumberLast4: sealed.last4,
  };
}

/** Keep the existing vault unless the form sent a real replacement. */
export function replaceSsn(
  incoming: string | null | undefined,
  existing: SsnVaultCols,
): SsnVaultCols {
  if (isMaskedInput(incoming)) return existing;
  return writeSsn(incoming);
}

export function replaceEin(
  incoming: string | null | undefined,
  existing: EinVaultCols,
): EinVaultCols {
  if (isMaskedInput(incoming)) return existing;
  return writeEin(incoming);
}

export function replaceLicense(
  incoming: string | null | undefined,
  existing: LicenseVaultCols,
): LicenseVaultCols {
  if (isMaskedInput(incoming)) return existing;
  return writeLicense(incoming);
}
