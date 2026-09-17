import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  matchStarterList,
  missingStarterPicklistNames,
  missingStarterPicklists,
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_SEED_KEY,
  STARTER_PICKLIST_US_STATES,
} from "./starter-picklists";
import { LIST_PREVIEW_COUNT, listMutationOk, visibleListItems } from "@/lib/settings/list-editor";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("admin list editors", () => {
  it("does not recreate a starter after rename when seedKey is present", () => {
    const renamed = [{ name: "My states", seedKey: STARTER_PICKLIST_SEED_KEY.usStates }];
    expect(matchStarterList(renamed, STARTER_FIELD_PICKLISTS[0]!)).toEqual(renamed[0]);
    expect(missingStarterPicklists(renamed).map((list) => list.seedKey)).not.toContain(
      STARTER_PICKLIST_SEED_KEY.usStates,
    );
    expect(missingStarterPicklistNames(["US states"])).not.toContain(STARTER_PICKLIST_US_STATES);
    expect(missingStarterPicklistNames(["US states"])).toContain("Deal notices");
  });

  it("keeps a compact 4-item preview and still exposes hidden rows for save", () => {
    expect(LIST_PREVIEW_COUNT).toBe(4);
    expect(visibleListItems(["a", "b", "c", "d", "e"], false)).toEqual(["a", "b", "c", "d"]);
    expect(visibleListItems(["a", "b", "c", "d", "e"], true)).toHaveLength(5);
    const card = source("src/components/settings/collapsible-list-card.tsx");
    expect(card).toMatch(/hidden=\{collapsedAway\}/);
    expect(card).toMatch(/Show first \$\{previewCount\}/);
    expect(card).toMatch(/data-ff-list-collapse/);
    expect(card).not.toMatch(/zero-height|h-0|max-h-0/);
  });

  it("saves picklist and global list names without a scroll-to-top redirect", () => {
    expect(source("src/app/actions/field-picklists.ts")).toMatch(/listMutationOk\("pick-list-saved"\)/);
    expect(source("src/app/actions/field-picklists.ts")).not.toMatch(/flashAction\("\/settings\/picklists"/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/listMutationOk\("global-list-saved"\)/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function saveGlobalList/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function deleteGlobalList/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function updateGlobalListItem/);
    expect(source("src/components/settings/stay-on-save-form.tsx")).toMatch(/router\.refresh\(\)/);
    expect(source("src/app/actions/field-picklists.ts")).not.toMatch(/from "@\/lib\/flash-action"/);
    expect(source("src/app/actions/global-lists.ts")).not.toMatch(/from "@\/lib\/flash-action"/);
    expect(listMutationOk("pick-list-saved")).toEqual({
      ok: true,
      message: "pick-list-saved",
      kind: "success",
    });
  });

  it("gives Global lists full CRUD + colors and Pick lists a two-column collapse layout", () => {
    const globalCard = source("src/components/settings/global-list-card.tsx");
    const pickCard = source("src/components/settings/picklist-card.tsx");
    const listsPage = source("src/app/settings/lists/page.tsx");
    const pickPage = source("src/app/settings/picklists/page.tsx");
    expect(listsPage).toMatch(/lg:grid-cols-2/);
    expect(pickPage).toMatch(/lg:grid-cols-2/);
    expect(globalCard).toMatch(/name="labels"/);
    expect(globalCard).toMatch(/StatusColorSelect/);
    expect(globalCard).toMatch(/deleteGlobalList/);
    expect(globalCard).toMatch(/deleteGlobalListItem/);
    expect(globalCard).toMatch(/Add a value/);
    expect(pickCard).toMatch(/aria-label="List name"/);
    expect(pickCard).toMatch(/optionColors/);
    expect(pickCard).toMatch(/CollapsibleListCard/);
    expect(source("src/lib/flash.ts")).toMatch(/"pick-list-saved": "Pick list saved"/);
    expect(source("src/lib/flash.ts")).toMatch(/"global-list-saved": "Global list saved"/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/seedKey/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/active: false/);
  });
});
