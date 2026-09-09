import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assignFromCatalog,
  deleteTagFromList,
  mergeTagInList,
  renameTagInList,
  tagManagePaths,
} from "./manage";
import { TAG_MODULES, tagModuleForList, tagModuleLabel } from "./module-tags";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("module tag manage + assign popup", () => {
  it("scopes a catalog to each CRM module including Business and Carriers", () => {
    expect([...TAG_MODULES]).toEqual(["leads", "deals", "contacts", "accounts", "policies", "carriers"]);
    expect(tagModuleLabel("accounts")).toBe("Business");
    expect(tagModuleForList("businesses")).toBe("accounts");
    expect(tagModuleForList("pipeline")).toBe("deals");
    expect(tagModuleForList("leads-queue")).toBe("leads");
    expect(tagModuleForList("carriers")).toBe("carriers");
    expect(tagManagePaths("accounts").list).toBe("/accounts");
    expect(tagManagePaths("carriers").manage).toBe("/settings/tags?module=carriers");
  });

  it("opens Manage tags from the sheet ⋯ settings menu", () => {
    const menu = source("src/components/lists/sheet-settings-menu.tsx");
    const table = source("src/components/lists/column-table.tsx");
    const header = source("src/components/sheet/sheet-header.tsx");
    expect(menu).toMatch(/MoreHorizontal/);
    expect(menu).toMatch(/data-ff-sheet-settings/);
    expect(menu).toMatch(/Manage tags/);
    expect(menu).toMatch(/ManageTagsDialog/);
    expect(table).toMatch(/SheetSettingsMenu/);
    expect(table).toMatch(/data-ff-list-chrome/);
    expect(table).toMatch(/ListColumnsChrome/);
    expect(source("src/components/developer-hub/list-selection.tsx")).toMatch(/data-ff-list-chrome/);
    expect(header).toMatch(/data-ff-manage-tags/);
    expect(source("src/components/pipeline/workspace.tsx")).toMatch(/SheetSettingsMenu/);
  });

  it("CRUDs catalog colors only from Manage tags, not from assigning a row", () => {
    const dialog = source("src/components/tags/manage-tags-dialog.tsx");
    const settings = source("src/app/settings/tags/page.tsx");
    const record = source("src/components/tags/record-tags.tsx");
    const assign = source("src/components/tags/assign-record-tags.tsx");
    expect(dialog).toMatch(/createModuleTag/);
    expect(dialog).toMatch(/renameModuleTag/);
    expect(dialog).toMatch(/mergeModuleTag/);
    expect(dialog).toMatch(/deleteModuleTag/);
    expect(dialog).toMatch(/updateModuleTagColor/);
    expect(dialog).toMatch(/data-ff-tag-color-picker/);
    expect(settings).toMatch(/createModuleTag/);
    expect(settings).toMatch(/Save color/);
    expect(settings).toMatch(/data-ff-tag-manager/);
    expect(record).toMatch(/AssignRecordTags/);
    expect(record).not.toMatch(/data-ff-manage-tags/);
    expect(record).not.toMatch(/Manage tags/);
    expect(record).not.toMatch(/Save tags/);
    expect(record).not.toMatch(/data-ff-tag-color-picker/);
    expect(record).not.toMatch(/placeholder="Add a tag"/);
    expect(record).not.toMatch(/\+ \$\{formatTagLabel/);
    expect(assign).not.toMatch(/createModuleTag/);
    expect(assign).toMatch(/data-ff-assign-tags-popup/);
    expect(source("src/app/actions/record-tags.ts")).toMatch(/export async function createModuleTag/);
    expect(source("src/app/actions/record-tags.ts")).toMatch(/assignFromCatalog/);
  });

  it("list and board tag cells open the assign popup", () => {
    expect(source("src/app/leads/page.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/app/contacts/page.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/app/policies/page.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/app/accounts/page.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/app/carriers/page.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/components/pipeline/table-view.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/components/pipeline/deal-card.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/<RecordTags/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/placeholder="Add a tag"/);
    expect(source("src/components/tags/assign-record-tags.tsx")).toMatch(/data-ff-assign-tags-trigger/);
    expect(source("src/components/tags/assign-record-tags.tsx")).toMatch(/type="checkbox"/);
  });

  it("adds Business and Carrier tags with an additive migrate only", () => {
    const migrate = source("drizzle/0089_account_carrier_tags.sql");
    const schema = source("src/lib/db/schema.ts");
    expect(migrate).toMatch(/ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "tags"/);
    expect(migrate).toMatch(/ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "tags"/);
    expect(migrate).toMatch(/Additive only/);
    expect(migrate).not.toMatch(/DROP TABLE/);
    expect(migrate).not.toMatch(/db:seed wipe/);
    expect(schema).toMatch(/export const accounts[\s\S]*tags: jsonb\("tags"\)/);
    expect(schema).toMatch(/export const carriers[\s\S]*tags: jsonb\("tags"\)/);
  });

  it("renames, merges, deletes, and assigns without inventing catalog names", () => {
    expect(renameTagInList(["hot", "referral"], "hot", "priority")).toEqual(["priority", "referral"]);
    expect(mergeTagInList(["hot", "priority"], "hot", "priority")).toEqual(["priority"]);
    expect(deleteTagFromList(["hot", "referral"], "hot")).toEqual(["referral"]);
    expect(assignFromCatalog(["hot", "invented", "referral"], ["hot", "referral"])).toEqual([
      "hot",
      "referral",
    ]);
    expect(assignFromCatalog(["none-of-these"], ["hot"])).toEqual([]);
  });
});
