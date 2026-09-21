import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { planByoSecretWrite } from "@/lib/integrations/byo-credentials";
import { decryptSecret, encryptSecret } from "@/lib/secrets/vault";
import { envHasOauthApp, envOauthApp, pickOauthClientApp } from "./oauth-env";
import {
  buildByoAuthorizeUrl,
  createPkcePair,
  docusignAuthBase,
  encodeByoOauthState,
  microsoftAuthorizeUrl,
  type ByoOauthStatePayload,
} from "./oauth";
import {
  byoOauthRedirectUri,
  byoOauthReturnPath,
  byoOauthSpec,
  googleFamilyIds,
  isByoOauthProviderId,
  type ByoOauthProviderId,
} from "./oauth-specs";

export async function loadByoConnection(provider: ByoOauthProviderId) {
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.provider, provider),
      ),
    );
  const category = catalogCategory(provider);
  return rows.find((row) => row.category === category) ?? rows[0] ?? null;
}

function credentialCandidates(provider: ByoOauthProviderId): ByoOauthProviderId[] {
  const spec = byoOauthSpec(provider);
  const ids = new Set<ByoOauthProviderId>([provider]);
  if (spec.shareCredentialsWith) ids.add(spec.shareCredentialsWith);
  if (spec.family === "google") {
    for (const id of googleFamilyIds()) ids.add(id);
  }
  return [...ids];
}

export async function resolveByoClientApp(provider: ByoOauthProviderId): Promise<{
  clientId: string;
  clientSecret: string;
  source: "settings" | "env";
  tenant?: string;
  authBase?: string;
} | null> {
  const spec = byoOauthSpec(provider);
  let settings: { clientId: string; clientSecret: string } | null = null;
  for (const id of credentialCandidates(provider)) {
    const row = await loadByoConnection(id);
    if (row?.clientId?.trim() && row.clientSecretEnc && row.clientSecretIv) {
      try {
        const clientSecret = decryptSecret(row.clientSecretEnc, row.clientSecretIv);
        if (clientSecret) {
          settings = { clientId: row.clientId.trim(), clientSecret };
          break;
        }
      } catch {
        /* try next / env */
      }
    }
  }
  return pickOauthClientApp({
    family: spec.family,
    settings,
    env: envOauthApp(spec.family),
  });
}

export function hasEnvByoCredentials(provider: ByoOauthProviderId): boolean {
  return envHasOauthApp(byoOauthSpec(provider).family);
}

export async function loadStoredByoApp(provider: ByoOauthProviderId) {
  const own = await loadByoConnection(provider);
  if (own?.clientId?.trim() && own.clientSecretEnc && own.clientSecretIv) return own;
  for (const id of credentialCandidates(provider)) {
    const row = await loadByoConnection(id);
    if (row?.clientId?.trim() && row.clientSecretEnc && row.clientSecretIv) return row;
  }
  return own;
}

export async function saveByoApp(input: {
  provider: ByoOauthProviderId;
  clientId: string;
  clientSecret?: string;
  accountLabel?: string | null;
}): Promise<{ ok: true; clientId: string; hasSecret: boolean } | { ok: false; message: string }> {
  const spec = byoOauthSpec(input.provider);
  // Always write the OWN provider row. loadStoredByoApp may return a sibling
  // Google family row (e.g. gmail when saving google_calendar); updating that
  // row's provider/category hits unique(tenant, category, provider) and never
  // reaches Google OAuth.
  const own = await loadByoConnection(input.provider);
  const shared = await loadStoredByoApp(input.provider);
  const clientId =
    input.clientId.trim() || own?.clientId?.trim() || shared?.clientId?.trim() || "";
  if (!clientId) return { ok: false, message: "Paste the Integration Key / Client ID." };
  const priorId = own?.clientId?.trim() || shared?.clientId?.trim() || "";
  const hasOwnSecret = Boolean(own?.clientSecretEnc && own.clientSecretIv);
  const hasSharedSecret = Boolean(shared?.clientSecretEnc && shared.clientSecretIv);
  const secretPlan = planByoSecretWrite({
    incoming: input.clientSecret,
    hasExistingSecret: hasOwnSecret || hasSharedSecret,
    clientIdUnchanged: Boolean(priorId) && clientId === priorId,
  });
  if (secretPlan.action === "reject") return { ok: false, message: secretPlan.message };
  let sealed: ReturnType<typeof encryptSecret> | null = null;
  try {
    sealed = secretPlan.action === "write" ? encryptSecret(secretPlan.secret) : null;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not encrypt the Secret Key.",
    };
  }
  const clientSecretEnc =
    sealed?.enc ?? own?.clientSecretEnc ?? shared?.clientSecretEnc ?? null;
  const clientSecretIv =
    sealed?.iv ?? own?.clientSecretIv ?? shared?.clientSecretIv ?? null;
  const hasSecret = Boolean(clientSecretEnc && clientSecretIv);
  const patch = {
    category: catalogCategory(input.provider),
    provider: input.provider,
    clientId,
    clientSecretEnc,
    clientSecretIv,
    connectMode: "credentials" as const,
    lastOauthError: null,
    notes: `${spec.vendor} BYO app saved. ${spec.worksWhen}`,
    accountLabel: input.accountLabel?.trim() || own?.accountLabel || shared?.accountLabel || null,
    updatedAt: new Date(),
  };
  try {
    if (own) {
      await db.update(integrationConnections).set(patch).where(eq(integrationConnections.id, own.id));
    } else {
      await db.insert(integrationConnections).values({
        tenantId: DEFAULT_TENANT_ID,
        connected: false,
        ...patch,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 400)
          : "Could not save agency app credentials.",
    };
  }
  return { ok: true, clientId, hasSecret };
}

export async function clearByoApp(provider: ByoOauthProviderId) {
  for (const id of credentialCandidates(provider)) {
    const existing = await loadByoConnection(id);
    if (!existing) continue;
    await db
      .update(integrationConnections)
      .set({
        clientId: null,
        clientSecretEnc: null,
        clientSecretIv: null,
        oauthState: null,
        lastOauthError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));
  }
}

export async function prepareByoAuthorize(input: {
  provider: ByoOauthProviderId;
  origin: string;
  returnTo: string;
  userId?: string | null;
}): Promise<
  | { ok: true; url: string; state: string }
  | { ok: false; reason: "needs_credentials" | "google_not_setup"; message: string }
> {
  const spec = byoOauthSpec(input.provider);
  const app = await resolveByoClientApp(input.provider);
  if (!app) {
    return {
      ok: false,
      reason: "needs_credentials",
      message: `Paste the agency ${spec.clientIdLabel} and ${spec.clientSecretLabel}, or set the ${spec.vendor} env vars. ${spec.worksWhen}`,
    };
  }
  const pkce = spec.pkce ? createPkcePair() : null;
  const payload: ByoOauthStatePayload = {
    p: input.provider,
    n: crypto.randomUUID(),
    r: byoOauthReturnPath(input.returnTo),
    exp: Date.now() + 10 * 60 * 1000,
    v: pkce?.verifier,
    u: input.userId ?? null,
  };
  const state = encodeByoOauthState(payload);
  const existing = await loadByoConnection(input.provider);
  const redirectUri = byoOauthRedirectUri(input.origin);
  const authorizeUrl =
    spec.family === "microsoft"
      ? microsoftAuthorizeUrl(app.tenant ?? "common")
      : spec.family === "docusign"
        ? `${docusignAuthBase()}/oauth/auth`
        : spec.authorizeUrl;
  if (existing) {
    await db
      .update(integrationConnections)
      .set({
        oauthState: state,
        lastOauthError: null,
        category: catalogCategory(input.provider),
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));
  } else {
    await db.insert(integrationConnections).values({
      tenantId: DEFAULT_TENANT_ID,
      category: catalogCategory(input.provider),
      provider: input.provider,
      connected: false,
      clientId: app.source === "settings" ? app.clientId : null,
      oauthState: state,
      notes: spec.worksWhen,
    });
  }
  return {
    ok: true,
    url: buildByoAuthorizeUrl(spec, {
      clientId: app.clientId,
      redirectUri,
      state,
      codeChallenge: pkce?.challenge,
      authorizeUrl,
    }),
    state,
  };
}

export async function recordByoOauthError(provider: ByoOauthProviderId, message: string) {
  const existing = await loadByoConnection(provider);
  const patch = {
    lastOauthError: message.slice(0, 800),
    lastConnectStatus: "oauth_wall",
    oauthState: null,
    category: catalogCategory(provider),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(integrationConnections).set(patch).where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    provider,
    connected: false,
    ...patch,
  });
}

export async function completeByoConnect(input: {
  provider: ByoOauthProviderId;
  accountLabel: string;
  accountEmail?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  scopes?: string | null;
  ownerUserId?: string | null;
}) {
  const spec = byoOauthSpec(input.provider);
  const existing = await loadByoConnection(input.provider);
  const access = input.accessToken?.trim() ? encryptSecret(input.accessToken) : null;
  const refresh = input.refreshToken?.trim() ? encryptSecret(input.refreshToken) : null;
  const expiresAt =
    input.expiresIn && input.expiresIn > 0 ? new Date(Date.now() + input.expiresIn * 1000) : null;
  const patch = {
    category: catalogCategory(input.provider),
    provider: input.provider,
    connected: true,
    connectMode: "byo",
    accountLabel: input.accountLabel.trim(),
    tokenAccountEmail: input.accountEmail?.trim() || existing?.tokenAccountEmail || null,
    lastConnectStatus: "byo_oauth",
    lastOauthError: null,
    oauthState: null,
    connectedAt: new Date(),
    ownerUserId: input.ownerUserId ?? existing?.ownerUserId ?? null,
    notes: `BYO ${spec.vendor} OAuth completed. ${spec.stubbed}`,
    accessTokenEnc: access?.enc ?? existing?.accessTokenEnc ?? null,
    accessTokenIv: access?.iv ?? existing?.accessTokenIv ?? null,
    refreshTokenEnc: refresh?.enc ?? existing?.refreshTokenEnc ?? null,
    refreshTokenIv: refresh?.iv ?? existing?.refreshTokenIv ?? null,
    tokenExpiresAt: expiresAt ?? existing?.tokenExpiresAt ?? null,
    grantedScopes: input.scopes ?? existing?.grantedScopes ?? spec.scopes.join(" "),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(integrationConnections).set(patch).where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    ...patch,
  });
}

export async function disconnectByo(provider: ByoOauthProviderId) {
  const existing = await loadByoConnection(provider);
  if (!existing) return;
  await db
    .update(integrationConnections)
    .set({
      connected: false,
      connectMode: existing.clientId ? "credentials" : null,
      lastConnectStatus: null,
      lastOauthError: null,
      oauthState: null,
      accessTokenEnc: null,
      accessTokenIv: null,
      refreshTokenEnc: null,
      refreshTokenIv: null,
      tokenExpiresAt: null,
      grantedScopes: null,
      tokenAccountEmail: null,
      lastBusySyncAt: null,
      connectedAt: null,
      notes: "Disconnected BYO OAuth. Agency app credentials were kept.",
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, existing.id));
}

export async function readAccessToken(provider: ByoOauthProviderId): Promise<string | null> {
  const row = await loadByoConnection(provider);
  if (!row?.accessTokenEnc || !row.accessTokenIv) return null;
  try {
    return decryptSecret(row.accessTokenEnc, row.accessTokenIv);
  } catch {
    return null;
  }
}

export async function readRefreshToken(provider: ByoOauthProviderId): Promise<string | null> {
  const row = await loadByoConnection(provider);
  if (!row?.refreshTokenEnc || !row.refreshTokenIv) return null;
  try {
    return decryptSecret(row.refreshTokenEnc, row.refreshTokenIv);
  } catch {
    return null;
  }
}

export function catalogCategory(provider: ByoOauthProviderId) {
  if (provider === "gmail" || provider === "yahoo") return "email" as const;
  if (provider === "google_calendar" || provider === "outlook_calendar") return "calendar" as const;
  if (provider === "google_meet") return "video" as const;
  return "esign" as const;
}

export function isByoProvider(value: string): value is ByoOauthProviderId {
  return isByoOauthProviderId(value);
}
