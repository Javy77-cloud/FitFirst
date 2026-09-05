import { describe, expect, it } from "vitest";
import { NAV_LINK_CATALOG } from "./nav-catalog";
import {
  addSubmenuLink,
  availableSubmenuLinks,
  DEFAULT_PRIMARY_ORDER,
  defaultStoredNavLayout,
  flattenResolvedNav,
  hidePrimary,
  isHidablePrimaryId,
  normalizeNavLayout,
  nudgePrimary,
  nudgeSubmenu,
  parseStoredNavLayout,
  primaryIdForPath,
  removeSubmenuLink,
  reorderPrimaries,
  reorderSubmenu,
  resolveNavLayout,
  showPrimary,
  togglePrimaryHidden,
} from "./nav-layout";

describe("nav layout defaults", () => {
  it("keeps the primary modules Javy named, plus Tasks and Calendar", () => {
    expect([...DEFAULT_PRIMARY_ORDER]).toEqual([
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
    ]);
    const rows = resolveNavLayout(null);
    expect(rows.map((row) => row.link.label)).toEqual([
      "Home",
      "Leads",
      "Deals",
      "Pipeline",
      "Contacts",
      "Business",
      "Policies",
      "Carriers",
      "Tasks",
      "Calendar",
      "Settings",
    ]);
    expect(rows.find((row) => row.id === "settings")?.pinned).toBe(true);
    expect(rows.find((row) => row.id === "settings")?.hidable).toBe(false);
    expect(rows.every((row) => row.hidden === false)).toBe(true);
    expect(isHidablePrimaryId("leads")).toBe(true);
    expect(isHidablePrimaryId("settings")).toBe(false);
  });

  it("puts existing desk rows under a primary so nothing is dropped", () => {
    const hrefs = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.href);
    for (const href of [
      "/",
      "/leads",
      "/deals",
      "/pipeline?pipeline=p-c",
      "/contacts",
      "/accounts",
      "/policies",
      "/carriers",
      "/quotes",
      "/tasks",
      "/calendar",
      "/settings",
      "/notifications",
      "/get-started",
    ]) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs).not.toContain("/search");
  });

  it("keeps one Pipeline and one Settings", () => {
    const labels = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.label);
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(1);
    expect(labels.filter((label) => label === "Settings")).toHaveLength(1);
  });
});

describe("normalizeNavLayout", () => {
  it("drops unknown ids and appends new default primaries", () => {
    const next = normalizeNavLayout({
      version: 1,
      primaryOrder: ["policies", "bogus", "leads"],
      submenus: { policies: ["renewals", "nope", "policies"], leads: ["quotes"] },
    });
    expect(next.primaryOrder[0]).toBe("policies");
    expect(next.primaryOrder[1]).toBe("leads");
    expect(next.primaryOrder).toContain("home");
    expect(next.primaryOrder).not.toContain("bogus");
    expect(next.submenus.policies).toEqual(["renewals"]);
    expect(next.submenus.leads).toEqual(["quotes"]);
    expect(next.hiddenPrimaryIds).toEqual([]);
  });

  it("keeps hidden primaries and drops Settings or unknown hide ids", () => {
    const next = normalizeNavLayout({
      version: 1,
      primaryOrder: ["leads", "home"],
      hiddenPrimaryIds: ["leads", "settings", "bogus", "leads"],
      submenus: {},
    });
    expect(next.hiddenPrimaryIds).toEqual(["leads"]);
    expect(next.primaryOrder).toContain("leads");
  });

  it("parses bad JSON as the default layout", () => {
    expect(parseStoredNavLayout("not-json").primaryOrder).toEqual([...DEFAULT_PRIMARY_ORDER]);
    expect(parseStoredNavLayout(null).primaryOrder).toEqual([...DEFAULT_PRIMARY_ORDER]);
  });

  it("fills hiddenPrimaryIds when an older saved layout omitted them", () => {
    const next = parseStoredNavLayout(
      JSON.stringify({
        version: 1,
        primaryOrder: ["policies", "home"],
        submenus: { policies: ["renewals"] },
      }),
    );
    expect(next.hiddenPrimaryIds).toEqual([]);
    expect(next.primaryOrder[0]).toBe("policies");
    expect(next.submenus.policies).toEqual(["renewals"]);
  });
});

describe("reorder and submenu edits", () => {
  it("reorders primaries without moving Settings", () => {
    const start = defaultStoredNavLayout();
    const moved = reorderPrimaries(start, "carriers", "home");
    expect(moved.primaryOrder[0]).toBe("carriers");
    expect(moved.primaryOrder).not.toContain("settings");
    expect(reorderPrimaries(start, "settings", "home").primaryOrder).toEqual(start.primaryOrder);
  });

  it("reorders, adds, and removes submenu links", () => {
    const start = defaultStoredNavLayout();
    const reordered = reorderSubmenu(start, "deals", "quotes", "quotes");
    expect(reordered.submenus.deals).toEqual(["quotes"]);
    const added = addSubmenuLink(start, "deals", "tasks");
    expect(added.submenus.deals).toEqual(["quotes", "tasks"]);
    expect(addSubmenuLink(added, "deals", "deals").submenus.deals).toEqual(["quotes", "tasks"]);
    expect(removeSubmenuLink(added, "deals", "quotes").submenus.deals).toEqual(["tasks"]);
    const available = availableSubmenuLinks(added, "deals").map((link) => link.id);
    expect(available).not.toContain("deals");
    expect(available).not.toContain("quotes");
    expect(available).not.toContain("tasks");
    expect(available.length).toBeGreaterThan(10);
  });

  it("can move a submenu link past another", () => {
    const start = addSubmenuLink(defaultStoredNavLayout(), "home", "phone");
    const moved = reorderSubmenu(start, "home", "phone", "get-started");
    expect(moved.submenus.home[0]).toBe("phone");
  });

  it("nudges a primary or submenu one step", () => {
    const start = defaultStoredNavLayout();
    expect(nudgePrimary(start, "leads", -1).primaryOrder[0]).toBe("leads");
    expect(nudgePrimary(start, "home", -1).primaryOrder[0]).toBe("home");
    expect(nudgePrimary(start, "settings", -1).primaryOrder).toEqual(start.primaryOrder);
    const home = addSubmenuLink(start, "home", "phone");
    expect(nudgeSubmenu(home, "home", "get-started", 1).submenus.home[1]).toBe("get-started");
  });
});

describe("hide and show primaries", () => {
  it("hides any primary except Settings and restores it in place", () => {
    const start = defaultStoredNavLayout();
    const hidden = hidePrimary(start, "carriers");
    expect(hidden.hiddenPrimaryIds).toEqual(["carriers"]);
    expect(hidden.primaryOrder).toEqual(start.primaryOrder);
    const rows = resolveNavLayout(hidden);
    expect(rows.find((row) => row.id === "carriers")?.hidden).toBe(true);
    expect(flattenResolvedNav(rows).map((item) => item.id)).not.toContain("carriers");
    expect(showPrimary(hidden, "carriers").hiddenPrimaryIds).toEqual([]);
    expect(hidePrimary(start, "settings").hiddenPrimaryIds).toEqual([]);
    expect(togglePrimaryHidden(hidden, "carriers").hiddenPrimaryIds).toEqual([]);
    expect(togglePrimaryHidden(start, "home").hiddenPrimaryIds).toEqual(["home"]);
  });

  it("lets Javy hide every module except Settings", () => {
    let layout = defaultStoredNavLayout();
    for (const id of DEFAULT_PRIMARY_ORDER) {
      layout = hidePrimary(layout, id);
    }
    expect(layout.hiddenPrimaryIds).toEqual([...DEFAULT_PRIMARY_ORDER]);
    const visible = resolveNavLayout(layout).filter((row) => !row.hidden);
    expect(visible.map((row) => row.id)).toEqual(["settings"]);
  });
});

describe("primaryIdForPath", () => {
  it("opens the primary that owns the route, including submenu leaves", () => {
    expect(primaryIdForPath("/")).toBe("");
    expect(primaryIdForPath("/leads")).toBe("leads");
    expect(primaryIdForPath("/quotes")).toBe("deals");
    expect(primaryIdForPath("/accounts/abc")).toBe("business");
    expect(primaryIdForPath("/settings/import-export")).toBe("settings");
    expect(primaryIdForPath("/notifications")).toBe("calendar");
    expect(primaryIdForPath("/alerts")).toBe("calendar");
  });

  it("honors a custom submenu placement", () => {
    const custom = addSubmenuLink(removeSubmenuLink(defaultStoredNavLayout(), "calendar", "alerts"), "home", "alerts");
    expect(primaryIdForPath("/notifications", custom)).toBe("home");
  });
});

describe("catalog", () => {
  it("has unique ids and hrefs for each addable link", () => {
    const ids = NAV_LINK_CATALOG.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
