import { createHmac, timingSafeEqual } from "node:crypto";

/** Claims carried in the signed ff_session cookie. Unsigned ff_role / ff_actor_id are not authority. */
export type SignedSessionClaims = {
  sub: string;
  role: string;
  mfa: string;
  mod: string;
  name: string;
  imp: string;
  exp: number;
};

const VERSION = "v1";

export function sessionSecretFromEnv(): string | null {
  const secret = (process.env.SESSION_SECRET || process.env.AUTH_SECRET || "").trim();
  if (secret.length < 16) return null;
  return secret;
}

function b64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromB64url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSessionToken(claims: SignedSessionClaims, secret: string): string | null {
  if (!secret || secret.length < 16) return null;
  if (!claims.sub.trim()) return null;
  const body = b64url(JSON.stringify(claims));
  return `${VERSION}.${body}.${signBody(body, secret)}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  secret: string | null = sessionSecretFromEnv(),
  nowMs = Date.now(),
): SignedSessionClaims | null {
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [, body, sig] = parts;
  if (!body || !sig) return null;
  const expected = signBody(body, secret);
  if (!signaturesMatch(sig, expected)) return null;
  const raw = fromB64url(body);
  if (!raw) return null;
  let parsed: Partial<SignedSessionClaims>;
  try {
    parsed = JSON.parse(raw) as Partial<SignedSessionClaims>;
  } catch {
    return null;
  }
  if (!parsed.sub || typeof parsed.sub !== "string") return null;
  if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= nowMs) return null;
  return {
    sub: parsed.sub,
    role: typeof parsed.role === "string" ? parsed.role : "agent",
    mfa: typeof parsed.mfa === "string" ? parsed.mfa : "pending",
    mod: parsed.mod === "0" ? "0" : "1",
    name: typeof parsed.name === "string" ? parsed.name : "",
    imp: typeof parsed.imp === "string" ? parsed.imp : "",
    exp: parsed.exp,
  };
}

export function sessionExpiryEpoch(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) + 60 * 60 * 24 * 30;
}
