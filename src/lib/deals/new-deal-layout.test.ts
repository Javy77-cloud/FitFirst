import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("New Deal uses the live Deal Edit Layout", () => {
  it("renders RecordLayoutFields and drops the old CreateDealForm card", () => {
    const page = readFileSync("src/app/deals/new/page.tsx", "utf8");
    expect(page).toMatch(/RecordLayoutFields/);
    expect(page).toMatch(/LinkExistingContactGuard/);
    expect(page).toMatch(/loadModuleLayoutBundle\("deals"/);
    expect(page).toMatch(/data-ff="new-deal-layout"/);
    expect(page).toMatch(/Save Deal/);
    expect(page).toMatch(/EditLayoutLink/);
    expect(page).not.toMatch(/CreateDealForm/);
    expect(page).not.toMatch(/max-w-xl/);
  });

  it("places Add New Deal dialog on the deals list chrome", () => {
    const table = readFileSync("src/components/deals/deals-table.tsx", "utf8");
    expect(table).toMatch(/AddNewDealDialog/);
    expect(table).toMatch(/data-ff-deals-list-actions/);
    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/data-ff-new-deal/);
    expect(dialog).toMatch(/Add New Deal/);
    expect(dialog).toMatch(/Create A New Deal From Scratch/);
    expect(dialog).toMatch(/Create A New Deal For Existing Contact \/ Deal/);
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(dialog).toMatch(/searchDealsForCreate/);
    expect(dialog).toMatch(/data-ff-package-lines/);
    expect(dialog).toMatch(/ProductPicker/);
    expect(dialog).not.toMatch(/createDealFromScratch/);
    expect(dialog).not.toMatch(/createDealFromExistingPick/);
    const page = readFileSync("src/app/deals/new/page.tsx", "utf8");
    expect(page).toMatch(/NewDealCreateFields/);
    expect(page).toMatch(/createDeal/);
    const actions = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(actions).toMatch(/packageDraftForNewDealSave/);
    expect(actions).toMatch(/forceNewShopOnSave/);
    expect(actions).toMatch(/seedNewDealShopFlow/);
    expect(actions).toMatch(/NEW_DEAL_PIPELINE_STAGE/);
  });
});
