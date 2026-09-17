import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PicklistConfig } from "@/components/custom-fields/picklist-config";
import { GLOBAL_LIST_KEYS, GLOBAL_LIST_LABEL } from "@/lib/desk/global-lists";
import {
  bindingPatchFromOptionSet,
  emptyGlobalListOptionSets,
  fieldUsesOptionSet,
  globalListOptionSetsFromRows,
  groupedOptionSetChoices,
  optionSetValue,
  parseOptionSetValue,
  persistedOptionSetBinding,
} from "./option-sets";
import { resolveFieldOptions, resolveRichFieldOptions } from "./picklists";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("layout option-set chooser", () => {
  it("lists every GLOBAL_LIST_KEY under Policy / desk plus custom picklists", () => {
    const groups = groupedOptionSetChoices([
      { id: "list-1", name: "US states", options: [{ value: "FL — Florida" }] },
    ]);
    expect(groups.policy.map((choice) => choice.globalListKey)).toEqual([...GLOBAL_LIST_KEYS]);
    expect(groups.policy.map((choice) => choice.label)).toEqual(
      GLOBAL_LIST_KEYS.map((key) => GLOBAL_LIST_LABEL[key]),
    );
    expect(groups.custom).toEqual([
      expect.objectContaining({
        value: "picklist:list-1",
        label: "US states",
        picklistId: "list-1",
        category: "custom",
      }),
    ]);
    expect(groups.policy.find((choice) => choice.globalListKey === "policy_status")?.value).toBe(
      "global:policy_status",
    );
    expect(groups.policy.find((choice) => choice.globalListKey === "selling_agency")?.value).toBe(
      "global:selling_agency",
    );
  });

  it("binds via picklistId or globalListKey and clears the other", () => {
    expect(parseOptionSetValue("global:policy_status")).toEqual({
      picklistId: null,
      globalListKey: "policy_status",
    });
    expect(parseOptionSetValue("picklist:list-1")).toEqual({
      picklistId: "list-1",
      globalListKey: null,
    });
    expect(optionSetValue({ picklistId: "list-1", globalListKey: "selling_agency" })).toBe(
      "global:selling_agency",
    );
    expect(persistedOptionSetBinding({ picklistId: "list-1", globalListKey: "policy_status" })).toEqual({
      picklistId: null,
      globalListKey: "policy_status",
    });
    expect(fieldUsesOptionSet({ type: "single_line", globalListKey: "selling_agency" })).toBe(true);
  });

  it("resolves options and colors from the bound global list at runtime", () => {
    const globalLists = globalListOptionSetsFromRows([
      { listKey: "policy_status", label: "In force", color: "green", active: true },
      { listKey: "policy_status", label: "Cancelled", color: "rose", active: true },
      { listKey: "selling_agency", label: "AFA", color: "blue", active: true },
      { listKey: "selling_agency", label: "Hidden", color: "slate", active: false },
    ]);
    const field = {
      key: "status",
      label: "Policy status",
      type: "picklist" as const,
      options: ["stale"],
      globalListKey: "policy_status",
    };
    expect(resolveFieldOptions(field, [], globalLists)).toEqual(["Cancelled", "In force"]);
    expect(resolveRichFieldOptions(field, [], globalLists).find((option) => option.value === "In force")?.color).toBe(
      "green",
    );
    const agency = bindingPatchFromOptionSet("global:selling_agency", [], globalLists);
    expect(agency.globalListKey).toBe("selling_agency");
    expect(agency.picklistId).toBeNull();
    expect(agency.options).toEqual(["AFA"]);
    expect(agency.optionColors).toEqual({ AFA: "blue" });
  });

  it("renders a scrollable categorized chooser that includes policy_status and selling_agency", () => {
    const html = renderToString(
      createElement(PicklistConfig, {
        field: {
          key: "policy_status",
          label: "Policy status",
          type: "picklist",
          options: ["In force"],
          globalListKey: "policy_status",
        },
        lists: [{ id: "list-1", name: "US states", options: [{ value: "FL — Florida" }] }],
        globalLists: emptyGlobalListOptionSets(),
        onChange: () => {},
      }),
    );
    expect(html).toContain("data-ff-option-set");
    expect(html).toContain("data-ff-global-list");
    expect(html).toContain("Policy / desk");
    expect(html).toContain("Custom");
    for (const key of GLOBAL_LIST_KEYS) {
      expect(html).toContain(`global:${key}`);
    }
    expect(html).toContain("US states");
    expect(html).toContain("Policy statuses");
    expect(html).toContain("Selling agencies");
    expect(html).toContain("data-ff-option-set-preview");
    expect(html).not.toContain("data-ff-add-option");
    expect(source("src/components/custom-fields/picklist-config.tsx")).toMatch(/size=\{8\}/);
    expect(source("src/components/custom-fields/picklist-config.tsx")).toMatch(/max-h-44/);
    expect(source("src/lib/custom-fields/store.ts")).toMatch(/globalListKey/);
    expect(source("src/lib/custom-fields/store.ts")).toMatch(/loadGlobalLists/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/globalListKey: field.globalListKey/);
    expect(source("drizzle/0133_field_global_list_key.sql")).toMatch(/global_list_key/);
  });
});
