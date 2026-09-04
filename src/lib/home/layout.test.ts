import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_LAYOUT,
  homeLayoutStorageKey,
  mergeHomeLayout,
  moveWidget,
  setWidgetSpan,
  spanClass,
} from "./layout";

describe("home widget layout", () => {
  it("keys agent and agency books separately", () => {
    expect(homeLayoutStorageKey({ role: "owner", agentUserId: null })).toBe(
      "ff-home-layout:v1:owner",
    );
    expect(homeLayoutStorageKey({ role: "agent", agentUserId: "u-9" })).toBe(
      "ff-home-layout:v1:agent:u-9",
    );
    expect(homeLayoutStorageKey({ role: "admin" })).toBe("ff-home-layout:v1:admin");
    expect(homeLayoutStorageKey({ role: "admin" })).not.toBe(
      homeLayoutStorageKey({ role: "agent", agentUserId: "u-9" }),
    );
  });

  it("drops unknown widgets and fills missing defaults in order", () => {
    const merged = mergeHomeLayout([
      { id: "ana", span: "2x2" },
      { id: "nope", span: "1x1" },
      { id: "kpi-inforce", span: "wide" },
    ]);
    expect(merged[0]).toEqual({ id: "ana", span: "2x2" });
    expect(merged.map((row) => row.id)).toEqual([
      "ana",
      ...DEFAULT_HOME_LAYOUT.map((row) => row.id).filter((id) => id !== "ana"),
    ]);
    expect(new Set(merged.map((row) => row.id))).toEqual(new Set(DEFAULT_HOME_LAYOUT.map((row) => row.id)));
    expect(merged.find((row) => row.id === "kpi-inforce")?.span).toBe("1x1");
  });

  it("reorders and resizes without losing cards", () => {
    const moved = moveWidget(DEFAULT_HOME_LAYOUT, "ana", "kpi-inforce");
    expect(moved[0]?.id).toBe("ana");
    expect(setWidgetSpan(moved, "ana", "1x2").find((row) => row.id === "ana")?.span).toBe("1x2");
    expect(spanClass("2x1")).toContain("col-span-2");
  });
});
