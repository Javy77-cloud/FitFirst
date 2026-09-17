import type { ByoOauthFamily } from "./oauth-specs";
import { docusignAuthBase } from "./oauth";

export type EnvOauthApp = {
  clientId: string;
  clientSecret: string;
  tenant?: string;
  authBase?: string;
};

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
