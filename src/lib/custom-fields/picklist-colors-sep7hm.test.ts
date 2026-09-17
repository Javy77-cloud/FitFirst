import { describe, expect, it } from "vitest";
import { sanitizePicklistOptions, sanitizeRichPicklistOptions } from "./picklists";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";

describe("sep7hm picklist colors + A–Z + default", () => {
  it("accepts legacy strings and rich options, sorts A–Z, keeps one default", () => {
    const rich = sanitizeRichPicklistOptions([
      { value: "Zebra", color: "rose", isDefault: true },
      "Apple",
      { value: "Mango", color: "teal", isDefault: true },
      { value: "Apple", color: "blue" },
      { value: "  ", color: "red" },
    ]);
    expect(rich.map((o) => o.value)).toEqual(["Apple", "Mango", "Zebra"]);
    expect(rich.filter((o) => o.isDefault).map((o) => o.value)).toEqual(["Mango"]);
    expect(rich.find((o) => o.value === "Zebra")?.color).toBe("rose");
    expect(sanitizePicklistOptions(rich)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("wires the full status palette into Settings lists + picklists UI", () => {
    expect(STATUS_COLOR_KEYS.length).toBeGreaterThanOrEqual(16);
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    expect(readFileSync("src/components/settings/global-list-card.tsx", "utf8")).toMatch(/StatusColorSelect/);
    expect(readFileSync("src/components/settings/picklist-card.tsx", "utf8")).toMatch(/optionColors/);
    expect(readFileSync("src/components/settings/picklist-card.tsx", "utf8")).toMatch(/defaultIndex/);
    expect(readFileSync("src/app/globals.css", "utf8")).toMatch(/margin-bottom: 3rem/);
  });
});
