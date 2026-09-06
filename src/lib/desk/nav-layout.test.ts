import { describe, expect, it } from "vitest";
import { NAV_LINK_CATALOG } from "./nav-catalog";
import {
  addSubmenuLink,
  applyNavDrop,
  availableSubmenuLinks,
  DEFAULT_PRIMARY_ORDER,
  defaultStoredNavLayout,
  DIVIDER_ID,
  flattenResolvedNav,
  hidePrimary,
  isHidablePrimaryId,
  isPinnedPrimaryId,
  normalizeNavLayout,
  nudgePrimary,
  nudgeSubmenu,
  parseDropKey,
  parseStoredNavLayout,
  primaryIdForPath,
  removeSubmenuLink,
  reorderPrimaries,
  reorderSubmenu,
  resolveNavLayout,
  showPrimary,
  splitNavSections,
  togglePrimaryHidden,
  visibleNavItems,
} from "./nav-layout";

function itemIds(rows: ReturnType<typeof resolveNavLayout>) {
  return rows.filter((row) => row.kind === "item").map((row) => row.id);
}

function itemLabels(rows: ReturnType<typeof resolveNavLayout>) {
  return rows.filter((row) => row.kind === "item").map((row) => row.link.label);
}

describe("nav layout defaults", () => {
  it("uses the signed default rail: CRM, divider, then utility", () => {
    expect([...DEFAULT_PRIMARY_ORDER]).toEqual([
      "home",
      "leads",
      "deals",
      "contacts",
      "policies",
      "business",
      "carriers",
      "divider",
      "tasks",
      "calendar",
      "templates",
      "reports",
      "settings",
      "admin",
    ]);
    const rows = resolveNavLayout(null);
    expect(itemLabels(rows)).toEqual([
      "Home",
      "Leads",
      "Deals",
      "Contacts",
      "Policies",
      "Business",
      "Carriers",
      "Tasks",
      "Calendar",
      "Templates",
      "Reports",
      "Settings",
      "Admin",
    ]);
    expect(rows.some((row) => row.kind === "divider")).toBe(true);
    const settingsRow = rows.find((row) => row.kind === "item" && row.id === "settings");
    const adminRow = rows.find((row) => row.kind === "item" && row.id === "admin");
    expect(settingsRow && settingsRow.kind === "item" ? settingsRow.adminOnly : false).toBe(true);
    expect(adminRow && adminRow.kind === "item" ? adminRow.adminOnly : false).toBe(true);
    expect(isPinnedPrimaryId("settings")).toBe(false);
    expect(isHidablePrimaryId("settings")).toBe(true);
    expect(isHidablePrimaryId("leads")).toBe(true);
  });

  it("nests Quotes under Deals and template / report / admin children", () => {
    const rows = resolveNavLayout(null);
    const byId = Object.fromEntries(
      rows.filter((row) => row.kind === "item").map((row) => [row.id, row]),
    );
    expect(byId.deals.submenu.map((item) => item.id)).toEqual(["quotes"]);
    expect(byId.templates.submenu.map((item) => item.label)).toEqual([
      "Email signatures",
      "Email templates",
      "Document templates",
    ]);
    expect(byId.reports.submenu.map((item) => item.id)).toEqual(["scorecards", "glance", "commissions"]);
    expect(byId.admin.submenu.map((item) => item.id)).toEqual([
      "agents",
      "billing",
      "compliance",
      "integrations",
      "automations",
      "triggers",
      "commission-rates",
      "lines",
      "offices",
      "agency",
    ]);
    expect(byId.business.defaultCollapsed).toBe(true);
    expect(byId.carriers.defaultCollapsed).toBe(true);
    expect(byId.home.defaultCollapsed).toBe(false);
  });

  it("hides agency Settings, Admin, billing, and people from agents", () => {
    const agent = resolveNavLayout(null, { isAdmin: false });
    const ids = itemIds(agent);
    expect(ids).not.toContain("settings");
    expect(ids).not.toContain("admin");
    expect(flattenResolvedNav(agent).map((item) => item.id)).not.toContain("billing");
    expect(flattenResolvedNav(agent).map((item) => item.id)).not.toContain("agents");
    expect(flattenResolvedNav(agent).map((item) => item.id)).not.toContain("automations");
    expect(ids).toContain("home");
    expect(ids).toContain("templates");
    expect(ids).toContain("reports");
  });

  it("keeps live desk destinations reachable and omits stubs", () => {
    const hrefs = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.href);
    for (const href of ["/", "/leads", "/deals", "/contacts", "/accounts", "/policies", "/carriers", "/quotes", "/tasks", "/calendar", "/settings", "/admin", "/templates", "/reports"]) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs).not.toContain("/get-started");
    expect(hrefs).not.toContain("/inbox");
    expect(hrefs).not.toContain("/support");
    expect(hrefs).not.toContain("/search");
  });

  it("keeps one Deals and no Pipeline", () => {
    const labels = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.label);
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(labels.filter((label) => label === "Deals")).toHaveLength(1);
  });

  it("splits utility items after the divider so they can stay pinned", () => {
    const { main, utility } = splitNavSections(resolveNavLayout(null));
    expect(itemIds(main)).toEqual(["home", "leads", "deals", "contacts", "policies", "business", "carriers"]);
    expect(itemIds(utility)).toEqual(["tasks", "calendar", "templates", "reports", "settings", "admin"]);
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
    expect(next.primaryOrder).toContain("leads");
    expect(next.primaryOrder.indexOf("leads")).toBeGreaterThan(next.primaryOrder.indexOf("policies"));
    expect(next.primaryOrder).toContain("home");
    expect(next.primaryOrder).toContain("templates");
    expect(next.primaryOrder).toContain("admin");
    expect(next.primaryOrder).toContain(DIVIDER_ID);
    expect(next.primaryOrder).not.toContain("bogus");
    expect(next.submenus.policies).toEqual(["renewals"]);
    expect(next.submenus.leads).toEqual(["quotes"]);
  });

  it("drops retired stub submenu ids and remaps Pipeline to Deals", () => {
    const dropped = normalizeNavLayout({
      version: 1,
      primaryOrder: [...DEFAULT_PRIMARY_ORDER],
      submenus: { home: ["get-started", "social", "support"], calendar: ["phone", "inbox", "alerts"] },
    });
    expect(dropped.submenus.home).toEqual(["social"]);
    expect(dropped.submenus.calendar).toEqual(["phone", "alerts"]);
    const remapped = normalizeNavLayout({
      version: 1,
      primaryOrder: ["home", "pipeline", "leads"],
      hiddenPrimaryIds: ["pipeline", "leads"],
      submenus: { pipeline: ["quotes"], deals: ["quotes"] },
    });
    expect(remapped.primaryOrder).toContain("deals");
    expect(remapped.primaryOrder).not.toContain("pipeline");
    expect(remapped.submenus.deals).toEqual(["quotes"]);
    expect(remapped.hiddenPrimaryIds).toEqual(["leads"]);
  });

  it("lets Settings be hidden and does not pin it", () => {
    const next = normalizeNavLayout({
      version: 2,
      primaryOrder: ["leads", "home"],
      hiddenPrimaryIds: ["leads", "settings", "bogus", "leads"],
      submenus: {},
    });
    expect(next.hiddenPrimaryIds).toEqual(["leads", "settings"]);
    expect(next.primaryOrder).toContain("leads");
    expect(next.primaryOrder).toContain("settings");
  });

  it("parses bad JSON as the default layout", () => {
    expect(parseStoredNavLayout("not-json").primaryOrder).toEqual([...DEFAULT_PRIMARY_ORDER]);
    expect(parseStoredNavLayout(null).primaryOrder).toEqual([...DEFAULT_PRIMARY_ORDER]);
  });
});

describe("free rearrange", () => {
  it("pulls a folder child up to the main rail", () => {
    const start = defaultStoredNavLayout();
    const next = applyNavDrop(start, "quotes", { type: "before", id: "contacts" });
    expect(next.primaryOrder).toContain("quotes");
    expect(next.primaryOrder.indexOf("quotes")).toBe(next.primaryOrder.indexOf("contacts") - 1);
    expect(next.submenus.deals).not.toContain("quotes");
  });

  it("nests a top-level item into a folder", () => {
    const start = defaultStoredNavLayout();
    const next = applyNavDrop(start, "book-health", { type: "end-primary" });
    const nested = applyNavDrop(next, "book-health", { type: "into", id: "policies" });
    expect(nested.primaryOrder).not.toContain("book-health");
    expect(nested.submenus.policies).toContain("book-health");
  });

  it("turns any item into a folder when something is dropped onto it", () => {
    const start = defaultStoredNavLayout();
    const next = applyNavDrop(start, "phone", { type: "into", id: "leads" });
    expect(next.submenus.leads).toContain("phone");
    expect(next.submenus.calendar).not.toContain("phone");
  });

  it("moves Settings and Admin like every other row", () => {
    const start = defaultStoredNavLayout();
    const moved = applyNavDrop(start, "settings", { type: "before", id: "home" });
    expect(moved.primaryOrder[0]).toBe("settings");
    expect(applyNavDrop(start, "admin", { type: "before", id: "tasks" }).primaryOrder).toContain("admin");
  });

  it("reorders, adds, and removes submenu links", () => {
    const start = defaultStoredNavLayout();
    const reordered = reorderSubmenu(start, "deals", "quotes", "quotes");
    expect(reordered.submenus.deals).toEqual(["quotes"]);
    const added = addSubmenuLink(start, "deals", "tasks");
    expect(added.submenus.deals).toContain("tasks");
    expect(added.primaryOrder).not.toContain("tasks");
    expect(removeSubmenuLink(added, "deals", "quotes").primaryOrder).toContain("quotes");
    const available = availableSubmenuLinks(added, "deals").map((link) => link.id);
    expect(available).not.toContain("deals");
    expect(available).not.toContain("quotes");
    expect(available).not.toContain("tasks");
  });

  it("nudges a primary or submenu one step, including Settings", () => {
    const start = defaultStoredNavLayout();
    expect(nudgePrimary(start, "leads", -1).primaryOrder[0]).toBe("leads");
    expect(nudgePrimary(start, "home", -1).primaryOrder[0]).toBe("home");
    expect(nudgePrimary(start, "settings", -1).primaryOrder).not.toEqual(start.primaryOrder);
    expect(nudgeSubmenu(start, "deals", "quotes", 1).submenus.deals[0]).toBe("quotes");
  });

  it("parses drop keys for before / after / into / folder end", () => {
    expect(parseDropKey("before:policies")).toEqual({ type: "before", id: "policies" });
    expect(parseDropKey("after:quotes")).toEqual({ type: "after", id: "quotes" });
    expect(parseDropKey("into:policies")).toEqual({ type: "into", id: "policies" });
    expect(parseDropKey("end-folder:policies")).toEqual({ type: "end-folder", parentId: "policies" });
    expect(parseDropKey("end-primary")).toEqual({ type: "end-primary" });
    expect(parseDropKey("nope")).toBeNull();
  });

  it("reorders primaries including across the divider", () => {
    const start = defaultStoredNavLayout();
    const moved = reorderPrimaries(start, "tasks", "home");
    expect(moved.primaryOrder[0]).toBe("tasks");
  });
});

describe("hide and show primaries", () => {
  it("hides any primary and restores it in place", () => {
    const start = defaultStoredNavLayout();
    const hidden = hidePrimary(start, "carriers");
    expect(hidden.hiddenPrimaryIds).toEqual(["carriers"]);
    const rows = resolveNavLayout(hidden);
    const carriers = rows.find((row) => row.kind === "item" && row.id === "carriers");
    expect(carriers && carriers.kind === "item" ? carriers.hidden : false).toBe(true);
    expect(flattenResolvedNav(rows).map((item) => item.id)).not.toContain("carriers");
    expect(showPrimary(hidden, "carriers").hiddenPrimaryIds).toEqual([]);
    expect(togglePrimaryHidden(start, "home").hiddenPrimaryIds).toEqual(["home"]);
  });

  it("does not drop hidden rows from the customize list", () => {
    const hidden = hidePrimary(defaultStoredNavLayout(), "leads");
    const rows = resolveNavLayout(hidden);
    expect(visibleNavItems(rows, false).map((row) => row.id)).not.toContain("leads");
    expect(visibleNavItems(rows, true).map((row) => row.id)).toContain("leads");
  });
});

describe("primaryIdForPath", () => {
  it("opens the primary that owns the route, including submenu leaves", () => {
    expect(primaryIdForPath("/")).toBe("");
    expect(primaryIdForPath("/leads")).toBe("leads");
    expect(primaryIdForPath("/quotes")).toBe("deals");
    expect(primaryIdForPath("/accounts/abc")).toBe("business");
    expect(primaryIdForPath("/settings")).toBe("settings");
    expect(primaryIdForPath("/settings/import-export")).toBe("settings");
    expect(primaryIdForPath("/settings/agents")).toBe("admin");
    expect(primaryIdForPath("/me")).toBe("");
    expect(primaryIdForPath("/settings/profile")).toBe("");
    expect(primaryIdForPath("/settings/security")).toBe("");
    expect(primaryIdForPath("/notifications")).toBe("");
    expect(primaryIdForPath("/pipeline")).toBe("deals");
    expect(primaryIdForPath("/deals")).toBe("deals");
    expect(primaryIdForPath("/templates")).toBe("templates");
    expect(primaryIdForPath("/admin")).toBe("admin");
  });

  it("honors a custom submenu placement", () => {
    const custom = addSubmenuLink(removeSubmenuLink(defaultStoredNavLayout(), "calendar", "phone"), "home", "phone");
    expect(primaryIdForPath("/phone", custom)).toBe("home");
  });
});

describe("catalog", () => {
  it("has unique ids and no demo stubs", () => {
    const ids = NAV_LINK_CATALOG.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("get-started");
    expect(ids).not.toContain("inbox");
    expect(ids).not.toContain("support");
    expect(ids).toContain("templates");
    expect(ids).toContain("admin");
    expect(ids).toContain("reports");
  });
});
