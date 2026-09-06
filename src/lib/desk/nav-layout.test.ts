import { describe, expect, it } from "vitest";
import { NAV_LINK_CATALOG } from "./nav-catalog";
import {
  addCatalogLink,
  addSubmenuLink,
  applyNavDrop,
  availableSubmenuLinks,
  CATALOG_ONLY_DEFAULT_EXTRAS,
  DEFAULT_PRIMARY_ORDER,
  DEFAULT_SUBMENUS,
  defaultStoredNavLayout,
  DIVIDER_ID,
  dropKeyFromElementStack,
  NAV_LAYOUT_VERSION,
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

  it("nests Quotes under Deals and template / admin children only", () => {
    expect(NAV_LAYOUT_VERSION).toBe(5);
    const rows = resolveNavLayout(null);
    const byId = Object.fromEntries(
      rows.filter((row) => row.kind === "item").map((row) => [row.id, row]),
    );
    expect(byId.deals.submenu.map((item) => item.id)).toEqual(["quotes"]);
    expect(byId.leads.submenu).toEqual([]);
    expect(byId.contacts.submenu).toEqual([]);
    expect(DEFAULT_SUBMENUS.policies).toEqual([]);
    expect(DEFAULT_SUBMENUS.tasks).toEqual([]);
    expect(DEFAULT_SUBMENUS.calendar).toEqual([]);
    expect(DEFAULT_SUBMENUS.reports).toEqual([]);
    expect(DEFAULT_SUBMENUS.settings).toEqual([]);
    expect(byId.policies.submenu).toEqual([]);
    expect(byId.tasks.submenu).toEqual([]);
    expect(byId.calendar.submenu).toEqual([]);
    expect(byId.reports.submenu).toEqual([]);
    expect(byId.settings.submenu).toEqual([]);
    expect(byId.templates.submenu.map((item) => item.id)).toEqual([
      "email-signatures",
      "email-templates",
      "document-templates",
    ]);
    expect(byId.templates.submenu.map((item) => item.label)).toEqual([
      "Email signatures",
      "Email templates",
      "Document templates",
    ]);
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
    expect(byId.admin.submenu.map((item) => item.label)).toEqual([
      "People",
      "Billing",
      "Compliance",
      "Integrations",
      "Automations",
      "Triggers",
      "Commission rates",
      "Lines of business",
      "Offices",
      "Agency chrome",
    ]);
    expect(byId.business.defaultCollapsed).toBe(true);
    expect(byId.carriers.defaultCollapsed).toBe(true);
    expect(byId.home.defaultCollapsed).toBe(false);
    const addable = availableSubmenuLinks(defaultStoredNavLayout(), "contacts").map((item) => item.id);
    expect(addable).toContain("merge");
    expect(addable).toContain("social");
    expect(addable).toContain("book-health");
    for (const id of CATALOG_ONLY_DEFAULT_EXTRAS) {
      expect(addable).toContain(id);
    }
    const addableToPolicies = availableSubmenuLinks(defaultStoredNavLayout(), "policies").map((item) => item.id);
    expect(addableToPolicies).toContain("book-health");
    expect(addableToPolicies).toContain("renewals");
    expect(addableToPolicies).toContain("certificates");
    const flat = flattenResolvedNav(rows).map((item) => item.id);
    for (const id of CATALOG_ONLY_DEFAULT_EXTRAS) {
      expect(flat).not.toContain(id);
    }
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
    const ids = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.id);
    for (const href of ["/", "/leads", "/deals", "/contacts", "/accounts", "/policies", "/carriers", "/quotes", "/tasks", "/calendar", "/settings", "/admin", "/templates", "/reports"]) {
      expect(hrefs).toContain(href);
    }
    expect(ids).not.toContain("merge");
    expect(ids).not.toContain("social");
    expect(ids).not.toContain("book-health");
    expect(ids).not.toContain("renewals");
    expect(ids).not.toContain("certificates");
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
  it("resets stale per-user prefs to the signed default rail", () => {
    const stale = normalizeNavLayout({
      version: 4,
      primaryOrder: ["social", "home", "merge", "leads"],
      hiddenPrimaryIds: ["leads"],
      submenus: {
        contacts: ["merge"],
        home: ["social"],
        policies: ["book-health", "renewals"],
        tasks: ["work-queue"],
        calendar: ["phone"],
        reports: ["scorecards", "glance", "commissions"],
      },
      personal: { timezone: "America/New_York", notifyInApp: true },
    });
    expect(stale.version).toBe(NAV_LAYOUT_VERSION);
    expect(stale.primaryOrder).toEqual([...DEFAULT_PRIMARY_ORDER]);
    expect(stale.hiddenPrimaryIds).toEqual([]);
    expect(stale.submenus.contacts).toEqual([]);
    expect(stale.submenus.policies).toEqual([]);
    expect(stale.submenus.tasks).toEqual([]);
    expect(stale.submenus.calendar).toEqual([]);
    expect(stale.submenus.reports).toEqual([]);
    expect(stale.primaryOrder).not.toContain("social");
    expect(stale.primaryOrder).not.toContain("merge");
    expect(stale.personal).toEqual({ timezone: "America/New_York", notifyInApp: true });
  });

  it("drops unknown ids and appends new default primaries", () => {
    const next = normalizeNavLayout({
      version: NAV_LAYOUT_VERSION,
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
      version: NAV_LAYOUT_VERSION,
      primaryOrder: [...DEFAULT_PRIMARY_ORDER],
      submenus: { home: ["get-started", "social", "support"], calendar: ["phone", "inbox", "alerts"] },
    });
    expect(dropped.submenus.home).toEqual(["social"]);
    expect(dropped.submenus.calendar).toEqual(["phone", "alerts"]);
    const remapped = normalizeNavLayout({
      version: NAV_LAYOUT_VERSION,
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
      version: NAV_LAYOUT_VERSION,
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

  it("nests a top-level item into a folder and pulls it back out", () => {
    const start = defaultStoredNavLayout();
    const next = applyNavDrop(start, "book-health", { type: "end-primary" });
    const nested = applyNavDrop(next, "book-health", { type: "into", id: "policies" });
    expect(nested.primaryOrder).not.toContain("book-health");
    expect(nested.submenus.policies).toContain("book-health");
    const promoted = applyNavDrop(nested, "book-health", { type: "before", id: "contacts" });
    expect(promoted.primaryOrder).toContain("book-health");
    expect(promoted.primaryOrder.indexOf("book-health")).toBe(promoted.primaryOrder.indexOf("contacts") - 1);
    expect(promoted.submenus.policies).not.toContain("book-health");
    expect(promoted.submenus["book-health"] ?? []).toEqual([]);
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

  it("adds unused catalog links on the primary rail from one Add link control", () => {
    const start = defaultStoredNavLayout();
    const added = addCatalogLink(start, "phone");
    expect(added.primaryOrder).toContain("phone");
    expect(added.primaryOrder.indexOf("phone")).toBe(added.primaryOrder.indexOf(DIVIDER_ID) - 1);
    expect(addCatalogLink(added, "phone")).toEqual(added);
    const second = addCatalogLink(added, "work-queue");
    expect(second.primaryOrder.indexOf("work-queue")).toBe(second.primaryOrder.indexOf(DIVIDER_ID) - 1);
    expect(second.primaryOrder.indexOf("phone")).toBeLessThan(second.primaryOrder.indexOf("work-queue"));
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

  it("skips the dragging row when reading a drop key from a hit stack", () => {
    const dragging = {
      closest(sel: string) {
        return sel === "[data-nav-dragging]" ? this : null;
      },
    } as unknown as Element;
    const zone = {
      dataset: { navDrop: "into:policies" },
      closest(sel: string) {
        if (sel === "[data-nav-dragging]") return null;
        if (sel === "[data-nav-drop]") return this as unknown as HTMLElement;
        return null;
      },
    } as unknown as HTMLElement;
    expect(dropKeyFromElementStack([dragging, zone])).toBe("into:policies");
    expect(dropKeyFromElementStack([dragging])).toBeNull();
  });

  it("does not create a hidden nested folder when dropping into a child", () => {
    const start = defaultStoredNavLayout();
    const next = applyNavDrop(start, "leads", { type: "into", id: "quotes" });
    expect(next.submenus.deals).toContain("leads");
    expect(next.submenus.quotes ?? []).not.toContain("leads");
    expect(next.primaryOrder).not.toContain("leads");
  });

  it("moves the divider and leaves Settings / Admin unlocked", () => {
    const start = defaultStoredNavLayout();
    const moved = applyNavDrop(start, DIVIDER_ID, { type: "after", id: "home" });
    expect(moved.primaryOrder[1]).toBe(DIVIDER_ID);
    expect(isPinnedPrimaryId("settings")).toBe(false);
    expect(isPinnedPrimaryId("admin")).toBe(false);
    expect(isHidablePrimaryId("settings")).toBe(true);
    expect(applyNavDrop(start, "admin", { type: "into", id: "home" }).submenus.home).toContain("admin");
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
    const custom = addSubmenuLink(defaultStoredNavLayout(), "home", "phone");
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
    expect(ids).toContain("work-queue");
    expect(ids).toContain("phone");
    expect(ids).toContain("scorecards");
    expect(ids).toContain("glance");
    expect(ids).toContain("commissions");
    for (const id of [
      "book-health",
      "renewals",
      "certificates",
      "service-requests",
      "suspense",
      "notices",
      "endorsements",
      "service-timeline",
      "inspections",
      "installments",
      "claims",
      "decline-log",
    ]) {
      expect(ids).toContain(id);
    }
  });
});
