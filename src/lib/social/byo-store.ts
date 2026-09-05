import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { decryptSecret, encryptSecret, isMaskedSecretInput, LOCAL_SECRETS_KEY_HEX } from "@/lib/secrets/vault";
import {
  buildAuthorizeUrl,
  encodeOauthState,
  isPaidWallPlatform,
  socialByoSpec,
  socialOauthRedirectUri,
  socialReturnPath,
  type OauthStatePayload,
} from "./byo";
import { isSocialPlatformId, type SocialPlatformId } from "./platforms";

function stateSecret(): string {
  return (
    (process.env.PII_ENCRYPTION_KEY ?? "").trim() ||
    (process.env.CARRIER_SECRETS_KEY ?? "").trim() ||
    LOCAL_SECRETS_KEY_HEX
  );
}

export function socialOauthStateSecret(): string {
  return stateSecret();
}

export type SocialCredentialRow = {
  provider: SocialPlatformId;
  clientId: string | null;
  hasSecret: boolean;
  connectMode: string | null;
  lastOauthError: string | null;
  connected: boolean;
  accountLabel: string | null;
  ownerUserId: string | null;
};

export async function loadSocialConnectionRow(provider: SocialPlatformId) {
  const [row] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.provider, provider),
      ),
    );
  return row ?? null;
}

export async function resolveSocialClientId(provider: SocialPlatformId): Promise<string | null> {
  const row = await loadSocialConnectionRow(provider);
  const own = row?.clientId?.trim() || null;
  if (own) return own;
  const share = socialByoSpec(provider).shareCredentialsWith;
  if (!share) return null;
  const shared = await loadSocialConnectionRow(share);
  return shared?.clientId?.trim() || null;
}

export async function resolveSocialClientSecret(provider: SocialPlatformId): Promise<string | null> {
  const row = await loadSocialConnectionRow(provider);
  if (row?.clientSecretEnc && row.clientSecretIv) {
    try {
      return decryptSecret(row.clientSecretEnc, row.clientSecretIv);
    } catch {
      return null;
    }
  }
  const share = socialByoSpec(provider).shareCredentialsWith;
  if (!share) return null;
  const shared = await loadSocialConnectionRow(share);
  if (shared?.clientSecretEnc && shared.clientSecretIv) {
    try {
      return decryptSecret(shared.clientSecretEnc, shared.clientSecretIv);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveSocialByoApp(input: {
  provider: SocialPlatformId;
  clientId: string;
  clientSecret?: string;
  accountLabel?: string | null;
}) {
  const spec = socialByoSpec(input.provider);
  const clientId = input.clientId.trim();
  const keepSecret = isMaskedSecretInput(input.clientSecret);
  const existing = await loadSocialConnectionRow(input.provider);
  const sealed =
    input.clientSecret && !keepSecret ? encryptSecret(input.clientSecret) : null;
  const patch = {
    category: "social" as const,
    provider: input.provider,
    clientId: clientId || existing?.clientId || null,
    clientSecretEnc: sealed?.enc ?? existing?.clientSecretEnc ?? null,
    clientSecretIv: sealed?.iv ?? existing?.clientSecretIv ?? null,
    lastOauthError: null,
    notes: `${spec.vendor} BYO app saved. ${spec.worksWhen}`,
    accountLabel: input.accountLabel?.trim() || existing?.accountLabel || null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(integrationConnections)
      .set(patch)
      .where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    connected: false,
    ...patch,
  });
}

export async function clearSocialByoApp(provider: SocialPlatformId) {
  const existing = await loadSocialConnectionRow(provider);
  if (!existing) return;
  await db
    .update(integrationConnections)
    .set({
      clientId: null,
      clientSecretEnc: null,
      clientSecretIv: null,
      oauthState: null,
      lastOauthError: null,
      accessTokenEnc: null,
      accessTokenIv: null,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, existing.id));
}

export async function prepareSocialAuthorize(input: {
  provider: SocialPlatformId;
  origin: string;
  returnTo: string;
}): Promise<
  | { ok: true; url: string; state: string }
  | { ok: false; reason: "paid_wall" | "needs_credentials"; message: string }
> {
  const spec = socialByoSpec(input.provider);
  if (isPaidWallPlatform(input.provider)) {
    return { ok: false, reason: "paid_wall", message: spec.wallBody };
  }
  const clientId = await resolveSocialClientId(input.provider);
  const clientSecret = await resolveSocialClientSecret(input.provider);
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      reason: "needs_credentials",
      message: `Paste the agency ${spec.clientIdLabel} and ${spec.clientSecretLabel} first. ${spec.worksWhen}`,
    };
  }
  const payload: OauthStatePayload = {
    p: input.provider,
    n: crypto.randomUUID(),
    r: socialReturnPath(input.returnTo),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const state = encodeOauthState(payload, stateSecret());
  const existing = await loadSocialConnectionRow(input.provider);
  const redirectUri = socialOauthRedirectUri(input.origin);
  if (existing) {
    await db
      .update(integrationConnections)
      .set({ oauthState: state, lastOauthError: null, updatedAt: new Date() })
      .where(eq(integrationConnections.id, existing.id));
  } else {
    await db.insert(integrationConnections).values({
      tenantId: DEFAULT_TENANT_ID,
      category: "social",
      provider: input.provider,
      connected: false,
      clientId,
      oauthState: state,
      notes: spec.worksWhen,
    });
  }
  return {
    ok: true,
    url: buildAuthorizeUrl(spec, { clientId, redirectUri, state }),
    state,
  };
}

export async function recordSocialOauthError(provider: SocialPlatformId, message: string) {
  const existing = await loadSocialConnectionRow(provider);
  const patch = {
    lastOauthError: message.slice(0, 800),
    lastConnectStatus: "oauth_wall",
    oauthState: null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(integrationConnections)
      .set(patch)
      .where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    category: "social",
    provider,
    connected: false,
    ...patch,
  });
}

export async function completeSocialByoConnect(input: {
  provider: SocialPlatformId;
  accountLabel: string;
  accessToken?: string | null;
}) {
  const spec = socialByoSpec(input.provider);
  const existing = await loadSocialConnectionRow(input.provider);
  const sealed = input.accessToken?.trim() ? encryptSecret(input.accessToken) : null;
  const patch = {
    category: "social" as const,
    provider: input.provider,
    connected: true,
    connectMode: "byo",
    accountLabel: input.accountLabel.trim(),
    lastConnectStatus: "byo_oauth",
    lastOauthError: null,
    oauthState: null,
    connectedAt: new Date(),
    notes: `BYO ${spec.vendor} OAuth completed. ${spec.stubbed}`,
    accessTokenEnc: sealed?.enc ?? existing?.accessTokenEnc ?? null,
    accessTokenIv: sealed?.iv ?? existing?.accessTokenIv ?? null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(integrationConnections)
      .set(patch)
      .where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    ...patch,
  });
}

export function isSocialProvider(value: string): value is SocialPlatformId {
  return isSocialPlatformId(value);
}

export type TokenExchangeResult =
  | { ok: true; accessToken: string; accountLabel: string }
  | { ok: false; message: string };

export async function exchangeSocialOAuthCode(input: {
  provider: SocialPlatformId;
  code: string;
  redirectUri: string;
}): Promise<TokenExchangeResult> {
  const spec = socialByoSpec(input.provider);
  const clientId = await resolveSocialClientId(input.provider);
  const clientSecret = await resolveSocialClientSecret(input.provider);
  if (!clientId || !clientSecret) {
    return { ok: false, message: "Agency app credentials are missing. Paste them and try again." };
  }

  try {
    if (input.provider === "facebook" || input.provider === "instagram") {
      return await exchangeMeta(spec.tokenUrl, clientId, clientSecret, input.code, input.redirectUri);
    }
    if (input.provider === "google_business_profile") {
      return await exchangeGoogle(spec.tokenUrl, clientId, clientSecret, input.code, input.redirectUri);
    }
    if (input.provider === "linkedin") {
      return await exchangeLinkedIn(spec.tokenUrl, clientId, clientSecret, input.code, input.redirectUri);
    }
    return { ok: false, message: spec.wallBody };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed.";
    return { ok: false, message };
  }
}

async function exchangeMeta(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<TokenExchangeResult> {
  const url = new URL(tokenUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      message: data.error?.message || `Meta token exchange failed (${res.status}). Check App ID, secret, and redirect URI.`,
    };
  }
  let accountLabel = "Meta Page · BYO";
  try {
    const me = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=name&access_token=${encodeURIComponent(data.access_token)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    const body = (await me.json()) as { name?: string };
    if (body.name) accountLabel = `${body.name} · BYO`;
  } catch {
    /* label is optional */
  }
  return { ok: true, accessToken: data.access_token, accountLabel };
}

async function exchangeGoogle(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      message:
        data.error_description ||
        data.error ||
        `Google token exchange failed (${res.status}). Check the OAuth client and redirect URI.`,
    };
  }
  let accountLabel = "Google account · BYO";
  try {
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as { email?: string; name?: string };
    if (info.email || info.name) accountLabel = `${info.email || info.name} · BYO`;
  } catch {
    /* GBP listing sync is the later wall */
  }
  return { ok: true, accessToken: data.access_token, accountLabel };
}

async function exchangeLinkedIn(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      message:
        data.error_description ||
        data.error ||
        `LinkedIn token exchange failed (${res.status}). Sign In with LinkedIn must be enabled on the app.`,
    };
  }
  let accountLabel = "LinkedIn · BYO Sign In";
  try {
    const me = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as { name?: string; given_name?: string };
    if (info.name || info.given_name) accountLabel = `${info.name || info.given_name} · BYO`;
  } catch {
    /* page APIs stay the wall */
  }
  return { ok: true, accessToken: data.access_token, accountLabel };
}
