import { describe, expect, it } from "vitest";
import { groupIdForPath, NAV_GROUPS, pathIsActive } from "./desk-nav-groups";

const settings = NAV_GROUPS.find((group) => group.id === "settings");

describe("desk settings IA", () => {
  it("groups Settings into Setup cards, not a Phone/Agency/Offices rail", () => {
    expect(settings?.items.map((item) => item.label)).toEqual([
      "Setup",
      "Agency & People",
      "Desk & Phone",
      "Connect",
      "Security",
      "Billing",
    ]);
    expect(settings?.items.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/settings",
        "/settings/agency",
        "/settings?section=phone",
        "/settings/integrations",
        "/settings/security",
        "/settings/billing",
      ]),
    );
  });

  it("keeps every settings path on the Settings accordion", () => {
    expect(groupIdForPath("/settings")).toBe("settings");
    expect(groupIdForPath("/settings/offices")).toBe("settings");
    expect(groupIdForPath("/settings/phone")).toBe("settings");
    expect(groupIdForPath("/settings/billing")).toBe("settings");
  });

  it("treats Setup as an exact /settings match", () => {
    const setup = settings?.items.find((item) => item.label === "Setup");
    expect(setup?.exact).toBe(true);
    expect(pathIsActive("/settings", setup!)).toBe(true);
    expect(pathIsActive("/settings/agency", setup!)).toBe(false);
  });
});
