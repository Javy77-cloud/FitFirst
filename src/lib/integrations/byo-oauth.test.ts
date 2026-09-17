import { describe, expect, it } from "vitest";
import { rangesOverlap } from "./calendar-busy";
import { canConnectByoIntegration, gmailConnectCopy } from "./connect-policy";
import {
  BYO_OAUTH_CALLBACK_PATH,
  BYO_OAUTH_SPECS,
  byoOauthRedirectUri,
  byoOauthSpec,
  isByoOauthProviderId,
} from "./oauth-specs";
import { buildByoAuthorizeUrl, createPkcePair, decodeByoOauthState, encodeByoOauthState } from "./oauth";

describe("BYO OAuth wave", () => {
  it("covers the free-testing providers and keeps paid vendors out", () => {
    expect(Object.keys(BYO_OAUTH_SPECS)).toEqual([
      "gmail",
      "yahoo",
      "google_calendar",
      "outlook_calendar",
      "google_meet",
      "docusign",
    ]);
    expect(isByoOauthProviderId("gmail")).toBe(true);
    expect(isByoOauthProviderId("twilio")).toBe(false);
    expect(isByoOauthProviderId("nylas")).toBe(false);
    expect(BYO_OAUTH_SPECS.docusign.authorizeUrl).toContain("account-d.docusign.com");
    expect(BYO_OAUTH_SPECS.yahoo.scopes).toContain("openid");
    expect(BYO_OAUTH_SPECS.gmail.scopes.join(" ")).toMatch(/gmail.send/);
    expect(BYO_OAUTH_SPECS.google_calendar.scopes.join(" ")).toMatch(/calendar.freebusy/);
    expect(BYO_OAUTH_SPECS.outlook_calendar.scopes).toContain("Calendars.Read");
  });

  it("builds Google and Microsoft authorize URLs from the agency client — no FitFirst key", () => {
    const gmail = new URL(
      buildByoAuthorizeUrl(byoOauthSpec("gmail"), {
        clientId: "agency.apps.googleusercontent.com",
        redirectUri: "http://127.0.0.1:43147/api/integrations/oauth/callback",
        state: "signed",
        codeChallenge: "abc",
      }),
    );
    expect(gmail.hostname).toBe("accounts.google.com");
    expect(gmail.searchParams.get("client_id")).toBe("agency.apps.googleusercontent.com");
    expect(gmail.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:43147/api/integrations/oauth/callback",
    );
    expect(gmail.searchParams.get("access_type")).toBe("offline");
    expect(gmail.searchParams.get("code_challenge_method")).toBe("S256");
    expect(gmail.searchParams.get("client_id")).not.toMatch(/fitfirst/i);

    const outlook = new URL(
      buildByoAuthorizeUrl(byoOauthSpec("outlook_calendar"), {
        clientId: "azure-app-id",
        redirectUri: "http://127.0.0.1:43147/api/integrations/oauth/callback",
        state: "s",
        authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      }),
    );
    expect(outlook.hostname).toBe("login.microsoftonline.com");
    expect(outlook.searchParams.get("scope")).toContain("Calendars.Read");
  });

  it("signs OAuth state with an optional PKCE verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toHaveLength(43);
    expect(challenge).toHaveLength(43);
    const token = encodeByoOauthState(
      {
        p: "gmail",
        n: "n1",
        r: "/settings/email",
        exp: Date.now() + 60_000,
        v: verifier,
        u: "user-1",
      },
      "test-hmac",
    );
    const parsed = decodeByoOauthState(token, "test-hmac");
    expect(parsed?.p).toBe("gmail");
    expect(parsed?.v).toBe(verifier);
    expect(decodeByoOauthState(`${token}x`, "test-hmac")).toBeNull();
    expect(byoOauthRedirectUri("http://127.0.0.1:43147/")).toBe(
      `http://127.0.0.1:43147${BYO_OAUTH_CALLBACK_PATH}`,
    );
  });

  it("lets Agency Admin connect and describes solo personal Gmail", () => {
    expect(canConnectByoIntegration({ signedIn: true, isAdmin: true })).toBe(true);
    expect(canConnectByoIntegration({ signedIn: true, isAdmin: false })).toBe(false);
    expect(canConnectByoIntegration({ signedIn: false, isAdmin: false })).toBe(false);
    expect(gmailConnectCopy(true)).toMatch(/personal inbox/i);
    expect(gmailConnectCopy(false)).toMatch(/Agency Admin/i);
  });

  it("treats overlapping busy windows as conflicts", () => {
    const a = new Date("2026-09-17T15:00:00Z");
    const b = new Date("2026-09-17T16:00:00Z");
    const c = new Date("2026-09-17T15:30:00Z");
    const d = new Date("2026-09-17T15:45:00Z");
    const e = new Date("2026-09-17T16:00:00Z");
    const f = new Date("2026-09-17T17:00:00Z");
    expect(rangesOverlap(a, b, c, d)).toBe(true);
    expect(rangesOverlap(a, b, e, f)).toBe(false);
    expect(rangesOverlap(a, b, a, b)).toBe(true);
  });
});
