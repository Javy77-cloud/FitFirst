import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rangesOverlap } from "./calendar-busy";
import { canConnectByoIntegration, gmailConnectCopy } from "./connect-policy";
import {
  GOOGLE_CONNECT_NOT_SETUP_COPY,
  GOOGLE_CONNECT_NOT_SETUP_NOTICE,
  isPlatformHostedGoogleOauth,
  pickOauthClientApp,
  showsByoCredentialPasteForm,
  startByoOauthCredentialNotice,
} from "./oauth-env";
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
    expect(gmailConnectCopy(false)).toMatch(/one-click Google Connect/i);
    expect(gmailConnectCopy(true)).not.toMatch(/owns the Google Cloud app/i);
  });

  it("hides Client ID paste for Google providers and keeps it for Yahoo / Outlook / DocuSign", () => {
    expect(isPlatformHostedGoogleOauth("gmail")).toBe(true);
    expect(isPlatformHostedGoogleOauth("google_calendar")).toBe(true);
    expect(isPlatformHostedGoogleOauth("google_meet")).toBe(true);
    expect(isPlatformHostedGoogleOauth("yahoo")).toBe(false);
    expect(isPlatformHostedGoogleOauth("outlook_calendar")).toBe(false);
    expect(isPlatformHostedGoogleOauth("docusign")).toBe(false);
    expect(showsByoCredentialPasteForm("gmail")).toBe(false);
    expect(showsByoCredentialPasteForm("google_calendar")).toBe(false);
    expect(showsByoCredentialPasteForm("google_meet")).toBe(false);
    expect(showsByoCredentialPasteForm("yahoo")).toBe(true);
    expect(showsByoCredentialPasteForm("outlook_calendar")).toBe(true);
    expect(showsByoCredentialPasteForm("docusign")).toBe(true);
  });

  it("prefers platform Google env over pasted BYO and refuses Google paste fallback", () => {
    const pasted = {
      clientId: "agency-pasted.apps.googleusercontent.com",
      clientSecret: "pasted-agency-secret",
    };
    const platform = {
      clientId: "platform.apps.googleusercontent.com",
      clientSecret: "platform-only-secret",
    };
    expect(
      pickOauthClientApp({
        family: "google",
        settings: pasted,
        env: platform,
      }),
    ).toEqual({ ...platform, source: "env" });
    expect(
      pickOauthClientApp({
        family: "google",
        settings: pasted,
        env: null,
      }),
    ).toBeNull();
    expect(
      pickOauthClientApp({
        family: "yahoo",
        settings: { clientId: "yahoo-app", clientSecret: "yahoo-secret" },
        env: { clientId: "env-yahoo", clientSecret: "env-secret" },
      }),
    ).toMatchObject({ clientId: "yahoo-app", source: "settings" });
    expect(
      pickOauthClientApp({
        family: "docusign",
        settings: null,
        env: { clientId: "ik", clientSecret: "sk", authBase: "https://account-d.docusign.com" },
      }),
    ).toMatchObject({ clientId: "ik", source: "env" });
  });

  it("starts Google OAuth from platform env and never asks Admin to paste a Client ID", () => {
    expect(startByoOauthCredentialNotice("gmail", { source: "env" })).toBeNull();
    expect(startByoOauthCredentialNotice("google_calendar", { source: "env" })).toBeNull();
    expect(startByoOauthCredentialNotice("gmail", { source: "settings" })).toBe(
      GOOGLE_CONNECT_NOT_SETUP_NOTICE,
    );
    expect(startByoOauthCredentialNotice("gmail", null)).toBe(GOOGLE_CONNECT_NOT_SETUP_NOTICE);
    expect(startByoOauthCredentialNotice("google_calendar", null)).toBe(GOOGLE_CONNECT_NOT_SETUP_NOTICE);
    expect(startByoOauthCredentialNotice("google_meet", null)).toBe(GOOGLE_CONNECT_NOT_SETUP_NOTICE);
    expect(startByoOauthCredentialNotice("yahoo", null)).toBe("needs-credentials");
    expect(startByoOauthCredentialNotice("outlook_calendar", null)).toBe("needs-credentials");
    expect(GOOGLE_CONNECT_NOT_SETUP_COPY).toMatch(/isn’t set up on this FitFirst install/i);
    expect(GOOGLE_CONNECT_NOT_SETUP_COPY).toMatch(/does not paste a Client ID/i);
    expect(GOOGLE_CONNECT_NOT_SETUP_COPY).not.toMatch(/paste the agency/i);

    const startAction = readFileSync("src/app/actions/byo-oauth.ts", "utf8");
    expect(startAction).toMatch(/isPlatformHostedGoogleOauth\(raw\) && !envHasOauthApp\("google"\)/);
    expect(startAction).toMatch(/startByoOauthCredentialNotice/);
    expect(startAction).toMatch(/Google Connect does not take a pasted Client ID/);
    expect(startAction).toMatch(/isPlatformHostedGoogleOauth\(raw\) && !envHasOauthApp\("google"\)/);

    const card = readFileSync("src/components/settings/byo-oauth-card.tsx", "utf8");
    expect(card).toMatch(/showsByoCredentialPasteForm\(item\.id\)/);
    expect(card).toMatch(/GOOGLE_CONNECT_NOT_SETUP_COPY/);
    expect(card).toMatch(/data-google-one-click/);
    expect(card).toMatch(/!platformGoogle && item\.hasEnvCredentials/);
    expect(card).toMatch(/Admin never pastes a Client ID/);
    expect(BYO_OAUTH_SPECS.gmail.worksWhen).toMatch(/One-click Google Connect/i);
    expect(BYO_OAUTH_SPECS.gmail.worksWhen).not.toMatch(/Agency Google Cloud OAuth web client/i);
    expect(BYO_OAUTH_SPECS.google_calendar.worksWhen).toMatch(/platform Google Connect/i);
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
