import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isMaskedSecretInput } from "@/lib/secrets/vault";
import {
  byoOauthWallCopy,
  isByoPlaceholderSecret,
  looksLikeInvalidClientSecretError,
  pickByoFamilyCredentials,
  planByoClientId,
  planByoSecretWrite,
} from "./byo-credentials";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("BYO OAuth credential save", () => {
  it("does not treat a real secret that contains * as a keep-existing mask", () => {
    expect(isByoPlaceholderSecret("")).toBe(true);
    expect(isByoPlaceholderSecret("   ")).toBe(true);
    expect(isByoPlaceholderSecret("••••••••••••")).toBe(true);
    expect(isByoPlaceholderSecret("****************")).toBe(true);
    expect(isByoPlaceholderSecret("fi••••mo")).toBe(true);
    expect(isByoPlaceholderSecret("docusign-secret-with*star")).toBe(false);
    expect(isByoPlaceholderSecret("abc123SecretKey")).toBe(false);
    // Global vault helper still flags any `*` — that is why DocuSign first-save
    // used to drop the Secret Key and then look unset after redirect.
    expect(isMaskedSecretInput("docusign-secret-with*star")).toBe(true);
  });

  it("rejects a first-time blank/mask secret and keeps an existing one", () => {
    expect(planByoSecretWrite({ incoming: "", hasExistingSecret: false })).toEqual({
      action: "reject",
      message: "Paste the agency Secret Key. A blank or masked field does not save.",
    });
    expect(planByoSecretWrite({ incoming: "••••••••••••", hasExistingSecret: false }).action).toBe(
      "reject",
    );
    expect(planByoSecretWrite({ incoming: "••••••••••••", hasExistingSecret: true })).toEqual({
      action: "keep",
    });
    expect(planByoSecretWrite({ incoming: "live-secret-key", hasExistingSecret: false })).toEqual({
      action: "write",
      secret: "live-secret-key",
    });
    expect(
      planByoSecretWrite({
        incoming: "••••••••••••",
        hasExistingSecret: true,
        clientIdUnchanged: true,
      }),
    ).toEqual({ action: "keep" });
    expect(
      planByoSecretWrite({
        incoming: "",
        hasExistingSecret: true,
        clientIdUnchanged: false,
      }).action,
    ).toBe("reject");
    expect(
      planByoSecretWrite({
        incoming: "rotated-secret",
        hasExistingSecret: true,
        clientIdUnchanged: false,
      }),
    ).toEqual({ action: "write", secret: "rotated-secret" });
  });

  it("requires an Integration Key / Client ID", () => {
    expect(planByoClientId({ incoming: "", existing: null }).ok).toBe(false);
    expect(planByoClientId({ incoming: "  ", existing: "" }).ok).toBe(false);
    expect(planByoClientId({ incoming: "ik-1", existing: null })).toEqual({
      ok: true,
      clientId: "ik-1",
    });
    expect(planByoClientId({ incoming: "", existing: "ik-kept" })).toEqual({
      ok: true,
      clientId: "ik-kept",
    });
  });

  it("saves credentials via redirect and Connect persists a typed secret", () => {
    const action = source("src/app/actions/byo-oauth.ts");
    expect(action).toMatch(/planByoClientId/);
    expect(action).toMatch(/loadStoredByoApp/);
    expect(action).toMatch(/saveByoApp/);
    expect(action).toMatch(/isByoPlaceholderSecret/);
    expect(action).toMatch(/notice=credentials-saved/);
    expect(action).not.toMatch(/if \(!clientId\) redirect/);

    const form = source("src/components/settings/byo-oauth-credentials-form.tsx");
    expect(form).toMatch(/formAction=\{startByoOauth\}/);
    expect(form).toMatch(/action=\{saveByoOauthCredentials\}/);
    expect(form).toMatch(/data-ff-byo-credentials-form/);
    expect(form).toMatch(/item\.hasStoredCredentials/);
    expect(form).toMatch(/Replace \/ Save credentials/);
    expect(form).not.toMatch(/router\.refresh/);
    expect(form).not.toMatch(/••••/);

    const card = source("src/components/settings/byo-oauth-card.tsx");
    expect(card).toMatch(/ByoOauthCredentialsForm/);
    expect(card).toMatch(/showConnect=/);
    expect(card).toMatch(/clearByoOauthCredentials/);
    expect(card).toMatch(/data-ff-byo-clear/);
    expect(card).not.toMatch(/hasCredentials && !item\.hasEnvCredentials/);
    expect(card).toMatch(/environment credentials still apply after clear/i);

    const store = source("src/lib/integrations/oauth-store.ts");
    expect(store).toMatch(/connectMode: "credentials"/);
    expect(store).toMatch(/planByoSecretWrite/);
    expect(store).toMatch(/pickByoFamilyCredentials/);
    expect(store).toMatch(/propagateGoogleFamilyCredentials/);
  });

  it("reuses a connected Calendar sibling secret when Gmail's vault is stale-invalid", () => {
    const gmail = {
      provider: "gmail",
      clientId: "stale.apps.googleusercontent.com",
      clientSecret: "old-invalid-secret",
      connected: false,
      lastOauthError: "The provided client secret is invalid.",
      updatedAtMs: 200,
    };
    const calendar = {
      provider: "google_calendar",
      clientId: "live.apps.googleusercontent.com",
      clientSecret: "calendar-working-secret",
      connected: true,
      lastOauthError: null,
      updatedAtMs: 100,
    };
    expect(
      pickByoFamilyCredentials({
        own: gmail,
        siblings: [calendar],
      }),
    ).toEqual({
      clientId: "live.apps.googleusercontent.com",
      clientSecret: "calendar-working-secret",
      source: "sibling",
    });
    expect(
      pickByoFamilyCredentials({
        form: { clientId: "typed.apps.googleusercontent.com", clientSecret: "fresh-typed-secret" },
        own: gmail,
        siblings: [calendar],
      }),
    ).toEqual({
      clientId: "typed.apps.googleusercontent.com",
      clientSecret: "fresh-typed-secret",
      source: "form",
    });
    expect(
      pickByoFamilyCredentials({
        form: { clientId: "", clientSecret: "••••••••••••" },
        own: gmail,
        siblings: [calendar],
      })?.source,
    ).toBe("sibling");
    expect(
      pickByoFamilyCredentials({
        own: { ...gmail, lastOauthError: null },
        siblings: [calendar],
      })?.source,
    ).toBe("sibling");
    expect(
      pickByoFamilyCredentials({
        own: { ...gmail, lastOauthError: null },
        siblings: [],
      }),
    ).toMatchObject({ source: "own", clientSecret: "old-invalid-secret" });
    expect(looksLikeInvalidClientSecretError("The provided client secret is invalid.")).toBe(true);
    expect(looksLikeInvalidClientSecretError("invalid_client")).toBe(true);
    expect(looksLikeInvalidClientSecretError("redirect_uri_mismatch")).toBe(false);
    expect(byoOauthWallCopy("The provided client secret is invalid.")).toMatch(
      /The provided client secret is invalid/,
    );
    expect(byoOauthWallCopy(null)).toMatch(/Open the card for the error/);
  });
});
