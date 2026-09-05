import { describe, expect, it } from "vitest";
import { groupIdForPath, NAV_GROUPS, pathIsActive } from "./desk-nav-groups";

const settings = NAV_GROUPS.find((group) => group.id === "settings");

describe("desk settings IA", () => {
  it("keeps one Settings entry in the left nav", () => {
    expect(settings?.items.map((item) => item.label)).toEqual(["Settings"]);
    expect(settings?.items.map((item) => item.href)).toEqual(["/settings"]);
  });

  it("keeps every settings path on the Settings accordion", () => {
    expect(groupIdForPath("/settings")).toBe("settings");
    expect(groupIdForPath("/settings/offices")).toBe("settings");
    expect(groupIdForPath("/settings/phone")).toBe("settings");
    expect(groupIdForPath("/settings/billing")).toBe("settings");
    expect(groupIdForPath("/settings/import-export")).toBe("settings");
    expect(groupIdForPath("/settings/import")).toBe("settings");
    expect(groupIdForPath("/settings/developer-hub")).toBe("settings");
  });

  it("treats Settings as matching the whole /settings tree", () => {
    const setup = settings?.items.find((item) => item.label === "Settings");
    expect(pathIsActive("/settings", setup!)).toBe(true);
    expect(pathIsActive("/settings/agency", setup!)).toBe(true);
    expect(pathIsActive("/settings/import-export", setup!)).toBe(true);
  });
});
