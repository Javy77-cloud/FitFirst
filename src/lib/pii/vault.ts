import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/** 32-byte local Mac demo key (hex). Override with PII_ENCRYPTION_KEY in .env. */
export const LOCAL_PII_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type SealedPii = {
  enc: string;
  iv: string;
  last4: string;
};

function resolveKeyBytes(): Buffer {
  const raw = (process.env.PII_ENCRYPTION_KEY ?? "").trim() || LOCAL_PII_KEY_HEX;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const fromB64 = Buffer.from(raw, "base64");
    if (fromB64.length === 32) return fromB64;
  } catch {
    /* fall through */
  }
  throw new Error("PII_ENCRYPTION_KEY must be 32 bytes as 64 hex chars or base64.");
}

export function last4Of(value: string): string {
  const digits = value.replace(/\D/g, "");
  const source = digits.length >= 4 ? digits : value.replace(/\s+/g, "");
  return source.slice(-4);
}

export function maskSsn(last4: string): string {
  return `***-**-${last4}`;
}

export function maskEin(last4: string): string {
  return `**-***${last4}`;
}

export function maskLicense(last4: string): string {
  return `********${last4}`;
}

export function isMaskedInput(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  return !raw || raw.includes("*");
}

export function encryptPii(plaintext: string): SealedPii {
  const value = plaintext.trim();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, resolveKeyBytes(), iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: Buffer.concat([ct, tag]).toString("base64"),
    iv: iv.toString("base64"),
    last4: last4Of(value),
  };
}

export function decryptPii(enc: string, iv: string): string {
  const buf = Buffer.from(enc, "base64");
  if (buf.length < TAG_BYTES) throw new Error("Invalid ciphertext");
  const ct = buf.subarray(0, -TAG_BYTES);
  const tag = buf.subarray(-TAG_BYTES);
  const decipher = createDecipheriv(ALG, resolveKeyBytes(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function piiLookupHash(normalized: string): string {
  return createHmac("sha256", resolveKeyBytes()).update(normalized).digest("hex");
}

export function maskForField(field: "ssn" | "ein" | "license_number", last4: string | null | undefined): string | null {
  if (!last4) return null;
  if (field === "ssn") return maskSsn(last4);
  if (field === "ein") return maskEin(last4);
  return maskLicense(last4);
}

export function einMaskFromRow(row: { einLast4?: string | null; ein?: string | null }): string | null {
  if (row.einLast4) return maskEin(row.einLast4);
  if (row.ein) return maskEin(last4Of(row.ein));
  return null;
}

export function ssnMaskFromRow(row: { ssnLast4?: string | null }): string | null {
  return row.ssnLast4 ? maskSsn(row.ssnLast4) : null;
}

export function licenseMaskFromRow(row: {
  licenseNumberLast4?: string | null;
  licenseNumber?: string | null;
}): string | null {
  if (row.licenseNumberLast4) return maskLicense(row.licenseNumberLast4);
  if (row.licenseNumber) return maskLicense(last4Of(row.licenseNumber));
  return null;
}
