import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  BYO_OAUTH_SPECS,
  byoOauthRedirectUri,
  isByoOauthProviderId,
  type ByoOauthProviderId,
  type ByoOauthReturnPath,
  type ByoOauthSpec,
} from "./oauth-specs";

export function oauthStateSecret(): string {
  return (
    (process.env.PII_ENCRYPTION_KEY ?? "").trim() ||
    (process.env.CARRIER_SECRETS_KEY ?? "").trim() ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
}

export type ByoOauthStatePayload = {
  p: ByoOauthProviderId;
  n: string;
  r: ByoOauthReturnPath;
  exp: number;
  v?: string;
  u?: string | null;
};

export function encodeByoOauthState(payload: ByoOauthStatePayload, secret = oauthStateSecret()): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function decodeByoOauthState(raw: string, secret = oauthStateSecret()): ByoOauthStatePayload | null {
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ByoOauthStatePayload;
    if (!isByoOauthProviderId(payload.p)) return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (payload.r && !payload.r.startsWith("/settings/")) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function microsoftAuthorizeUrl(tenant: string): string {
  const t = tenant.trim() || "common";
  return `https://login.microsoftonline.com/${encodeURIComponent(t)}/oauth2/v2.0/authorize`;
}

export function microsoftTokenUrl(tenant: string): string {
  const t = tenant.trim() || "common";
  return `https://login.microsoftonline.com/${encodeURIComponent(t)}/oauth2/v2.0/token`;
}

export function docusignAuthBase(): string {
  const raw = (process.env.DOCUSIGN_AUTH_BASE ?? "").trim();
  return raw.replace(/\/$/, "") || "https://account-d.docusign.com";
}

export function buildByoAuthorizeUrl(
  spec: ByoOauthSpec,
  input: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    authorizeUrl?: string;
  },
): string {
  const url = new URL(input.authorizeUrl ?? spec.authorizeUrl);
  url.searchParams.set("client_id", input.clientId.trim());
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", spec.scopes.join(" "));
  if (spec.extraParams) {
    for (const [key, value] of Object.entries(spec.extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export function defaultByoRedirectUri(origin: string): string {
  return byoOauthRedirectUri(origin);
}

export { BYO_OAUTH_SPECS };
