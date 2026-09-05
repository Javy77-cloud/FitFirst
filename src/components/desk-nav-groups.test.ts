import { describe, expect, it } from "vitest";
import { groupIdForPath, NAV_GROUPS, pathIsActive, PINNED_HOME } from "./desk-nav-groups";

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

describe("grouped desk nav", () => {
  it("renames People to Accounts and keeps Contacts + Businesses", () => {
    const accounts = NAV_GROUPS.find((group) => group.id === "accounts");
    expect(accounts?.label).toBe("Accounts");
    expect(NAV_GROUPS.some((group) => group.label === "People")).toBe(false);
    expect(accounts?.items.map((item) => item.label)).toEqual(["Contacts", "Businesses"]);
    expect(accounts?.items.map((item) => item.href)).toEqual(["/contacts", "/accounts"]);
  });

  it("keeps one search surface — top bar only, not the sidebar", () => {
    const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.label));
    expect(hrefs).not.toContain("/search");
    expect(labels).not.toContain("Search");
  });

  it("keeps Phone and Inbox under Desk, and the rows Javy liked", () => {
    const desk = NAV_GROUPS.find((group) => group.id === "desk");
    const work = NAV_GROUPS.find((group) => group.id === "work");
    const records = NAV_GROUPS.find((group) => group.id === "records");
    const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.label));
    expect(desk?.items.map((item) => item.label)).toEqual(["Calendar", "Phone", "Inbox", "Alerts"]);
    expect(work?.items.some((item) => item.label === "Tasks")).toBe(true);
    expect(work?.items.some((item) => item.label === "Work queue")).toBe(true);
    expect(records?.items.some((item) => item.label === "Carriers")).toBe(true);
    expect(records?.items.some((item) => item.label === "Documents")).toBe(true);
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(1);
    expect(PINNED_HOME.label).toBe("Home");
  });
});
