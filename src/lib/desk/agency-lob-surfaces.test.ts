import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agency LOB surfaces", () => {
  it("settings/lines edits the master catalog", () => {
    const page = readFileSync("src/app/settings/lines/page.tsx", "utf8");
    expect(page).toMatch(/Agency catalog/);
    expect(page).toMatch(/addAgencyLob/);
    expect(page).toMatch(/Every deal, policy, and form picks one line/);
    expect(page).toMatch(/Unlisted values/);
    expect(page).toMatch(/adoptOrphanLob/);
    expect(page).toMatch(/mapOrphanLob/);
  });

  it("deal picker and policy field consume the catalog", () => {
    const picker = readFileSync("src/components/deals/product-picker.tsx", "utf8");
    const policy = readFileSync("src/components/policy/policy-information.tsx", "utf8");
    const forms = readFileSync("src/app/forms/page.tsx", "utf8");
    expect(picker).toMatch(/useAgencyLobs/);
    expect(policy).toMatch(/PolicyLobField/);
    const policyField = readFileSync("src/components/policy/policy-lob-field.tsx", "utf8");
    expect(policyField).toMatch(/resolveAgencyLobCode/);
    expect(policyField).toMatch(/not on list/);
    const sheet = readFileSync("src/app/actions/pipeline-sheet.ts", "utf8");
    expect(sheet).toMatch(/resolveAgencyLobCode/);
    expect(forms).toMatch(/loadAgencyLobs/);
    expect(forms).toMatch(/tied to one agency/);
  });
});
