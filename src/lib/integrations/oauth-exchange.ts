import { docusignAuthBase, microsoftTokenUrl } from "./oauth";
import { envOauthApp, isPlatformHostedGoogleOauth } from "./oauth-env";
import { byoOauthSpec, type ByoOauthProviderId } from "./oauth-specs";
import { completeByoConnect, resolveByoClientApp } from "./oauth-store";

export type TokenExchangeResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string | null;
      expiresIn: number | null;
      accountLabel: string;
      accountEmail: string | null;
      scopes: string | null;
    }
  | { ok: false; message: string };

type TokenJson = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeByoOAuthCode(input: {
  provider: ByoOauthProviderId;
  code: string;
  redirectUri: string;
  codeVerifier?: string | null;
}): Promise<TokenExchangeResult> {
  const spec = byoOauthSpec(input.provider);
  const app = await resolveByoClientApp(input.provider);
  if (!app) {
    return {
      ok: false,
      message: isPlatformHostedGoogleOauth(input.provider)
        ? "Google Connect isn’t set up on this FitFirst install."
        : "Agency app credentials are missing. Paste them or set env vars.",
    };
  }

  try {
    if (spec.family === "google") {
      return await exchangeGoogle(spec.tokenUrl, app.clientId, app.clientSecret, input);
    }
    if (spec.family === "microsoft") {
      return await exchangeMicrosoft(app.clientId, app.clientSecret, app.tenant ?? "common", input);
    }
    if (spec.family === "yahoo") {
      return await exchangeYahoo(spec.tokenUrl, app.clientId, app.clientSecret, input);
    }
    return await exchangeDocuSign(app.clientId, app.clientSecret, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed.";
    return { ok: false, message };
  }
}

async function postToken(
  tokenUrl: string,
  body: URLSearchParams,
  headers: Record<string, string> = {},
): Promise<TokenJson> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return (await res.json()) as TokenJson;
}

function failToken(data: TokenJson, fallback: string): TokenExchangeResult {
  return {
    ok: false,
    message: data.error_description || data.error || fallback,
  };
}

async function exchangeGoogle(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  input: { code: string; redirectUri: string; codeVerifier?: string | null },
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  const data = await postToken(tokenUrl, body);
  if (!data.access_token) {
    return failToken(data, "Google token exchange failed. Check the OAuth client and redirect URI.");
  }
  let accountEmail: string | null = null;
  let accountLabel = "Google account · BYO";
  try {
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as { email?: string; name?: string };
    accountEmail = info.email ?? null;
    if (info.email || info.name) accountLabel = `${info.email || info.name} · BYO`;
  } catch {
    /* label optional */
  }
  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    accountLabel,
    accountEmail,
    scopes: data.scope ?? null,
  };
}

async function exchangeMicrosoft(
  clientId: string,
  clientSecret: string,
  tenant: string,
  input: { code: string; redirectUri: string; codeVerifier?: string | null },
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    scope: byoOauthSpec("outlook_calendar").scopes.join(" "),
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  const data = await postToken(microsoftTokenUrl(tenant), body);
  if (!data.access_token) {
    return failToken(data, "Microsoft token exchange failed. Check the Entra app and redirect URI.");
  }
  let accountEmail: string | null = null;
  let accountLabel = "Microsoft 365 · BYO";
  try {
    const me = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as { displayName?: string; mail?: string; userPrincipalName?: string };
    accountEmail = info.mail || info.userPrincipalName || null;
    accountLabel = `${accountEmail || info.displayName || "Microsoft"} · BYO`;
  } catch {
    /* label optional */
  }
  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    accountLabel,
    accountEmail,
    scopes: data.scope ?? null,
  };
}

async function exchangeYahoo(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  input: { code: string; redirectUri: string; codeVerifier?: string | null },
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = await postToken(tokenUrl, body, { Authorization: `Basic ${basic}` });
  if (!data.access_token) {
    return failToken(data, "Yahoo token exchange failed. Check the Yahoo app and redirect URI.");
  }
  let accountEmail: string | null = null;
  let accountLabel = "Yahoo Mail · BYO";
  try {
    const me = await fetch("https://api.login.yahoo.com/openid/v1/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as { email?: string; name?: string };
    accountEmail = info.email ?? null;
    if (info.email || info.name) accountLabel = `${info.email || info.name} · BYO`;
  } catch {
    /* identity is enough */
  }
  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    accountLabel,
    accountEmail,
    scopes: data.scope ?? null,
  };
}

async function exchangeDocuSign(
  clientId: string,
  clientSecret: string,
  input: { code: string; redirectUri: string; codeVerifier?: string | null },
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = await postToken(`${docusignAuthBase()}/oauth/token`, body, {
    Authorization: `Basic ${basic}`,
  });
  if (!data.access_token) {
    return failToken(data, "DocuSign sandbox token exchange failed. Check Integration Key and redirect URI.");
  }
  let accountEmail: string | null = null;
  let accountLabel = "DocuSign sandbox · BYO";
  try {
    const me = await fetch(`${docusignAuthBase()}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(6000),
    });
    const info = (await me.json()) as {
      name?: string;
      email?: string;
      accounts?: { account_id?: string; account_name?: string; is_default?: boolean }[];
    };
    accountEmail = info.email ?? null;
    const account = info.accounts?.find((row) => row.is_default) ?? info.accounts?.[0];
    accountLabel = `${info.email || info.name || account?.account_name || "DocuSign"} · sandbox`;
  } catch {
    /* ping later */
  }
  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    accountLabel,
    accountEmail,
    scopes: data.scope ?? null,
  };
}

export async function refreshByoAccessToken(provider: ByoOauthProviderId): Promise<string | null> {
  const { loadByoConnection, readRefreshToken } = await import("./oauth-store");
  const refreshToken = await readRefreshToken(provider);
  const app = await resolveByoClientApp(provider);
  if (!refreshToken || !app) return null;
  const spec = byoOauthSpec(provider);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const headers: Record<string, string> = {};
  let tokenUrl = spec.tokenUrl;
  if (spec.family === "google" || spec.family === "microsoft") {
    body.set("client_id", app.clientId);
    body.set("client_secret", app.clientSecret);
    if (spec.family === "microsoft") tokenUrl = microsoftTokenUrl(app.tenant ?? "common");
  } else {
    headers.Authorization = `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64")}`;
    if (spec.family === "docusign") tokenUrl = `${docusignAuthBase()}/oauth/token`;
  }
  const data = await postToken(tokenUrl, body, headers);
  if (!data.access_token) return null;
  const row = await loadByoConnection(provider);
  await completeByoConnect({
    provider,
    accountLabel: row?.accountLabel || `${spec.vendor} · BYO`,
    accountEmail: row?.tokenAccountEmail,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? null,
    scopes: data.scope ?? row?.grantedScopes,
    ownerUserId: row?.ownerUserId,
  });
  return data.access_token;
}

export async function liveAccessToken(provider: ByoOauthProviderId): Promise<string | null> {
  const { loadByoConnection, readAccessToken } = await import("./oauth-store");
  const row = await loadByoConnection(provider);
  if (!row?.connected) return null;
  const exp = row.tokenExpiresAt ? new Date(row.tokenExpiresAt).getTime() : 0;
  const stale = exp > 0 && exp < Date.now() + 60_000;
  if (!stale) {
    const current = await readAccessToken(provider);
    if (current) return current;
  }
  return refreshByoAccessToken(provider);
}

export function envFamilyHint(provider: ByoOauthProviderId): string | null {
  const spec = byoOauthSpec(provider);
  return envOauthApp(spec.family) ? spec.family : null;
}
