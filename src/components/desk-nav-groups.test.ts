import { describe, expect, it } from "vitest";
import { NAV_GROUPS, PINNED_HOME } from "./desk-nav-groups";

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
