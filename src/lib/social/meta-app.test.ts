import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getIntegrationProvider } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import { SocialByoCard } from "@/components/social/social-byo-card";
import {
  envHasMetaApp,
  envMetaApp,
  isPlatformHostedSocial,
  META_APP_ID_ENV_KEYS,
  META_APP_SECRET_ENV_KEYS,
  META_VAULT_PROVIDER,
  platformHostedConnectMissingCopy,
} from "./meta-app";

function catalogItem(
  id: "facebook" | "instagram" | "linkedin",
  overrides: Partial<CatalogItem> = {},
): CatalogItem {
  const provider = getIntegrationProvider(id);
  return {
    ...provider,
    connected: false,
    accountLabel: null,
    lastConnectStatus: null,
    ownerUserId: null,
    clientId: null,
    hasCredentials: false,
    hasStoredCredentials: false,
    connectMode: null,
    lastOauthError: null,
    hasEnvCredentials: false,
    hasRefreshToken: false,
    tokenAccountEmail: null,
    ...overrides,
  };
}

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("platform-hosted Meta OAuth gate", () => {
  it("treats Facebook and Instagram as hosted — not LinkedIn, X, or GBP", () => {
    expect(isPlatformHostedSocial("facebook")).toBe(true);
    expect(isPlatformHostedSocial("instagram")).toBe(true);
    expect(isPlatformHostedSocial("linkedin")).toBe(false);
    expect(isPlatformHostedSocial("x")).toBe(false);
    expect(isPlatformHostedSocial("google_business_profile")).toBe(false);
  });

  it("reads META_APP_ID / META_APP_SECRET and common Facebook aliases", () => {
    expect(envMetaApp({})).toBeNull();
    expect(envHasMetaApp({})).toBe(false);
    expect(
      envMetaApp({
        META_APP_ID: "  fitfirst-meta-app  ",
        META_APP_SECRET: "platform-secret",
      }),
    ).toEqual({
      appId: "fitfirst-meta-app",
      appSecret: "platform-secret",
      source: "env",
    });
    expect(
      envMetaApp({
        FACEBOOK_APP_ID: "fb-alias",
        FACEBOOK_APP_SECRET: "fb-secret",
      })?.appId,
    ).toBe("fb-alias");
    expect(
      envMetaApp({
        META_CLIENT_ID: "client-alias",
        META_CLIENT_SECRET: "client-secret",
      })?.source,
    ).toBe("env");
    expect(envMetaApp({ META_APP_ID: "only-id" })).toBeNull();
    expect(envMetaApp({ META_APP_SECRET: "only-secret" })).toBeNull();
    expect(META_APP_ID_ENV_KEYS).toContain("META_APP_ID");
    expect(META_APP_SECRET_ENV_KEYS).toContain("META_APP_SECRET");
  });

  it("uses the honest empty-state copy when the platform Meta app is missing", () => {
    expect(platformHostedConnectMissingCopy("facebook")).toBe(
      "Facebook Connect isn’t set up on this FitFirst install",
    );
    expect(platformHostedConnectMissingCopy("instagram")).toBe(
      "Instagram Connect isn’t set up on this FitFirst install",
    );
  });

  it("hides Admin paste of Meta App ID / Secret and keeps Connect / Disconnect", () => {
    const card = source("src/components/social/social-byo-card.tsx");
    expect(card).toMatch(/isPlatformHostedSocial/);
    expect(card).toMatch(/Connect Facebook/);
    expect(card).toMatch(/Connect Instagram/);
    expect(card).toMatch(/platformHostedConnectMissingCopy/);
    expect(card).toMatch(/Agents never connect social/);
    expect(card).toMatch(/data-platform-hosted/);
    expect(card).toMatch(/data-meta-empty/);
    expect(card).not.toMatch(/name="clientId"[\s\S]{0,200}facebook/);
    const hostedBlock = card.slice(card.indexOf("function HostedMetaActions"));
    expect(hostedBlock).not.toMatch(/name="clientId"/);
    expect(hostedBlock).not.toMatch(/name="clientSecret"/);
    expect(hostedBlock).not.toMatch(/Save credentials/);
    expect(hostedBlock).toMatch(/Disconnect/);

    const actions = source("src/app/actions/social.ts");
    expect(actions).toMatch(/isPlatformHostedSocial\(raw\)/);
    expect(actions).toMatch(/not-configured/);

    const store = source("src/lib/social/byo-store.ts");
    expect(store).toMatch(/loadMetaApp/);
    expect(store).toMatch(/not_configured/);
    expect(store).not.toMatch(/Paste the agency \$\{spec\.clientIdLabel\}[\s\S]{0,80}facebook/);
  });

  it("renders Admin Connect / empty state and never shows Meta App ID fields", () => {
    const empty = renderToString(
      createElement(SocialByoCard, { item: catalogItem("facebook"), canEdit: true }),
    );
    expect(empty).toContain("Facebook Connect isn’t set up on this FitFirst install");
    expect(empty).toContain('data-meta-empty="1"');
    expect(empty).not.toContain('name="clientId"');
    expect(empty).not.toContain("Meta App ID");
    expect(empty).not.toContain("Save credentials");

    const ready = renderToString(
      createElement(SocialByoCard, {
        item: catalogItem("instagram", { hasEnvCredentials: true, hasCredentials: true }),
        canEdit: true,
      }),
    );
    expect(ready).toContain("Connect Instagram");
    expect(ready).toContain("FitFirst hosts the Meta app");
    expect(ready).not.toContain('name="clientId"');
    expect(ready).not.toContain("Save credentials");

    const agent = renderToString(
      createElement(SocialByoCard, {
        item: catalogItem("facebook", { hasEnvCredentials: true }),
        canEdit: false,
      }),
    );
    expect(agent).toContain("Agents never connect social");
    expect(agent).not.toContain("Connect Facebook");

    const linkedin = renderToString(
      createElement(SocialByoCard, { item: catalogItem("linkedin"), canEdit: true }),
    );
    expect(linkedin).toContain("LinkedIn Client ID");
    expect(linkedin).toMatch(/name=["']clientId["']/);
    expect(linkedin).toContain("Save Credentials");
  });

  it("keeps Meta secrets on the server: env example + site-developer vault only", () => {
    const envExample = source(".env.example");
    expect(envExample).toMatch(/META_APP_ID=/);
    expect(envExample).toMatch(/META_APP_SECRET=/);
    expect(envExample).toMatch(/Admin never pastes/);
    expect(envExample).not.toMatch(/META_APP_SECRET=[^\n\s#]+/);

    expect(source("src/lib/social/meta-app.ts")).toMatch(/META_VAULT_PROVIDER/);
    expect(META_VAULT_PROVIDER).toBe("meta");
    expect(source("src/components/developer-hub/api-vault-panel.tsx")).toMatch(/data-ff-vault-provider="meta"/);
    expect(source("src/app/actions/developer-vault.ts")).toMatch(/saveMetaVault/);
    expect(source("src/app/settings/developer-hub/api-vault/page.tsx")).toMatch(/loadMetaPublicStatus/);

    const catalog = source("src/lib/integrations/catalog-store.ts");
    expect(catalog).toMatch(/hosted \|\| platformGoogle \? null/);
    expect(catalog).toMatch(/metaAppIsConfigured/);

    expect(source("src/app/settings/social/page.tsx")).toMatch(
      /Facebook Connect isn’t set up on this FitFirst install/,
    );
    expect(source("src/app/settings/integrations/page.tsx")).toMatch(
      /Instagram Connect isn’t set up on this FitFirst install/,
    );
  });
});
