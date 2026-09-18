import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** 32-byte local Mac demo key (hex). Override with CARRIER_SECRETS_KEY or PII_ENCRYPTION_KEY. */
export const LOCAL_SECRETS_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type SealedSecret = {
  enc: string;
  iv: string;
};

function keyBytesFromRaw(raw: string): Buffer | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  try {
    const fromB64 = Buffer.from(value, "base64");
    if (fromB64.length === 32) return fromB64;
  } catch {
    /* ignore */
  }
  return null;
}

function resolveKeyBytes(): Buffer {
  const raw =
    (process.env.CARRIER_SECRETS_KEY ?? "").trim() ||
    (process.env.PII_ENCRYPTION_KEY ?? "").trim() ||
    LOCAL_SECRETS_KEY_HEX;
  const bytes = keyBytesFromRaw(raw);
  if (bytes) return bytes;
  throw new Error("CARRIER_SECRETS_KEY / PII_ENCRYPTION_KEY must be 32 bytes as 64 hex chars or base64.");
}

/** All AES keys this process might have used historically (carrier, then PII, then local demo). */
export function listSecretKeyCandidates(): Buffer[] {
  const seen = new Set<string>();
  const keys: Buffer[] = [];
  for (const raw of [
    (process.env.CARRIER_SECRETS_KEY ?? "").trim(),
    (process.env.PII_ENCRYPTION_KEY ?? "").trim(),
    LOCAL_SECRETS_KEY_HEX,
  ]) {
    const bytes = keyBytesFromRaw(raw);
    if (!bytes) continue;
    const id = bytes.toString("hex");
    if (seen.has(id)) continue;
    seen.add(id);
    keys.push(bytes);
  }
  return keys;
}

function decryptWithKey(enc: string, iv: string, key: Buffer): string {
  const buf = Buffer.from(enc, "base64");
  if (buf.length < TAG_BYTES) throw new Error("Invalid ciphertext");
  const ct = buf.subarray(0, -TAG_BYTES);
  const tag = buf.subarray(-TAG_BYTES);
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isMaskedSecretInput(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  return !raw || raw.includes("•") || raw.includes("*");
}

export function encryptSecret(plaintext: string): SealedSecret {
  const value = plaintext.trim();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, resolveKeyBytes(), iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: Buffer.concat([ct, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSecret(enc: string, iv: string): string {
  return decryptWithKey(enc, iv, resolveKeyBytes());
}

/** Prefer the active key, then older env keys, so a rotated CARRIER_SECRETS_KEY still unlocks vault rows. */
export function decryptSecretTryingKeys(enc: string, iv: string): string {
  const keys = listSecretKeyCandidates();
  let lastError: unknown;
  for (const key of keys) {
    try {
      return decryptWithKey(enc, iv, key);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Invalid ciphertext");
}

export function maskUsername(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return `${trimmed.slice(0, 1)}••••`;
  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
}
