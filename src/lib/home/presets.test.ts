import { describe, expect, it } from "vitest";
import {
  hiddenForPreset,
  isWidgetVisible,
  parseBookScope,
  parseDashboardPreset,
  widgetsForPreset,
} from "./presets";

describe("dashboard presets", () => {
  it("defaults unknown values and lists at least three layouts", () => {
    expect(parseDashboardPreset("nope")).toBe("my_production");
    expect(parseBookScope("agency")).toBe("agency");
    expect(widgetsForPreset("my_production")).toContain("leaderboard");
    expect(widgetsForPreset("pipeline_focus")).toContain("recent_deals");
    expect(widgetsForPreset("retention")).toContain("turning65");
  });

  it("hides cards the user unchecked and gates company widgets for agents", () => {
    expect(hiddenForPreset("pipeline_focus")).toContain("leaderboard");
    expect(isWidgetVisible("kpis", "my_production", ["kpis"])).toBe(false);
    expect(
      isWidgetVisible("company", "my_production", [], { isAgent: true, showCompanyWidgets: false }),
    ).toBe(false);
    expect(
      isWidgetVisible("company", "my_production", [], { isAgent: true, showCompanyWidgets: true }),
    ).toBe(true);
  });
});
