import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  decodeOauthState,
  encodeOauthState,
  isOauthByoPlatform,
  isPaidWallPlatform,
  MAPS_FREE_LINK_NOTE,
  META_GRAPH_VERSION,
  socialByoSpec,
  socialConnectStatus,
  socialConnectStatusLabel,
  socialOauthRedirectUri,
  SOCIAL_BYO_SPECS,
  SOCIAL_OAUTH_CALLBACK_PATH,
} from "./byo";
import { SOCIAL_PLATFORM_IDS } from "./platforms";

describe("social BYO connect", () => {
  it("covers every social platform and keeps X as the paid wall", () => {
    expect(Object.keys(SOCIAL_BYO_SPECS).sort()).toEqual([...SOCIAL_PLATFORM_IDS].sort());
    expect(isOauthByoPlatform("facebook")).toBe(true);
    expect(isOauthByoPlatform("instagram")).toBe(true);
    expect(isOauthByoPlatform("google_business_profile")).toBe(true);
    expect(isOauthByoPlatform("linkedin")).toBe(true);
    expect(isPaidWallPlatform("x")).toBe(true);
    expect(isPaidWallPlatform("facebook")).toBe(false);
    expect(SOCIAL_BYO_SPECS.instagram.shareCredentialsWith).toBe("facebook");
    expect(MAPS_FREE_LINK_NOTE).toMatch(/free public search links/i);
    expect(MAPS_FREE_LINK_NOTE).toMatch(/not a paid Maps Platform seat/i);
  });

  it("builds a real Meta authorize URL from the agency App ID — no FitFirst key", () => {
    const spec = socialByoSpec("facebook");
    const url = new URL(
      buildAuthorizeUrl(spec, {
        clientId: "agency-meta-app-123",
        redirectUri: "http://127.0.0.1:43147/api/social/oauth/callback",
        state: "signed-state",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`,
    );
    expect(url.searchParams.get("client_id")).toBe("agency-meta-app-123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:43147/api/social/oauth/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("pages_show_list");
    expect(url.searchParams.get("client_id")).not.toMatch(/fitfirst/i);
  });

  it("builds Google and LinkedIn authorize URLs for free developer apps", () => {
    const google = new URL(
      buildAuthorizeUrl(socialByoSpec("google_business_profile"), {
        clientId: "agency.apps.googleusercontent.com",
        redirectUri: "http://localhost:43147/api/social/oauth/callback",
        state: "g",
      }),
    );
    expect(google.hostname).toBe("accounts.google.com");
    expect(google.searchParams.get("scope")).toContain("business.manage");
    expect(google.searchParams.get("access_type")).toBe("offline");

    const li = new URL(
      buildAuthorizeUrl(socialByoSpec("linkedin"), {
        clientId: "li-client",
        redirectUri: "http://localhost:43147/api/social/oauth/callback",
        state: "l",
      }),
    );
    expect(li.hostname).toBe("www.linkedin.com");
    expect(li.searchParams.get("scope")).toBe("openid profile");
  });

  it("signs OAuth state and rejects a tampered or expired payload", () => {
    const secret = "test-hmac-secret";
    const token = encodeOauthState(
      { p: "facebook", n: "nonce-1", r: "/settings/social", exp: Date.now() + 60_000 },
      secret,
    );
    const parsed = decodeOauthState(token, secret);
    expect(parsed?.p).toBe("facebook");
    expect(parsed?.r).toBe("/settings/social");
    expect(decodeOauthState(`${token}x`, secret)).toBeNull();
    const expired = encodeOauthState(
      { p: "instagram", n: "n", r: "/settings/integrations", exp: Date.now() - 1 },
      secret,
    );
    expect(decodeOauthState(expired, secret)).toBeNull();
  });

  it("labels BYO vs demo vs paid wall without inventing a live sync", () => {
    expect(
      socialConnectStatusLabel(
        socialConnectStatus({
          connected: true,
          hasCredentials: true,
          connectMode: "byo",
          paidWall: false,
        }),
      ),
    ).toBe("Connected (BYO)");
    expect(
      socialConnectStatusLabel(
        socialConnectStatus({
          connected: true,
          hasCredentials: false,
          connectMode: "demo",
          paidWall: false,
        }),
      ),
    ).toBe("Connected (demo)");
    expect(
      socialConnectStatusLabel(
        socialConnectStatus({
          connected: false,
          hasCredentials: true,
          connectMode: null,
          paidWall: false,
        }),
      ),
    ).toBe("Credentials saved");
    expect(
      socialConnectStatusLabel(
        socialConnectStatus({
          connected: false,
          hasCredentials: false,
          connectMode: null,
          paidWall: true,
        }),
      ),
    ).toBe("Paid wall");
    expect(socialOauthRedirectUri("http://127.0.0.1:43147/")).toBe(
      `http://127.0.0.1:43147${SOCIAL_OAUTH_CALLBACK_PATH}`,
    );
  });

  it("does not tell the catalog to paste secrets in the provider byoNote", () => {
    for (const spec of Object.values(SOCIAL_BYO_SPECS)) {
      expect(spec.developerUrl).toMatch(/^https:\/\//);
      expect(spec.wallBody).toMatch(/FitFirst does not buy/i);
    }
  });
});
