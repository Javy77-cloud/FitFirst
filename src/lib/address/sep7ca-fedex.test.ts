import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7ca FedEx address + developer vault", () => {
  it("ships an additive vault migrate and does not seed-wipe", () => {
    const sql = source("drizzle/0090_fedex_address_vault.sql");
    expect(sql).toMatch(/is_site_developer/);
    expect(sql).toMatch(/developer_api_vault/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(sql).toMatch(/Additive only/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/db:seed/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0090_fedex_address_vault/);
  });

  it("uses one AddressAutocomplete control on every address surface", () => {
    const control = source("src/components/custom-fields/field-control.tsx");
    expect(control).toMatch(/AddressAutocomplete/);
    expect(control).toMatch(/isStreetAddressField/);
    expect(source("src/components/address-autofill.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/components/crm/lead-form-fields.tsx")).toMatch(/AddressAutofill|AddressAutocomplete/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/AddressAutofill|AddressAutocomplete/);
    expect(source("src/components/deal/risk-form.tsx")).toMatch(/AddressAutofill|AddressAutocomplete/);
    expect(source("src/app/settings/offices/page.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/app/settings/profile/page.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/app/settings/communications/page.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/components/ams/holder-contact-form.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/components/ams/additional-interest-panel.tsx")).toMatch(/AddressAutocomplete/);
    expect(source("src/lib/custom-fields/types.ts")).toMatch(/"address"/);
  });

  it("keeps address fields as plain input when Mapbox is missing — no stub theater", () => {
    const ui = source("src/components/address-autocomplete.tsx");
    expect(ui).toMatch(/\/api\/address\/status/);
    expect(ui).toMatch(/\/api\/address\/suggest/);
    expect(ui).toMatch(/\/api\/address\/verify/);
    expect(ui).not.toMatch(/GOOGLE_MAPS_API_KEY/);
    expect(ui).not.toMatch(/Add FedEx/);
    expect(ui).not.toMatch(/Add a FedEx key/);
    expect(source("src/app/api/address/status/route.ts")).toMatch(/enabled/);
    expect(source("src/app/api/address/status/route.ts")).toMatch(/verifyEnabled/);
    expect(source("src/app/api/address/suggest/route.ts")).not.toMatch(/stub:\s*true/);
    expect(source("src/app/api/address/suggest/route.ts")).toMatch(/enabled:\s*false/);
  });

  it("calls the FedEx client only when credentials are present", () => {
    const client = source("src/lib/fedex/client.ts");
    expect(client).toMatch(/\/oauth\/token/);
    expect(client).toMatch(/\/address\/v1\/addresses\/resolve/);
    expect(client).toMatch(/fedexCredentialsReady/);
    expect(client).not.toMatch(/console\.log/);
    const verify = source("src/app/api/address/verify/route.ts");
    expect(verify).toMatch(/verifyFedExAddress/);
    expect(verify).toMatch(/loadFedExCredentials/);
    expect(verify).toMatch(/if \(!creds\)/);
  });

  it("masks the vault for admins and unlocks only for site developers", () => {
    const panel = source("src/components/developer-hub/api-vault-panel.tsx");
    expect(panel).toMatch(/SECRET_MASK/);
    expect(panel).toMatch(/Unlock vault/);
    expect(panel).toMatch(/canEdit/);
    expect(panel).toMatch(/Site developers only/);
    expect(panel).toMatch(/no reveal/);
    const page = source("src/app/settings/developer-hub/api-vault/page.tsx");
    expect(page).toMatch(/requireAdminOrDeveloperPage/);
    expect(page).toMatch(/session\.isSiteDeveloper/);
    expect(page).toMatch(/loadFedExPublicStatus/);
    const action = source("src/app/actions/developer-vault.ts");
    expect(action).toMatch(/userIsSiteDeveloper/);
    expect(action).toMatch(/saveFedExVault/);
    expect(action).not.toMatch(/console\.log/);
  });

  it("does not redesign Pipeline chips, Markets empty, bell, or the 320 rail", () => {
    expect(source("src/components/address-autocomplete.tsx")).not.toMatch(/data-ff-deal-right-rail/);
    expect(source("src/lib/developer/vault.ts")).not.toMatch(/evaluateDealMarkets/);
    expect(source("src/app/settings/developer-hub/api-vault/page.tsx")).not.toMatch(/Pipeline/);
  });
});
