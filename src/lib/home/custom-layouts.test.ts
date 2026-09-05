import { describe, expect, it } from "vitest";
import {
  parseHomeLayoutId,
  parseHomeLayoutName,
  parseStoredHomeLayout,
  suggestedHomeLayoutName,
} from "./custom-layouts";
import { DEFAULT_HOME_LAYOUT } from "./layout";

describe("custom home layouts", () => {
  it("names stay short and non-empty", () => {
    expect(parseHomeLayoutName("  Morning board  ")).toBe("Morning board");
    expect(parseHomeLayoutName("")).toBeNull();
    expect(parseHomeLayoutName("   ")).toBeNull();
    expect(parseHomeLayoutName("x".repeat(49))).toBeNull();
    expect(parseHomeLayoutName("x".repeat(48))).toBe("x".repeat(48));
    expect(parseHomeLayoutId("not-a-uuid")).toBeNull();
    expect(parseHomeLayoutId("22222222-2222-4222-8222-222222222222")).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("suggests the next unused Custom layout name", () => {
    expect(suggestedHomeLayoutName([])).toBe("Custom layout");
    expect(suggestedHomeLayoutName([{ name: "Custom layout" }])).toBe("Custom layout 2");
    expect(
      suggestedHomeLayoutName([{ name: "Custom layout" }, { name: "Custom layout 2" }]),
    ).toBe("Custom layout 3");
  });

  it("merges stored placements without inventing unknown widgets", () => {
    const parsed = parseStoredHomeLayout({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "  Pipeline only ",
      placements: [
        { id: "ana", span: "3x2" },
        { id: "nope", span: "1x1" },
      ],
      hiddenWidgets: ["leaderboard", "bogus"],
    });
    expect(parsed.name).toBe("Pipeline only");
    expect(parsed.placements[0]).toEqual({ id: "ana", span: "3x2" });
    expect(parsed.placements.map((row) => row.id)).toEqual([
      "ana",
      ...DEFAULT_HOME_LAYOUT.map((row) => row.id).filter((id) => id !== "ana"),
    ]);
    expect(parsed.hiddenWidgets).toEqual(["leaderboard"]);
  });
});
