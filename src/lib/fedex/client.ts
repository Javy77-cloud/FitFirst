import { parseFedExResolvePayload } from "./parse";
import type { AddressSuggestion } from "@/lib/address/types";

export type FedExEnvironment = "sandbox" | "production";

export type FedExCredentials = {
  apiKey: string;
  apiSecret: string;
  accountNumber?: string | null;
  environment: FedExEnvironment;
};

export type FetchLike = (
  input: string | URL,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export function fedexBaseUrl(environment: FedExEnvironment): string {
  return environment === "production" ? "https://apis.fedex.com" : "https://apis-sandbox.fedex.com";
}

export function fedexCredentialsReady(creds: FedExCredentials | null | undefined): boolean {
  return Boolean(creds?.apiKey?.trim() && creds.apiSecret?.trim());
}

type CachedToken = { token: string; exp: number };
const tokenCache = new Map<string, CachedToken>();

function tokenCacheKey(creds: FedExCredentials): string {
  return `${creds.environment}:${creds.apiKey.length}:${creds.apiSecret.length}`;
}

export function resetFedExTokenCache(): void {
  tokenCache.clear();
}

export async function fetchFedExAccessToken(
  creds: FedExCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  if (!fedexCredentialsReady(creds)) {
    throw new Error("FedEx credentials are not configured.");
  }
  const cacheKey = tokenCacheKey(creds);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.exp > Date.now() + 15_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.apiKey.trim(),
    client_secret: creds.apiSecret.trim(),
  });
  const res = await fetchImpl(`${fedexBaseUrl(creds.environment)}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error("FedEx OAuth failed.");
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const token = data.access_token?.trim();
  if (!token) throw new Error("FedEx OAuth returned no token.");
  const ttlMs = Math.max(30, Number(data.expires_in) || 3600) * 1000;
  tokenCache.set(cacheKey, { token, exp: Date.now() + ttlMs });
  return token;
}

export async function suggestFedExAddresses(
  query: string,
  creds: FedExCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3 || !fedexCredentialsReady(creds)) return [];
  const token = await fetchFedExAccessToken(creds, fetchImpl);
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetchImpl(`${fedexBaseUrl(creds.environment)}/address/v1/addresses/resolve`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-locale": "en_US",
    },
    body: JSON.stringify({
      inEffectAsOfTimestamp: today,
      validateAddressControlParameters: { includeResolutionTokens: true },
      addressesToValidate: [
        {
          address: {
            streetLines: [q],
            countryCode: "US",
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  return parseFedExResolvePayload(await res.json());
}
