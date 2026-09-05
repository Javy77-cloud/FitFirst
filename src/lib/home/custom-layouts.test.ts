import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_LAYOUT } from "./layout";
import {
  findNamedHomeLayout,
  normalizeLayoutName,
  parseNamedHomeLayouts,
  renameNamedHomeLayout,
  upsertNamedHomeLayout,
} from "./custom-layouts";

describe("named home layouts", () => {
  it("parses named layouts and drops junk", () => {
    const parsed = parseNamedHomeLayouts([
      { id: "l1", name: "  Morning board  ", placements: [{ id: "ana", span: "2x2" }], hiddenWidgets: ["kpis"] },
      { id: "", name: "Nope" },
      { name: "Missing id", placements: [] },
      { id: "l1", name: "Duplicate id" },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe("Morning board");
    expect(parsed[0]?.hiddenWidgets).toEqual(["kpis"]);
    expect(parsed[0]?.placements.find((row) => row.id === "ana")?.span).toBe("2x2");
    expect(parsed[0]?.placements).toHaveLength(DEFAULT_HOME_LAYOUT.length);
  });

  it("renames later without changing placements", () => {
    const saved = parseNamedHomeLayouts([
      { id: "l1", name: "Draft", placements: [{ id: "ana", span: "1x3", heightPx: 400 }], hiddenWidgets: [] },
    ]);
    const renamed = renameNamedHomeLayout(saved, "l1", "  Renewal week ");
    expect(renamed[0]?.name).toBe("Renewal week");
    expect(renamed[0]?.placements.find((row) => row.id === "ana")).toMatchObject({
      id: "ana",
      span: "1x3",
      heightPx: 400,
    });
    expect(renameNamedHomeLayout(saved, "l1", "   ")).toEqual(saved);
    expect(normalizeLayoutName("  a   b  ")).toBe("a b");
  });

  it("upserts by id and finds the active layout", () => {
    const first = upsertNamedHomeLayout([], {
      id: "l1",
      name: "Mine",
      placements: DEFAULT_HOME_LAYOUT,
      hiddenWidgets: ["ana"],
    });
    const second = upsertNamedHomeLayout(first, {
      id: "l1",
      name: "Mine",
      placements: [{ id: "ana", span: "4x1", cols: 4, heightPx: 160 }, ...DEFAULT_HOME_LAYOUT.slice(1)],
      hiddenWidgets: [],
    });
    expect(second).toHaveLength(1);
    expect(findNamedHomeLayout(second, "l1")?.placements.find((row) => row.id === "ana")).toMatchObject({
      span: "4x1",
      cols: 4,
    });
  });
});
