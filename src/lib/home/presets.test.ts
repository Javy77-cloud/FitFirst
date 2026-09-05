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
    expect(widgetsForPreset("my_production")).toContain("lead_offers");
    expect(widgetsForPreset("pipeline_focus")).toContain("recent_deals");
    expect(widgetsForPreset("retention")).toContain("turning65");
    expect(widgetsForPreset("retention")).toContain("renewal_risk");
    expect(widgetsForPreset("my_production")).toContain("renewal_risk");
    expect(widgetsForPreset("my_production")).toContain("social");
    expect(widgetsForPreset("pipeline_focus")).toContain("social");
    expect(widgetsForPreset("retention")).toContain("social");
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
    expect(widgetsForPreset("my_production")).toContain("hit_lost");
    expect(isWidgetVisible("hit_lost", "my_production", [], { isAdmin: false })).toBe(false);
    expect(isWidgetVisible("hit_lost", "my_production", [], { isAdmin: true })).toBe(true);
  });
});
