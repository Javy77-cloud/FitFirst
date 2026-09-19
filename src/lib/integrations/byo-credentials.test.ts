import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isMaskedSecretInput } from "@/lib/secrets/vault";
import {
  isByoPlaceholderSecret,
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

  it("reads live form fields and stays on the card after DocuSign save", () => {
    const action = source("src/app/actions/byo-oauth.ts");
    expect(action).toMatch(/planByoClientId/);
    expect(action).toMatch(/loadStoredByoApp/);
    expect(action).toMatch(/saveByoApp/);
    expect(action).not.toMatch(/if \(!clientId\) redirect/);

    const form = source("src/components/settings/byo-oauth-credentials-form.tsx");
    expect(form).toMatch(/readListFormData/);
    expect(form).toMatch(/router\.refresh\(\)/);
    expect(form).toMatch(/data-ff-byo-credentials-form/);
    expect(form).toMatch(/item\.hasStoredCredentials/);
    expect(form).toMatch(/Replace \/ Save credentials/);
    expect(form).not.toMatch(/hasCredentials && !item\.hasEnvCredentials/);

    const card = source("src/components/settings/byo-oauth-card.tsx");
    expect(card).toMatch(/ByoOauthCredentialsForm/);
    expect(card).toMatch(/clearByoOauthCredentials/);
    expect(card).toMatch(/data-ff-byo-clear/);
    expect(card).not.toMatch(/hasCredentials && !item\.hasEnvCredentials/);
    expect(card).toMatch(/environment credentials still apply after clear/i);

    const store = source("src/lib/integrations/oauth-store.ts");
    expect(store).toMatch(/connectMode: \"credentials\"/);
    expect(store).toMatch(/planByoSecretWrite/);
  });
});
