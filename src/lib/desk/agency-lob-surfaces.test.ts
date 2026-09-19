import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agency LOB surfaces", () => {
  it("settings/lines edits the master catalog", () => {
    const page = readFileSync("src/app/settings/lines/page.tsx", "utf8");
    expect(page).toMatch(/title="Lines of business"/);
    expect(page).toMatch(/Agency catalog/);
    expect(page).toMatch(/addAgencyLob/);
    expect(page).toMatch(/Every deal, policy, and form picks one line/);
    expect(page).toMatch(/Unlisted values/);
    expect(page).toMatch(/adoptOrphanLob/);
    expect(page).toMatch(/mapOrphanLob/);
  });

  it("puts Lines of business on Agency settings and Settings nav, not buried", () => {
    const agency = readFileSync("src/app/settings/agency/page.tsx", "utf8");
    const home = readFileSync("src/app/settings/page.tsx", "utf8");
    const nav = readFileSync("src/components/settings/settings-nav.tsx", "utf8");
    const pin = readFileSync("src/components/settings/settings-pinned-links.tsx", "utf8");
    expect(agency).toMatch(/Lines of business/);
    expect(agency).toMatch(/href="\/settings\/lines"/);
    expect(agency).toMatch(/data-ff-agency-lines-card/);
    expect(home).toMatch(/SettingsPinnedLinks/);
    expect(home).toMatch(/title="Lines of business"/);
    expect(home).toMatch(/defaultOpen/);
    expect(nav).toMatch(/SettingsPinnedLinks/);
    expect(pin).toMatch(/Lines of business/);
    expect(pin).toMatch(/SETTINGS_PINNED_LINKS/);
  });

  it("does not let agency_lobs seed take down desk line settings", () => {
    const loader = readFileSync("src/lib/db/line-settings.ts", "utf8");
    expect(loader).toMatch(/export async function ensureDefaultAgencyLobs/);
    expect(loader).toMatch(/Catalog seed is optional chrome/);
    expect(loader).toMatch(/missing agency_lobs table/);
    const deskFn = loader.slice(loader.indexOf("export async function loadDeskLineSettings"));
    expect(deskFn).toMatch(/return DEFAULT_DESK_LINE_SETTINGS/);
    expect(deskFn).not.toMatch(/await ensureDefaultAgencyLobs\(\)/);
    expect(loader).toMatch(/visibleAgencyLobs\(DEFAULT_AGENCY_LOBS, DEFAULT_DESK_LINE_SETTINGS/);
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
