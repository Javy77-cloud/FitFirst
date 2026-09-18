import { timingSafeEqual } from "node:crypto";
import { verifyOrgApiKey } from "@/lib/developer-hub/store";
import {
  inboundWebhookPrefixMatch,
  loadHealthSherpaWebhookSecrets,
  loadNormalizedInboundWebhookSecret,
  normalizeHealthSherpaSecret,
  type HealthSherpaInboundSource,
} from "./vault";

const NAMED_HEADER_KEYS = [
  "x-api-key",
  "x-apikey",
  "api-key",
  "apikey",
  "x-fitfirst-key",
  "x-webhook-secret",
  "x-healthsherpa-key",
] as const;

const QUERY_KEYS = ["x-api-key", "api_key", "apiKey", "apikey", "key"] as const;

export type HealthSherpaAuthReason =
  | "missing_credential"
  | "not_configured"
  | "vault_unreadable"
  | "mismatch";

export type HealthSherpaAuthDiagnostics = {
  inboundConfigured: boolean;
  inboundSource: HealthSherpaInboundSource;
  presentedLength: number;
  acceptedCount: number;
  prefixMatch: boolean;
};

export type HealthSherpaAuthResult =
  | { ok: true }
  | ({
      ok: false;
      reason: HealthSherpaAuthReason;
      message: string;
    } & HealthSherpaAuthDiagnostics);

function normalizePresented(raw: string | null | undefined): string | null {
  return normalizeHealthSherpaSecret(raw);
}

function pushUnique(out: string[], value: string | null) {
  if (value && !out.includes(value)) out.push(value);
}

function decodeBasicParts(encoded: string): string[] {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    const user = colon >= 0 ? decoded.slice(0, colon) : decoded;
    const pass = colon >= 0 ? decoded.slice(colon + 1) : "";
    return [decoded, user, pass].map((part) => part.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Every API-key shape HealthSherpa (Medicare UI + ACA onboarding) is known to send. */
export function collectPresentedHealthSherpaSecrets(request: Request): string[] {
  const presented: string[] = [];
  for (const name of NAMED_HEADER_KEYS) {
    pushUnique(presented, normalizePresented(request.headers.get(name)));
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const trimmed = authorization.trim();
    const scheme = /^(Bearer|Api-?Key|Token|Key)\s+(\S+)/i.exec(trimmed);
    const basic = /^Basic\s+(\S+)/i.exec(trimmed);
    if (scheme?.[2]) {
      pushUnique(presented, normalizePresented(scheme[2]));
    } else if (basic?.[1]) {
      for (const part of decodeBasicParts(basic[1])) {
        pushUnique(presented, normalizePresented(part));
      }
    } else {
      pushUnique(presented, normalizePresented(trimmed));
    }
  }

  try {
    const url = new URL(request.url);
    for (const key of QUERY_KEYS) {
      pushUnique(presented, normalizePresented(url.searchParams.get(key)));
    }
  } catch {
    /* ignore */
  }

  return presented;
}

function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function matchesAny(presented: string[], accepted: string[]): boolean {
  for (const candidate of presented) {
    for (const secret of accepted) {
      if (secretsEqual(candidate, secret)) return true;
    }
  }
  return false;
}

function failure(
  reason: HealthSherpaAuthReason,
  message: string,
  diagnostics: HealthSherpaAuthDiagnostics,
): Extract<HealthSherpaAuthResult, { ok: false }> {
  return { ok: false, reason, message, ...diagnostics };
}

function presentedLengthOf(presented: string[]): number {
  return presented.reduce((max, value) => Math.max(max, value.length), 0);
}

/**
 * Authorize HealthSherpa inbound webhooks.
 * Accepts X-API-Key (documented), api-key, Bearer / Api-Key / Token / raw Authorization, Basic, or query.
 * Compares against the inbound vault secret first, then Medicare / ACA vault keys and env fallbacks.
 */
export async function authorizeHealthSherpaWebhook(request: Request): Promise<HealthSherpaAuthResult> {
  const presented = collectPresentedHealthSherpaSecrets(request);
  const accepted = await loadHealthSherpaWebhookSecrets();
  if (presented.length && accepted.length && matchesAny(presented, accepted)) {
    return { ok: true };
  }

  if (presented.length) {
    for (const candidate of presented) {
      try {
        if (await verifyOrgApiKey(candidate)) return { ok: true };
      } catch {
        /* org key table is optional */
      }
    }
  }

  const inbound = await loadNormalizedInboundWebhookSecret();
  const diagnostics: HealthSherpaAuthDiagnostics = {
    inboundConfigured: Boolean(inbound.secret),
    inboundSource: inbound.source,
    presentedLength: presentedLengthOf(presented),
    acceptedCount: accepted.length,
    prefixMatch: inboundWebhookPrefixMatch(presented, inbound.secret),
  };

  if (!presented.length) {
    return failure(
      "missing_credential",
      "No API key was sent. HealthSherpa should use Authentication = API Key (X-API-Key). Bearer, api-key, and Authorization are also accepted.",
      diagnostics,
    );
  }
  if (inbound.hasRow && !inbound.readable) {
    return failure(
      "vault_unreadable",
      "Inbound webhook secret is stored but could not be decrypted (or a masked value was saved). Re-save the inbound webhook secret — not the Medicare Partner key — in Developer Hub → API vault.",
      diagnostics,
    );
  }
  if (accepted.length === 0) {
    return failure(
      "not_configured",
      "No HealthSherpa inbound secret is readable. Save the inbound webhook secret in Developer Hub → API vault (or HEALTHSHERPA_WEBHOOK_API_KEY).",
      diagnostics,
    );
  }
  return failure(
    "mismatch",
    "API key did not match the HealthSherpa inbound vault secret (or Medicare / ACA partner key / org API key).",
    diagnostics,
  );
}
