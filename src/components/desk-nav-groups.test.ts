import { describe, expect, it } from "vitest";
import { groupIdForPath, NAV_GROUPS, pathIsActive, PINNED_HOME } from "./desk-nav-groups";

const settings = NAV_GROUPS.find((group) => group.id === "settings");

describe("desk settings IA", () => {
  it("keeps one Settings entry pinned at the bottom of the left nav", () => {
    expect(NAV_GROUPS.at(-1)?.id).toBe("settings");
    expect(settings?.label).toBe("Settings");
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
    const setup = { href: "/settings", label: "Settings", icon: settings!.icon, match: "/settings" };
    expect(pathIsActive("/settings", setup)).toBe(true);
    expect(pathIsActive("/settings/agency", setup)).toBe(true);
    expect(pathIsActive("/settings/import-export", setup)).toBe(true);
  });
});

describe("primary desk nav", () => {
  it("lists Home through Carriers as primaries, not Work/Accounts groups", () => {
    expect(NAV_GROUPS.map((group) => group.id)).toEqual([
      "home",
      "leads",
      "deals",
      "pipeline",
      "contacts",
      "business",
      "policies",
      "carriers",
      "tasks",
      "calendar",
      "settings",
    ]);
    expect(NAV_GROUPS.some((group) => group.label === "People")).toBe(false);
    expect(NAV_GROUPS.some((group) => group.id === "work")).toBe(false);
    expect(NAV_GROUPS.find((group) => group.id === "business")?.label).toBe("Business");
  });

  it("keeps Contacts and Business as their own primaries", () => {
    expect(NAV_GROUPS.find((group) => group.id === "contacts")?.label).toBe("Contacts");
    expect(NAV_GROUPS.find((group) => group.id === "business")?.label).toBe("Business");
  });

  it("keeps one search surface — top bar only, not the sidebar", () => {
    const hrefs = NAV_GROUPS.flatMap((group) => [group.id, ...group.items.map((item) => item.href)]);
    const labels = NAV_GROUPS.flatMap((group) => [group.label, ...group.items.map((item) => item.label)]);
    expect(hrefs).not.toContain("/search");
    expect(labels).not.toContain("Search");
  });

  it("keeps Phone, Inbox, and Alerts under Calendar by default", () => {
    const calendar = NAV_GROUPS.find((group) => group.id === "calendar");
    const deals = NAV_GROUPS.find((group) => group.id === "deals");
    const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.label));
    expect(calendar?.items.map((item) => item.label)).toEqual(["Phone", "Inbox", "Alerts"]);
    expect(calendar?.items.find((item) => item.label === "Alerts")?.href).toBe("/notifications");
    const alerts = calendar?.items.find((item) => item.label === "Alerts");
    expect(pathIsActive("/notifications", alerts!)).toBe(true);
    expect(pathIsActive("/alerts", alerts!)).toBe(true);
    expect(deals?.items.some((item) => item.label === "Quotes")).toBe(true);
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(PINNED_HOME.label).toBe("Home");
  });
});
