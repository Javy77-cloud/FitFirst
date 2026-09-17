import { describe, expect, it } from "vitest";
import {
  buildColorLookup,
  lookupListColor,
  normalizeListColorKey,
  resolveDealListCellColor,
  type DealListColorMaps,
} from "./list-option-colors";
import type { CustomFieldDef } from "@/lib/custom-fields/types";

describe("deal list option colors", () => {
  it("normalizes labels and slugs the same way", () => {
    expect(normalizeListColorKey("First Connect")).toBe("first_connect");
    expect(normalizeListColorKey("first-connect")).toBe("first_connect");
    expect(normalizeListColorKey("P&C")).toBe("pandc");
    expect(normalizeListColorKey("p and c")).toBe("p_and_c");
  });

  it("matches selling agency by label or slug case-insensitively", () => {
    const map = buildColorLookup([
      { label: "AFA", slug: "afa", color: "blue" },
      { label: "First Connect", slug: "first-connect", color: "violet" },
      { label: "BackNine", slug: "backnine", color: "orange" },
    ]);
    expect(lookupListColor("AFA", map)).toBe("blue");
    expect(lookupListColor("afa", map)).toBe("blue");
    expect(lookupListColor("first connect", map)).toBe("violet");
    expect(lookupListColor("first-connect", map)).toBe("violet");
    expect(lookupListColor("BackNine", map)).toBe("orange");
    expect(lookupListColor("missing", map)).toBeNull();
  });

  it("matches Pipeline picklist option colors", () => {
    const map = buildColorLookup([
      { value: "Health", color: "purple" },
      { value: "Life", color: "blue" },
      { value: "P&C", color: "lime" },
    ]);
    expect(lookupListColor("P&C", map)).toBe("lime");
    expect(lookupListColor("life", map)).toBe("blue");
    expect(lookupListColor("Health", map)).toBe("purple");
  });

  it("prefers field.optionColors then dedicated maps for Pipeline / Selling Agency", () => {
    const maps: DealListColorMaps = {
      sellingAgency: buildColorLookup([{ label: "AFA", slug: "afa", color: "blue" }]),
      pipeline: buildColorLookup([{ value: "P&C", color: "lime" }]),
    };
    const agency: CustomFieldDef = {
      key: "picklist_yp0c",
      label: "Selling Agency",
      type: "picklist",
      options: ["AFA"],
      optionColors: { AFA: "teal" },
      globalListKey: "selling_agency",
    };
    const pipeline: CustomFieldDef = {
      key: "picklist_5n3i",
      label: "Pipeline",
      type: "picklist",
      options: ["P&C"],
    };
    // Field colors win when present.
    expect(resolveDealListCellColor("AFA", agency, maps)).toBe("teal");
    // Dedicated map fills when field has no optionColors.
    expect(resolveDealListCellColor("P&C", pipeline, maps)).toBe("lime");
    expect(resolveDealListCellColor("afa", agency, maps)).toBe("teal");
  });
});
