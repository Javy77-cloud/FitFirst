import { parseFedExResolvePayload } from "./parse";
import { classifyFedExHttpStatus, fedexResolveRequestAddress } from "./request";
import { addressesMatch } from "@/lib/address/compare";
import { addressIsComplete, type AddressSuggestion, type ParsedAddress } from "@/lib/address/types";
import { noteDeveloperApiCall } from "@/lib/developer/usage";

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

export type AddressVerifyStatus = "verified" | "suggested" | "unmatched" | "error";

export type AddressVerifyErrorKind = "auth" | "transport" | "not_configured";

export type AddressVerifyResult = {
  status: AddressVerifyStatus;
  resolved: ParsedAddress | null;
  suggestions: AddressSuggestion[];
  errorKind?: AddressVerifyErrorKind;
};

function verifyError(errorKind: AddressVerifyErrorKind): AddressVerifyResult {
  return { status: "error", resolved: null, suggestions: [], errorKind };
}

export async function verifyFedExAddress(
  address: ParsedAddress,
  creds: FedExCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<AddressVerifyResult> {
  if (!fedexCredentialsReady(creds)) return verifyError("not_configured");
  if (!addressIsComplete(address)) {
    return { status: "unmatched", resolved: null, suggestions: [] };
  }
  let token: string;
  try {
    token = await fetchFedExAccessToken(creds, fetchImpl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not configured")) return verifyError("not_configured");
    if (message.includes("OAuth")) return verifyError("auth");
    return verifyError("transport");
  }
  const today = new Date().toISOString().slice(0, 10);
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(`${fedexBaseUrl(creds.environment)}/address/v1/addresses/resolve`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-locale": "en_US",
      },
      body: JSON.stringify({
        inEffectAsOfTimestamp: today,
        addressesToValidate: [
          {
            address: fedexResolveRequestAddress(address),
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return verifyError("transport");
  }
  noteDeveloperApiCall("fedex");
  const kind = classifyFedExHttpStatus(res.status);
  if (kind === "auth" || kind === "transport") return verifyError(kind);
  if (kind === "unmatched") return { status: "unmatched", resolved: null, suggestions: [] };
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return verifyError("transport");
  }
  const suggestions = parseFedExResolvePayload(payload);
  const resolved = suggestions[0]?.address ?? null;
  if (!resolved || !resolved.street) return { status: "unmatched", resolved: null, suggestions: [] };
  if (addressesMatch(address, resolved)) {
    return { status: "verified", resolved, suggestions };
  }
  return { status: "suggested", resolved, suggestions };
}
