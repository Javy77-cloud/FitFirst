import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SEC = 30;
const DIGITS = 6;

/** Seeded Javy authenticator. Local desk only — not a production secret. */
export const DEMO_JAVY_TOTP_SECRET = "JAVYFITFIRSTDESKAA";

export function generateTotpSecret(bytes = 20): string {
  return toBase32(randomBytes(bytes));
}

export function toBase32(buf: Buffer): string {
  let bits = "";
  for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

export function fromBase32(secret: string): Buffer {
  const clean = secret.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function hotp(secret: string, counter: number): string {
  const key = fromBase32(secret);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpAt(secret: string, at = new Date()): string {
  const counter = Math.floor(at.getTime() / 1000 / PERIOD_SEC);
  return hotp(secret, counter);
}

export function verifyTotp(secret: string, code: string, at = new Date(), window = 1): boolean {
  const expected = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(expected)) return false;
  const counter = Math.floor(at.getTime() / 1000 / PERIOD_SEC);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secret, counter + i);
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function otpauthUri(input: { secret: string; account: string; issuer?: string }): string {
  const issuer = encodeURIComponent(input.issuer ?? "FitFirst");
  const account = encodeURIComponent(input.account);
  return `otpauth://totp/${issuer}:${account}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SEC}`;
}

export function newStubCode(): string {
  return String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
}
