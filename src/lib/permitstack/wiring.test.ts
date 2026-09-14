import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("PermitStack Fill wiring", () => {
  it("hooks history URL, BYO key, vault provider, and empty-only orchestrate", () => {
    const client = source("src/lib/permitstack/client.ts");
    const key = source("src/lib/permitstack/key.ts");
    const action = source("src/app/actions/quote-sheet.ts");
    const orchestrate = source("src/lib/property-fill/orchestrate.ts");
    const merge = source("src/lib/property-fill/merge.ts");
    const env = source(".env.example");
    const vault = source("src/lib/developer/vault-public.ts");
    const panel = source("src/components/developer-hub/api-vault-panel.tsx");

    expect(key).toMatch(/https:\/\/api\.permit-stack\.com\/v1\/property\/history/);
    expect(client).toMatch(/X-API-Key/);
    expect(key).toMatch(/PERMITSTACK_API_KEY/);
    expect(action).toMatch(/loadPermitStackApiKey/);
    expect(action).toMatch(/permitStackKey/);
    expect(orchestrate).toMatch(/searchPermitStackHistory/);
    expect(merge).toMatch(/applyEmptyOnly\(parts\.permitStack, "permitstack"\)/);
    expect(env).toMatch(/PERMITSTACK_API_KEY=/);
    expect(vault).toMatch(/PERMITSTACK_VAULT_PROVIDER = "permitstack"/);
    expect(panel).toMatch(/data-ff-vault-provider=\{provider\}/);
    expect(panel).toMatch(/permitstack/);
    expect(panel).toMatch(/PERMITSTACK_API_KEY/);
  });

  it("keeps Gemini / docs Fill on a separate path", () => {
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/runFillDealSheets/);
    expect(action.indexOf("if (step === \"property\")")).toBeLessThan(action.indexOf("// docs"));
    expect(action).toMatch(/Docs \/ Gemini stay on the separate docs Fill step/);
  });
});
