import { describe, expect, it } from "vitest";
import { groupIdForPath, NAV_GROUPS, pathIsActive, PINNED_HOME } from "./desk-nav-groups";

const settings = NAV_GROUPS.find((group) => group.id === "settings");
const admin = NAV_GROUPS.find((group) => group.id === "admin");

describe("desk settings IA", () => {
  it("keeps agency Settings and Admin as admin-only rail rows", () => {
    expect(NAV_GROUPS.map((group) => group.id)).toContain("settings");
    expect(NAV_GROUPS.map((group) => group.id)).toContain("admin");
    expect(NAV_GROUPS.map((group) => group.id)).toContain("operations");
    expect(NAV_GROUPS.at(-1)?.id).toBe("operations");
    expect(settings?.label).toBe("Settings");
    expect(admin?.label).toBe("Admin");
  });

  it("sends agency settings paths to Settings or Admin, not personal /me", () => {
    expect(groupIdForPath("/settings")).toBe("settings");
    expect(groupIdForPath("/settings/offices")).toBe("admin");
    expect(groupIdForPath("/settings/phone")).toBe("settings");
    expect(groupIdForPath("/settings/billing")).toBe("operations");
    expect(groupIdForPath("/settings/import-export")).toBe("settings");
    expect(groupIdForPath("/settings/import")).toBe("settings");
    expect(groupIdForPath("/settings/developer-hub")).toBe("settings");
    expect(groupIdForPath("/settings/profile")).toBe("");
    expect(groupIdForPath("/me")).toBe("");
  });

  it("treats Settings as matching the agency /settings tree, not personal pages", () => {
    const setup = { href: "/settings", label: "Settings", icon: settings!.icon, match: "/settings" };
    expect(pathIsActive("/settings", setup)).toBe(true);
    expect(pathIsActive("/settings/agency", setup)).toBe(true);
    expect(pathIsActive("/settings/import-export", setup)).toBe(true);
    expect(pathIsActive("/settings/profile", setup)).toBe(false);
    expect(pathIsActive("/me", setup)).toBe(false);
  });
});

describe("primary desk nav", () => {
  it("lists the signed default primaries, with Business and Carriers after Policies", () => {
    expect(NAV_GROUPS.map((group) => group.id)).toEqual([
      "home",
      "leads",
      "deals",
      "contacts",
      "policies",
      "business",
      "carriers",
      "tasks",
      "calendar",
      "templates",
      "reports",
      "settings",
      "admin",
      "operations",
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

  it("keeps Quotes under Deals and omits demo stubs and Pipeline", () => {
    const calendar = NAV_GROUPS.find((group) => group.id === "calendar");
    const home = NAV_GROUPS.find((group) => group.id === "home");
    const deals = NAV_GROUPS.find((group) => group.id === "deals");
    const templates = NAV_GROUPS.find((group) => group.id === "templates");
    const labels = NAV_GROUPS.flatMap((group) => [
      group.label,
      ...group.items.map((item) => item.label),
    ]);
    expect(calendar?.items.map((item) => item.label)).toEqual([]);
    expect(home?.items.map((item) => item.label)).toEqual([]);
    expect(templates?.items.map((item) => item.label)).toEqual([
      "Email signatures",
      "Email templates",
      "Document templates",
    ]);
    expect(labels).not.toContain("Get Started");
    expect(labels).not.toContain("Inbox");
    expect(labels).not.toContain("Support");
    expect(labels).not.toContain("Pipeline");
    expect(NAV_GROUPS.find((group) => group.id === "contacts")?.items).toEqual([]);
    expect(labels).not.toContain("Merge");
    expect(labels).not.toContain("Social");
    expect(NAV_GROUPS.find((group) => group.id === "policies")?.items.map((item) => item.label)).toEqual([
      "My Book",
      "Renewals",
      "Certificates",
    ]);
    expect(deals?.items.some((item) => item.label === "Quotes")).toBe(true);
    expect(pathIsActive("/deals", { href: "/deals", label: "Deals", icon: deals!.icon, match: "/deals" })).toBe(true);
    expect(pathIsActive("/pipeline", { href: "/deals", label: "Deals", icon: deals!.icon, match: "/deals" })).toBe(true);
    expect(groupIdForPath("/pipeline")).toBe("deals");
    expect(PINNED_HOME.label).toBe("Home");
  });
});
