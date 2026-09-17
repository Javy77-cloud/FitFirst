import type { ByoOauthFamily, ByoOauthProviderId } from "./oauth-specs";
import { docusignAuthBase } from "./oauth";

export type EnvOauthApp = {
  clientId: string;
  clientSecret: string;
  tenant?: string;
  authBase?: string;
};

export type ResolvedOauthApp = EnvOauthApp & {
  source: "settings" | "env";
};

/** Gmail, Google Calendar, and Meet share FitFirst’s platform Google OAuth web client. */
export const PLATFORM_GOOGLE_OAUTH_IDS = ["gmail", "google_calendar", "google_meet"] as const;

export const GOOGLE_CONNECT_NOT_SETUP_NOTICE = "google-connect-not-setup";

export const GOOGLE_CONNECT_NOT_SETUP_COPY =
  "Google Connect isn’t set up on this FitFirst install. Ask the site developer to configure it on Vercel. Admin does not paste a Client ID or Client Secret.";

function firstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = (process.env[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function envOauthApp(family: ByoOauthFamily): EnvOauthApp | null {
  if (family === "google") {
    const clientId = firstEnv("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID");
    const clientSecret = firstEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
  }
  if (family === "microsoft") {
    const clientId = firstEnv(
      "MICROSOFT_OAUTH_CLIENT_ID",
      "AZURE_AD_CLIENT_ID",
      "MICROSOFT_CLIENT_ID",
    );
    const clientSecret = firstEnv(
      "MICROSOFT_OAUTH_CLIENT_SECRET",
      "AZURE_AD_CLIENT_SECRET",
      "MICROSOFT_CLIENT_SECRET",
    );
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      tenant: firstEnv("MICROSOFT_OAUTH_TENANT", "AZURE_AD_TENANT_ID") || "common",
    };
  }
  if (family === "yahoo") {
    const clientId = firstEnv("YAHOO_OAUTH_CLIENT_ID", "YAHOO_CLIENT_ID");
    const clientSecret = firstEnv("YAHOO_OAUTH_CLIENT_SECRET", "YAHOO_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
  }
  const clientId = firstEnv("DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_CLIENT_ID");
  const clientSecret = firstEnv("DOCUSIGN_SECRET_KEY", "DOCUSIGN_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, authBase: docusignAuthBase() };
}

export function envHasOauthApp(family: ByoOauthFamily): boolean {
  return envOauthApp(family) !== null;
}

export function isPlatformHostedGoogleOauth(
  provider: string,
): provider is (typeof PLATFORM_GOOGLE_OAUTH_IDS)[number] {
  return (PLATFORM_GOOGLE_OAUTH_IDS as readonly string[]).includes(provider);
}

/** Agency Admin never pastes Google Cloud client credentials. */
export function showsByoCredentialPasteForm(provider: ByoOauthProviderId): boolean {
  return !isPlatformHostedGoogleOauth(provider);
}

/**
 * Platform Google env wins over any leftover Settings paste.
 * Missing Google env does not fall back to pasted Client ID / Secret.
 * Yahoo / Microsoft / DocuSign still prefer pasted BYO, then env.
 */
export function pickOauthClientApp(input: {
  family: ByoOauthFamily;
  settings: { clientId: string; clientSecret: string } | null;
  env: EnvOauthApp | null;
}): ResolvedOauthApp | null {
  const env =
    input.env?.clientId.trim() && input.env.clientSecret.trim() ? input.env : null;
  const settings =
    input.settings?.clientId.trim() && input.settings.clientSecret
      ? { clientId: input.settings.clientId.trim(), clientSecret: input.settings.clientSecret }
      : null;

  if (input.family === "google") {
    if (!env) return null;
    return { ...env, source: "env" };
  }
  if (settings) {
    return {
      ...settings,
      source: "settings",
      tenant: env?.tenant,
      authBase: env?.authBase,
    };
  }
  if (!env) return null;
  return { ...env, source: "env" };
}

export function startByoOauthCredentialNotice(
  provider: ByoOauthProviderId,
  resolved: { source: "settings" | "env" } | null,
): typeof GOOGLE_CONNECT_NOT_SETUP_NOTICE | "needs-credentials" | null {
  if (isPlatformHostedGoogleOauth(provider)) {
    return resolved?.source === "env" ? null : GOOGLE_CONNECT_NOT_SETUP_NOTICE;
  }
  if (resolved) return null;
  return "needs-credentials";
}
