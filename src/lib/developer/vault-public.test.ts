import { describe, expect, it } from "vitest";
import { looksLikeMaskedSecret, publicVaultStatus, SECRET_MASK } from "./vault-public";

describe("API vault public view", () => {
  it("never returns plaintext — configured keys are ****************", () => {
    const view = publicVaultStatus({ configured: true, source: "vault", environment: "sandbox" });
    expect(view.masked).toBe(SECRET_MASK);
    expect(view.masked).toBe("****************");
    expect(JSON.stringify(view)).not.toMatch(/l7[\w-]+|sk_|secret-value/i);
    expect(view.configured).toBe(true);
    expect(view.label).toBe("FedEx Address API");
  });

  it("shows empty mask when nothing is configured", () => {
    const view = publicVaultStatus({ configured: false, source: "none", environment: "sandbox" });
    expect(view.configured).toBe(false);
    expect(view.masked).toBe("");
  });

  it("flags masked or empty vault input without treating a real key as a mask", () => {
    expect(looksLikeMaskedSecret("")).toBe(true);
    expect(looksLikeMaskedSecret(SECRET_MASK)).toBe(true);
    expect(looksLikeMaskedSecret("ff_hs_wh_example_not_a_live_secret")).toBe(false);
  });
});
