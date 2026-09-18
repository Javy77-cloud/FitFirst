import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollapsibleListCard } from "@/components/settings/collapsible-list-card";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { ListOptionPersist } from "@/components/settings/list-option-persist";
import { ListOptionRow } from "@/components/settings/list-option-row";
import {
  matchStarterList,
  missingStarterPicklistNames,
  missingStarterPicklists,
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_SEED_KEY,
  STARTER_PICKLIST_US_STATES,
} from "./starter-picklists";
import {
  LIST_OPTION_COMMIT_MS,
  LIST_PREVIEW_COUNT,
  collapsedGlobalListPersistFields,
  collapsedPicklistPersistFields,
  collectNamedFormControls,
  listMutationOk,
  listOptionIdentitiesDuringTyping,
  listOptionNeedsCommit,
  listOptionRowKey,
  listOptionTypingRemounts,
  listSaveValues,
  namedFormControlEntriesToFormData,
  visibleListItems,
} from "@/lib/settings/list-editor";

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

  it("keeps a compact 4-item preview and persists collapsed rows as hidden fields", () => {
    expect(LIST_PREVIEW_COUNT).toBe(4);
    expect(visibleListItems(["a", "b", "c", "d", "e"], false)).toEqual(["a", "b", "c", "d"]);
    expect(visibleListItems(["a", "b", "c", "d", "e"], true)).toHaveLength(5);
    const card = source("src/components/settings/collapsible-list-card.tsx");
    expect(card).toMatch(/if \(collapsedAway\) return null/);
    expect(card).toMatch(/collapsedPersist/);
    expect(card).toMatch(/data-ff-list-collapsed-persist/);
    expect(card).toMatch(/Show first \$\{previewCount\}/);
    expect(card).toMatch(/data-ff-list-collapse/);
    expect(card).not.toMatch(/hidden=\{collapsedAway\}/);
    expect(card).not.toMatch(/zero-height|h-0|max-h-0/);
    expect(source("src/components/settings/picklist-card.tsx")).toMatch(/collapsedPicklistPersistFields/);
    expect(source("src/components/settings/global-list-card.tsx")).toMatch(/collapsedGlobalListPersistFields/);
    const persist = collapsedPicklistPersistFields(
      [
        { value: "A" },
        { value: "B" },
        { value: "C" },
        { value: "D" },
        { value: "Paramed exam", color: "teal" },
        { value: "APS", color: null },
      ],
      5,
    );
    expect(persist).toEqual([
      { name: "options", value: "Paramed exam" },
      { name: "optionColors", value: "teal" },
      { name: "options", value: "APS" },
      { name: "optionColors", value: "" },
      { name: "defaultIndex", value: "5" },
    ]);
    expect(
      collapsedGlobalListPersistFields([
        { id: "1", label: "One" },
        { id: "2", label: "Two" },
        { id: "3", label: "Three" },
        { id: "4", label: "Four" },
        { id: "5", label: "Five", color: "rose", family: "life" },
      ]),
    ).toEqual([
      { name: "ids", value: "5" },
      { name: "labels", value: "Five" },
      { name: "itemColors", value: "rose" },
      { name: "families", value: "life" },
    ]);
    expect(listSaveValues(["A", "B", "C", "D"], ["Paramed exam", "APS"], [""])).toEqual([
      "A",
      "B",
      "C",
      "D",
      "Paramed exam",
      "APS",
    ]);
    const entries = collectNamedFormControls([
      { name: "ids", value: "1" },
      { name: "labels", value: "Active" },
      { name: "itemColors", value: "cyan" },
      { name: "itemColors", value: "green", disabled: true },
      { name: "defaultIndex", value: "0", type: "radio", checked: false },
      { name: "defaultIndex", value: "1", type: "radio", checked: true },
    ]);
    expect(entries).toEqual([
      ["ids", "1"],
      ["labels", "Active"],
      ["itemColors", "cyan"],
      ["defaultIndex", "1"],
    ]);
    expect(namedFormControlEntriesToFormData(entries).get("itemColors")).toBe("cyan");
  });

  it("saves picklist and global list names without a scroll-to-top redirect", () => {
    expect(source("src/app/actions/field-picklists.ts")).toMatch(/listMutationOk\("pick-list-saved"\)/);
    expect(source("src/app/actions/field-picklists.ts")).not.toMatch(/flashAction\("\/settings\/picklists"/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/listMutationOk\("global-list-saved"\)/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function saveGlobalList/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/colorsAligned/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function deleteGlobalList/);
    expect(source("src/app/actions/global-lists.ts")).toMatch(/export async function updateGlobalListItem/);
    expect(source("src/components/settings/stay-on-save-form.tsx")).toMatch(/router\.refresh\(\)/);
    expect(source("src/components/settings/stay-on-save-form.tsx")).toMatch(/readListFormData/);
    expect(source("src/components/settings/stay-on-save-form.tsx")).toMatch(/\[form="\$\{CSS\.escape\(form\.id\)\}"\]/);
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
    expect(globalCard).toMatch(/updateGlobalListItemColor/);
    expect(globalCard).toMatch(/name=""/);
    expect(globalCard).toMatch(/deleteGlobalList/);
    expect(globalCard).toMatch(/deleteGlobalListItem/);
    expect(globalCard).toMatch(/Add a value/);
    expect(pickCard).toMatch(/aria-label="List name"/);
    expect(pickCard).toMatch(/optionColors/);
    expect(pickCard).toMatch(/CollapsibleListCard/);
    expect(pickCard).toMatch(/ListOptionRow/);
    expect(pickCard).toMatch(/defaultValue=\{option\.color\}/);
    expect(globalCard).toMatch(/ListOptionRow/);
    expect(globalCard).toMatch(/click Color for the full palette/);
    expect(globalCard).toMatch(/colorAriaLabel="Color for new value"/);
    expect(globalCard).not.toMatch(/function AddValueColor/);
    expect(pickCard).toMatch(/click Color/);
    expect(source("src/components/settings/collapsible-list-card.tsx")).toMatch(/ff-list-card/);
    expect(source("src/components/settings/list-option-row.tsx")).toMatch(/data-ff-live-color-row/);
    expect(source("src/components/settings/list-option-row.tsx")).toMatch(/onColorChange/);
    expect(source("src/components/desk/status-color-select.tsx")).toMatch(/data-ff-status-color-palette-trigger/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-list-row/);
    expect(source("src/lib/flash.ts")).toMatch(/"pick-list-saved": "Pick list saved"/);
    expect(source("src/lib/flash.ts")).toMatch(/"global-list-saved": "Global list saved"/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/seedKey/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/active: false/);
  });

  it("renders a live color row from the saved key without lifting label keystrokes to the parent", () => {
    const html = renderToString(
      createElement(
        ListOptionRow,
        { defaultValue: "teal", name: "optionColors" },
        createElement("input", { defaultValue: "Open", "aria-label": "Option 1" }),
      ),
    );
    expect(html).toContain('data-ff-live-color-row="teal"');
    expect(html).toContain('data-ff-status-color-swatch="teal"');
    expect(html).toContain("data-ff-status-color-palette-trigger");
    expect(html).toContain('value="Open"');
    expect(html).not.toContain("useEffect");
    const row = source("src/components/settings/list-option-row.tsx");
    expect(row).toMatch(/useState/);
    expect(row).not.toMatch(/useEffect/);
    expect(source("src/components/settings/picklist-card.tsx")).toMatch(/committedValue=\{option\.value\}/);
    expect(source("src/components/settings/global-list-card.tsx")).toMatch(/committedValue=\{row\.label\}/);
    expect(source("src/components/settings/picklist-card.tsx")).toMatch(/ListOptionInput/);
    expect(source("src/components/settings/global-list-card.tsx")).toMatch(/ListOptionInput/);
  });

  it("keeps option-row keys stable across keystrokes and commits only on blur", () => {
    const typed = ["C", "Ca", "Cal", "Call", "Calls"];
    const keys = listOptionIdentitiesDuringTyping("deal-notices-life", 0, typed);
    expect(new Set(keys).size).toBe(1);
    expect(listOptionTypingRemounts("deal-notices-life", 0, typed)).toBe(false);
    expect(new Set(typed.map((value) => `${0}-${value}`)).size).toBe(typed.length);
    expect(listOptionRowKey("deal-notices-life", 0)).not.toContain("Call");
    expect(typed.map((value) => `0-${value}`).filter((key, _, all) => all[0] !== key).length).toBeGreaterThan(0);
    expect(listOptionNeedsCommit("Call", "Calls")).toBe(true);
    expect(listOptionNeedsCommit("Calls", "Calls")).toBe(false);
    expect(LIST_OPTION_COMMIT_MS).toBeGreaterThanOrEqual(300);

    const input = source("src/components/settings/list-option-input.tsx");
    expect(input).toMatch(/committedValue/);
    expect(input).toMatch(/onCommit/);
    expect(input).toMatch(/flushSync/);
    expect(input).toMatch(/focusedRef/);
    expect(input).toMatch(/defaultValue=\{committedValue\}/);
    expect(input).not.toMatch(/useState/);
    expect(input).not.toMatch(/setDraft/);
    expect(input).not.toMatch(/value=\{draft\}/);
    expect(input).not.toMatch(/onChange=\{/);
    expect(input).not.toMatch(/onCommit\?\.\(next\)/);
    expect(input).toMatch(/onBlur/);
    expect(input).not.toMatch(/onChange=\{\(event\) => \{\s*onCommit/);

    const pickCard = source("src/components/settings/picklist-card.tsx");
    const globalCard = source("src/components/settings/global-list-card.tsx");
    const config = source("src/components/custom-fields/picklist-config.tsx");
    const builder = source("src/components/custom-fields/field-builder.tsx");
    const notices = source("src/components/deal/notice-types-editor.tsx");
    expect(pickCard).toMatch(/listOptionRowKey\(list\.id, index\)/);
    expect(pickCard).not.toMatch(/key=\{`\$\{list\.id\}-\$\{index\}-\$\{option\.value\}/);
    expect(pickCard).toMatch(/ListOptionInput/);
    expect(pickCard).toMatch(/ListOptionRow/);
    expect(globalCard).toMatch(/ListOptionInput/);
    expect(globalCard).toMatch(/key=\{row\.id\}/);
    expect(config).toMatch(/ListOptionInput/);
    expect(config).toMatch(/onCommit=/);
    expect(config).not.toMatch(/next\[index\] = event\.target\.value/);
    expect(builder).toMatch(/ListOptionInput/);
    expect(builder).toMatch(/data-ff-section-label/);
    expect(notices).toMatch(/ListOptionInput/);
    expect(source("src/app/settings/offices/page.tsx")).toMatch(/ListOptionInput/);
    expect(source("src/app/settings/territories/page.tsx")).toMatch(/ListOptionInput/);
    expect(source("src/components/settings/collapsible-list-card.tsx")).toMatch(/rowKey\(item, index\)/);
    expect(source("src/components/settings/stay-on-save-form.tsx")).toMatch(/router\.refresh\(\)/);

    for (const value of typed) {
      const html = renderToString(
        createElement(ListOptionInput, {
          committedValue: value,
          "aria-label": "Option 1",
        }),
      );
      expect(html).toContain(`value="${value}"`);
      expect(html).toContain("data-ff-list-option-input");
    }

    const lifeNotices = ["Inspection", "Paramed exam", "APS", "Labs", "Carrier call", "UW hold"];
    const preview = renderToString(
      createElement(CollapsibleListCard, {
        cardId: "deal-notices-life",
        items: lifeNotices.map((label, index) =>
          createElement(ListOptionInput, {
            key: listOptionRowKey("deal-notices-life", index),
            committedValue: label,
            "aria-label": `Option ${index + 1}`,
          }),
        ),
        collapsedPersist: createElement(ListOptionPersist, {
          fields: collapsedPicklistPersistFields(
            lifeNotices.map((value) => ({ value })),
          ),
        }),
      }),
    );
    expect(preview).toContain('aria-label="Option 1"');
    expect(preview).toContain('aria-label="Option 4"');
    expect(preview).toContain('value="Inspection"');
    expect(preview).not.toContain('aria-label="Option 5"');
    expect(preview).not.toContain('aria-label="Option 6"');
    expect(preview).toContain("data-ff-list-collapsed-persist");
    expect(preview).toContain('data-ff-list-option-persist="options"');
    expect(preview).toContain('value="Carrier call"');
    expect(preview).toContain('value="UW hold"');
    expect(preview.match(/data-ff-list-option-input/g)?.length).toBe(4);
  });
});
