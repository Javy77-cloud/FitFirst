import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clearAllPicklistOptionColors } from "@/lib/custom-fields/picklists";
import { liveColorKey, liveColorRowStyle, statusColorSelectValue } from "@/lib/desk/status-colors";

describe("sep7jf StatusColorSelect None + clear all colors", () => {
  it("keeps null / empty / none as None — never coerces to slate", () => {
    expect(statusColorSelectValue(null)).toBe("");
    expect(statusColorSelectValue(undefined)).toBe("");
    expect(statusColorSelectValue("")).toBe("");
    expect(statusColorSelectValue("none")).toBe("");
    expect(statusColorSelectValue("NONE")).toBe("");
    expect(statusColorSelectValue("teal")).toBe("teal");
    expect(statusColorSelectValue("slate")).toBe("slate");
  });

  it("paints a live row wash the moment a palette key is chosen", () => {
    expect(liveColorKey(null)).toBe("none");
    expect(liveColorKey("none")).toBe("none");
    expect(liveColorKey("teal")).toBe("teal");
    expect(liveColorRowStyle(null)).toBeUndefined();
    expect(liveColorRowStyle("rose")).toMatchObject({
      backgroundColor: "#fde8e6",
      borderColor: "#e8b4af",
    });
    const source = readFileSync("src/components/desk/status-color-select.tsx", "utf8");
    expect(source).toMatch(/onColorChange/);
    expect(readFileSync("src/components/settings/list-option-row.tsx", "utf8")).toMatch(
      /data-ff-live-color-row/,
    );
  });

  it("puts None first in the shared StatusColorSelect markup", () => {
    const source = readFileSync("src/components/desk/status-color-select.tsx", "utf8");
    expect(source).toMatch(/<option value="">None<\/option>/);
    expect(source).toMatch(/statusColorSelectValue/);
    expect(source).not.toMatch(/defaultValue = "slate"/);
    expect(source).toMatch(/data-ff-status-color-palette-trigger/);
    expect(source).toMatch(/data-ff-status-color-palette=/);
    expect(source).toMatch(/Full color palette/);
    expect(source).toMatch(/DropdownMenuGroup/);
    expect(source).toMatch(/\{selected \|\| "Color"\}/);
  });

  it("wires None for all on Global lists and Picklists", () => {
    const lists = readFileSync("src/components/settings/global-list-card.tsx", "utf8");
    const picklists = readFileSync("src/components/settings/picklist-card.tsx", "utf8");
    expect(lists).toMatch(/None for all/);
    expect(lists).toMatch(/clearGlobalListColors/);
    expect(picklists).toMatch(/None for all/);
    expect(picklists).toMatch(/clearFieldPicklistColors/);
    expect(picklists).toMatch(/defaultValue=\{option\.color\}/);
  });

  it("clearAllPicklistOptionColors nulls every option color", () => {
    const cleared = clearAllPicklistOptionColors([
      { value: "A", color: "rose", isDefault: true },
      { value: "B", color: "teal" },
    ]);
    expect(cleared.map((o) => o.color)).toEqual([null, null]);
    expect(cleared[0]?.isDefault).toBe(true);
    expect(cleared.map((o) => o.value)).toEqual(["A", "B"]);
  });
});
