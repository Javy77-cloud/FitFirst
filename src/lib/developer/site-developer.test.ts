import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertSiteDeveloperSession,
  sessionCanMutateSiteDeveloperVault,
  SignInRequiredError,
  SiteDeveloperOnlyError,
  userIsSiteDeveloper,
} from "./site-developer";

describe("site developer flag", () => {
  it("does not treat Admin as a site developer", () => {
    expect(
      userIsSiteDeveloper({ email: "javy@fitfirst.local", isSiteDeveloper: false }, { FF_SITE_DEVELOPER_EMAILS: "" }),
    ).toBe(false);
  });

  it("honors the users.is_site_developer column", () => {
    expect(userIsSiteDeveloper({ email: "maya@fitfirst.local", isSiteDeveloper: true }, {})).toBe(true);
  });

  it("honors FF_SITE_DEVELOPER_EMAILS without a seed wipe", () => {
    expect(
      userIsSiteDeveloper(
        { email: "javy@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(true);
    expect(
      userIsSiteDeveloper(
        { email: "maya@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(false);
  });
});

describe("site developer vault mutate gate", () => {
  const natasha = {
    signedIn: true,
    isAdmin: false,
    isSiteDeveloper: true,
    user: { email: "logan@fitfirst.local", isSiteDeveloper: true },
  };
  const plainAdmin = {
    signedIn: true,
    isAdmin: true,
    isSiteDeveloper: false,
    user: { email: "javy@fitfirst.local", isSiteDeveloper: false },
  };

  it("lets a developer-role site developer pass the mutate gate", () => {
    expect(sessionCanMutateSiteDeveloperVault(natasha)).toBe(true);
    expect(() => assertSiteDeveloperSession(natasha)).not.toThrow();
  });

  it("blocks an admin without the site-developer flag", () => {
    expect(sessionCanMutateSiteDeveloperVault(plainAdmin, { FF_SITE_DEVELOPER_EMAILS: "" })).toBe(false);
    expect(() => assertSiteDeveloperSession(plainAdmin, { FF_SITE_DEVELOPER_EMAILS: "" })).toThrow(
      SiteDeveloperOnlyError,
    );
  });

  it("rejects unsigned-in users with a sign-in error, not the site-developer flash", () => {
    expect(sessionCanMutateSiteDeveloperVault({ signedIn: false, isSiteDeveloper: true })).toBe(false);
    expect(() => assertSiteDeveloperSession({ signedIn: false, isSiteDeveloper: true })).toThrow(SignInRequiredError);
  });

  it("aligns vault page canEdit and action gate on isSiteDeveloper, not isAdmin", () => {
    const page = readFileSync("src/app/settings/developer-hub/api-vault/page.tsx", "utf8");
    const action = readFileSync("src/app/actions/developer-vault.ts", "utf8");
    expect(page).toMatch(/canEdit=\{session\.isSiteDeveloper\}/);
    expect(action).toMatch(/assertSiteDeveloperSession\(session\)/);
    expect(action).toMatch(/Sign in to continue/);
    expect(action).not.toMatch(/session\.isAdmin/);
    expect(action).not.toMatch(/AdminOnlyError/);
  });
});
