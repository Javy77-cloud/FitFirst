import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_LAYOUT,
  HOME_WIDGET_IDS,
  LAYOUT_TO_PRESET,
  homeLayoutStorageKey,
  mergeHomeLayout,
  moveWidget,
  setWidgetSpan,
  spanClass,
} from "./layout";
import { HOME_WIDGET_IDS as PRESET_IDS } from "./presets";

describe("home widget layout", () => {
  it("keys agent and agency books separately", () => {
    expect(homeLayoutStorageKey({ role: "owner", agentUserId: null })).toBe("ff-home-layout:v1:owner");
    expect(homeLayoutStorageKey({ role: "agent", agentUserId: "u-9" })).toBe("ff-home-layout:v1:agent:u-9");
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
    const target = DEFAULT_HOME_LAYOUT.findIndex((row) => row.id === "kpi-inforce");
    const moved = moveWidget(DEFAULT_HOME_LAYOUT, "ana", "kpi-inforce");
    expect(moved[target]?.id).toBe("ana");
    expect(moved.map((row) => row.id)).toHaveLength(DEFAULT_HOME_LAYOUT.length);
    expect(setWidgetSpan(moved, "ana", "1x2").find((row) => row.id === "ana")?.span).toBe("1x2");
    expect(spanClass("2x1")).toContain("col-span-2");
    expect(spanClass("2x2")).not.toContain("row-span");
  });

  it("covers every batch4 preset widget with at least one tile", () => {
    const covered = new Set(Object.values(LAYOUT_TO_PRESET));
    for (const id of PRESET_IDS) {
      expect(covered.has(id)).toBe(true);
    }
    expect(HOME_WIDGET_IDS).toContain("line-mix");
    expect(HOME_WIDGET_IDS).toContain("contest");
    expect(HOME_WIDGET_IDS).toContain("lead-offers");
    expect(HOME_WIDGET_IDS).toContain("social-instagram");
    expect(HOME_WIDGET_IDS).toContain("social-facebook");
  });

  /**
   * Regression: resize widget A must not change widget B's stored w/h.
   * Stacked neighbors used to look (and persist) like they shrank together.
   */
  it("resizes widget A without changing widget B stored w/h", () => {
    const before = DEFAULT_HOME_LAYOUT;
    const anaWas = before.find((row) => row.id === "ana")?.span;
    const attentionWas = before.find((row) => row.id === "attention")?.span;
    expect(anaWas).toBeDefined();
    expect(attentionWas).toBeDefined();

    const next = setWidgetSpan(before, "ana", "2x2");
    expect(next.find((row) => row.id === "ana")?.span).toBe("2x2");
    for (const row of before) {
      if (row.id === "ana") continue;
      expect(next.find((item) => item.id === row.id)).toEqual(row);
    }

    const stacked = setWidgetSpan(next, "attention", "1x2");
    expect(stacked.find((row) => row.id === "ana")?.span).toBe("2x2");
    expect(stacked.find((row) => row.id === "attention")?.span).toBe("1x2");
    expect(stacked.find((row) => row.id === "renewals")?.span).toBe(
      before.find((row) => row.id === "renewals")?.span,
    );

    const social = setWidgetSpan(DEFAULT_HOME_LAYOUT, "social-instagram", "2x2");
    expect(social.find((row) => row.id === "social-instagram")?.span).toBe("2x2");
    expect(social.find((row) => row.id === "social-facebook")?.span).toBe(
      DEFAULT_HOME_LAYOUT.find((row) => row.id === "social-facebook")?.span,
    );
  });
});
