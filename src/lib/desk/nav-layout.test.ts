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
  OPERATIONS_NAV_IDS,
  POLICIES_DEFAULT_KIDS,
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
  AGENT_PRIMARY_ORDER,
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
      "business",
      "policies",
      "carriers",
      "tasks",
      "calendar",
      "templates",
      "divider",
      "reports",
      "settings",
      "admin",
      "operations",
    ]);
    const rows = resolveNavLayout(null);
    expect(itemLabels(rows)).toEqual([
      "Dashboard",
      "Leads",
      "Deals",
      "Contacts",
      "Business",
      "Policies",
      "Carriers",
      "Tasks",
      "Calendar",
      "Templates",
      "Reports",
      "Settings",
      "Admin",
      "Operations",
    ]);
    expect(rows.some((row) => row.kind === "divider")).toBe(true);
    const settingsRow = rows.find((row) => row.kind === "item" && row.id === "settings");
    const adminRow = rows.find((row) => row.kind === "item" && row.id === "admin");
    const operationsRow = rows.find((row) => row.kind === "item" && row.id === "operations");
    expect(settingsRow && settingsRow.kind === "item" ? settingsRow.adminOnly : false).toBe(true);
    expect(adminRow && adminRow.kind === "item" ? adminRow.adminOnly : false).toBe(true);
    expect(operationsRow && operationsRow.kind === "item" ? operationsRow.adminOnly : false).toBe(true);
    expect(isPinnedPrimaryId("settings")).toBe(false);
    expect(isHidablePrimaryId("settings")).toBe(true);
    expect(isHidablePrimaryId("leads")).toBe(true);
  });

  it("leaves Deals without a Quotes child and keeps template / admin / policies children only", () => {
    expect(NAV_LAYOUT_VERSION).toBe(12);
    const rows = resolveNavLayout(null);
    const byId = Object.fromEntries(
      rows.filter((row) => row.kind === "item").map((row) => [row.id, row]),
    );
    expect(byId.deals.submenu.map((item) => item.id)).toEqual([]);
    expect(byId.leads.submenu).toEqual([]);
    expect(byId.contacts.submenu).toEqual([]);
    expect(DEFAULT_SUBMENUS.policies).toEqual([...POLICIES_DEFAULT_KIDS]);
    expect(DEFAULT_SUBMENUS.policies).toEqual(["renewals", "certificates"]);
    expect(DEFAULT_SUBMENUS.tasks).toEqual([]);
    expect(DEFAULT_SUBMENUS.calendar).toEqual([]);
    expect(DEFAULT_SUBMENUS.reports).toEqual([]);
    expect(DEFAULT_SUBMENUS.settings).toEqual([]);
    expect(byId.policies.submenu.map((item) => item.id)).toEqual(["renewals", "certificates"]);
    expect(byId.policies.submenu.map((item) => item.label)).toEqual(["Renewals", "Certificates"]);
    expect(byId.policies.link.href).toBe("/policies");
    expect(byId.policies.submenu.find((item) => item.id === "renewals")?.href).toBe("/renewals");
    expect(byId.policies.submenu.find((item) => item.id === "certificates")?.href).toBe("/certificates");
    expect(byId.policies.submenu.every((item) => item.children.length === 0)).toBe(true);
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
      "Integrations",
      "Automations",
      "Triggers",
      "Commission rates",
      "Lines of business",
      "Offices",
      "Agency chrome",
    ]);
    expect(byId.admin.submenu.map((item) => item.id)).not.toContain("operations");
    expect(byId.admin.submenu.map((item) => item.id)).not.toContain("billing");
    expect(byId.admin.submenu.map((item) => item.id)).not.toContain("compliance");
    expect(byId.operations.adminOnly).toBe(true);
    expect(byId.operations.submenu.map((item) => item.id)).toEqual([...OPERATIONS_NAV_IDS]);
    expect(byId.operations.submenu.map((item) => item.label)).toEqual([
      "Billing",
      "Claims",
      "Endorsements",
      "Compliance",
      "Carrier Downloads",
      "Book of Health",
      "Book of Life",
      "Marketplace",
    ]);
    expect(byId.operations.submenu.every((item) => item.adminOnly && item.children.length === 0)).toBe(true);
    expect(DEFAULT_SUBMENUS.operations).toEqual([...OPERATIONS_NAV_IDS]);
    expect(DEFAULT_SUBMENUS.admin).not.toContain("operations");
    expect(byId.business.defaultCollapsed).toBe(true);
    expect(byId.carriers.defaultCollapsed).toBe(true);
    expect(byId.home.defaultCollapsed).toBe(false);
    const addable = availableSubmenuLinks(defaultStoredNavLayout(), "contacts").map((item) => item.id);
    expect(addable).toContain("merge");
    expect(addable).toContain("social");
    expect(addable).not.toContain("book-health");
    for (const id of CATALOG_ONLY_DEFAULT_EXTRAS) {
      expect(addable).toContain(id);
    }
    const addableToPolicies = availableSubmenuLinks(defaultStoredNavLayout(), "policies").map((item) => item.id);
    expect(addableToPolicies).not.toContain("my-book");
    expect(addableToPolicies).not.toContain("renewals");
    expect(addableToPolicies).not.toContain("certificates");
    expect(addableToPolicies).not.toContain("book-health");
    const flat = flattenResolvedNav(rows).map((item) => item.id);
    for (const id of CATALOG_ONLY_DEFAULT_EXTRAS) {
      expect(flat).not.toContain(id);
    }
    expect(itemIds(rows)).toContain("operations");
    expect(flat).toContain("operations");
    for (const id of OPERATIONS_NAV_IDS) {
      expect(flat).toContain(id);
    }
  });

  it("hides agency Settings, Admin, billing, and people from agents", () => {
    const agent = resolveNavLayout(null, { isAdmin: false });
    const ids = itemIds(agent);
    const flat = flattenResolvedNav(agent).map((item) => item.id);
    const labels = flattenResolvedNav(agent).map((item) => item.label);
    expect(ids).not.toContain("settings");
    expect(ids).not.toContain("admin");
    expect(ids).not.toContain("operations");
    expect(flat).not.toContain("billing");
    expect(flat).not.toContain("agents");
    expect(flat).not.toContain("automations");
    expect(flat).not.toContain("operations");
    expect(labels).not.toContain("Operations");
    for (const id of OPERATIONS_NAV_IDS) {
      expect(flat).not.toContain(id);
    }
    const policies = agent.find((row) => row.kind === "item" && row.id === "policies");
    expect(policies && policies.kind === "item" ? policies.submenu.map((item) => item.id) : []).toEqual([
      "renewals",
      "certificates",
    ]);
    // Shared CRM strip; adminOnly filtered at resolve (settings/admin/operations gone).
    expect(ids).toEqual([
      "home",
      "leads",
      "deals",
      "contacts",
      "business",
      "policies",
      "carriers",
      "tasks",
      "calendar",
      "templates",
      "reports",
    ]);
  });

  it("uses the shared initial primary strip for agents (adminOnly filtered)", () => {
    const agent = resolveNavLayout(null, { isAdmin: false });
    expect([...AGENT_PRIMARY_ORDER]).toEqual([...DEFAULT_PRIMARY_ORDER]);
    expect(itemIds(agent)).toEqual(
      [...DEFAULT_PRIMARY_ORDER].filter(
        (id) => id !== "divider" && !["settings", "admin", "operations"].includes(id),
      ),
    );
  });

  it("keeps a customized agent primary order after save (no force strip)", () => {
    const custom = normalizeNavLayout(
      {
        version: 12,
        primaryOrder: [
          "contacts",
          "business",
          "policies",
          "carriers",
          "home",
          "leads",
          "deals",
          "tasks",
          "calendar",
          "templates",
          "divider",
          "reports",
          "settings",
          "admin",
          "operations",
        ],
        hiddenPrimaryIds: [],
        submenus: { policies: ["renewals", "certificates"] },
      },
      { isAdmin: false },
    );
    expect(itemIds(resolveNavLayout(custom, { isAdmin: false }))).toEqual([
      "contacts",
      "business",
      "policies",
      "carriers",
      "home",
      "leads",
      "deals",
      "tasks",
      "calendar",
      "templates",
      "reports",
    ]);
  });

  it("reorders primary items on after-drop instead of nesting into the target", () => {
    const start = defaultStoredNavLayout({ isAdmin: true });
    const next = applyNavDrop(start, "business", { type: "after", id: "contacts" });
    const ids = next.primaryOrder.filter((id) => id !== "divider");
    const contactsAt = ids.indexOf("contacts");
    expect(ids[contactsAt + 1]).toBe("business");
    expect(next.submenus.contacts ?? []).not.toContain("business");
  });

  it("keeps live desk destinations reachable and omits stubs", () => {
    const hrefs = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.href);
    const ids = flattenResolvedNav(resolveNavLayout(null)).map((item) => item.id);
    for (const href of ["/", "/leads", "/deals", "/contacts", "/accounts", "/policies", "/carriers", "/tasks", "/calendar", "/settings", "/admin", "/templates", "/reports"]) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs).not.toContain("/quotes");
    expect(ids).not.toContain("merge");
    expect(ids).not.toContain("social");
    expect(ids).not.toContain("my-book");
    expect(ids).toContain("renewals");
    expect(ids).toContain("certificates");
    expect(ids).toContain("book-health");
    expect(ids).toContain("operations");
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

  it("resets v7 prefs so Operations is a top-level admin-only row with eight kids", () => {
    const next = normalizeNavLayout({
      version: 7,
      primaryOrder: [
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
      ],
      hiddenPrimaryIds: ["operations", "billing"],
      submenus: { admin: ["agents", "operations"], operations: [] },
    });
    expect(next.version).toBe(12);
    expect(next.primaryOrder.at(-1)).toBe("operations");
    expect(next.hiddenPrimaryIds).toEqual([]);
    expect(next.submenus.admin).not.toContain("operations");
    expect(next.submenus.admin).not.toContain("billing");
    expect(next.submenus.operations).toEqual([...OPERATIONS_NAV_IDS]);
  });

  it("keeps Operations adminOnly at top-level so agents never see it", () => {
    const admin = resolveNavLayout(null, { isAdmin: true });
    const agent = resolveNavLayout(null, { isAdmin: false });
    expect(itemIds(admin)).toContain("operations");
    expect(itemIds(agent)).not.toContain("operations");
    expect(flattenResolvedNav(admin).some((item) => item.id === "operations" && item.adminOnly)).toBe(true);
    expect(flattenResolvedNav(agent).map((item) => item.id)).not.toContain("operations");
    expect(flattenResolvedNav(agent).map((item) => item.label)).not.toContain("Operations");
    expect(DEFAULT_SUBMENUS.admin).not.toContain("operations");
    expect(DEFAULT_SUBMENUS.admin).not.toContain("billing");
    expect(DEFAULT_SUBMENUS.admin).not.toContain("compliance");
    expect([...DEFAULT_SUBMENUS.operations]).toEqual([...OPERATIONS_NAV_IDS]);
    expect([...DEFAULT_SUBMENUS.policies]).toEqual(["renewals", "certificates"]);
  });

  it("splits utility items after the divider so they can stay pinned", () => {
    const { main, utility } = splitNavSections(resolveNavLayout(null));
    expect(itemIds(main)).toEqual([
      "home",
      "leads",
      "deals",
      "contacts",
      "business",
      "policies",
      "carriers",
      "tasks",
      "calendar",
      "templates",
    ]);
    expect(itemIds(utility)).toEqual(["reports", "settings", "admin", "operations"]);
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
    expect(stale.submenus.policies).toEqual(["renewals", "certificates"]);
    expect(stale.primaryOrder.at(-1)).toBe("operations");
    expect(stale.submenus.admin).not.toContain("operations");
    expect(stale.submenus.admin).not.toContain("billing");
    expect(stale.submenus.operations).toEqual([...OPERATIONS_NAV_IDS]);
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
    const start = addSubmenuLink(defaultStoredNavLayout(), "deals", "quotes");
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
    const start = addSubmenuLink(defaultStoredNavLayout(), "deals", "quotes");
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
    expect(nudgeSubmenu(addSubmenuLink(start, "deals", "quotes"), "deals", "quotes", 1).submenus.deals[0]).toBe("quotes");
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
    const start = addSubmenuLink(defaultStoredNavLayout(), "deals", "quotes");
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

  it("nests a folder under Admin and keeps its children", () => {
    const start = defaultStoredNavLayout();
    const nested = applyNavDrop(start, "operations", { type: "into", id: "admin" });
    expect(nested.primaryOrder).not.toContain("operations");
    expect(nested.submenus.admin).toContain("operations");
    expect(nested.submenus.operations).toEqual([...OPERATIONS_NAV_IDS]);
    expect(nested.submenus.admin).not.toContain("billing");
    const rows = resolveNavLayout(nested);
    const admin = rows.find((row) => row.kind === "item" && row.id === "admin");
    const operations = admin && admin.kind === "item" ? admin.submenu.find((item) => item.id === "operations") : undefined;
    expect(operations?.children.map((item) => item.id)).toEqual([...OPERATIONS_NAV_IDS]);
  });

  it("drags a nested folder to the top-level rail with kids intact, and persist keeps it", () => {
    const start = defaultStoredNavLayout();
    const nested = applyNavDrop(start, "operations", { type: "into", id: "admin" });
    const promoted = applyNavDrop(nested, "operations", { type: "after", id: "admin" });
    expect(promoted.primaryOrder).toContain("operations");
    expect(promoted.primaryOrder.indexOf("operations")).toBe(promoted.primaryOrder.indexOf("admin") + 1);
    expect(promoted.submenus.admin).not.toContain("operations");
    expect(promoted.submenus.operations).toEqual([...OPERATIONS_NAV_IDS]);
    const persisted = normalizeNavLayout(promoted);
    expect(persisted.primaryOrder).toContain("operations");
    expect(persisted.submenus.admin).not.toContain("operations");
    expect(persisted.submenus.operations).toEqual([...OPERATIONS_NAV_IDS]);
    const rows = resolveNavLayout(persisted);
    expect(itemIds(rows)).toContain("operations");
    const operations = rows.find((row) => row.kind === "item" && row.id === "operations");
    expect(operations && operations.kind === "item" ? operations.submenu.map((item) => item.id) : []).toEqual([
      ...OPERATIONS_NAV_IDS,
    ]);
  });

  it("lets any folder move freely after the default rail is applied", () => {
    const start = defaultStoredNavLayout();
    const dealsUnderPolicies = applyNavDrop(start, "deals", { type: "into", id: "policies" });
    expect(dealsUnderPolicies.primaryOrder).not.toContain("deals");
    expect(dealsUnderPolicies.submenus.policies).toContain("deals");
    expect(dealsUnderPolicies.submenus.deals).toEqual([]);
    const dealsBack = applyNavDrop(dealsUnderPolicies, "deals", { type: "before", id: "contacts" });
    expect(dealsBack.primaryOrder).toContain("deals");
    expect(dealsBack.submenus.deals).toEqual([]);
    expect(dealsBack.submenus.policies).not.toContain("deals");
    expect(normalizeNavLayout(dealsBack).submenus.deals).toEqual([]);
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
    expect(primaryIdForPath("/quotes")).toBe("");
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
    expect(primaryIdForPath("/policies")).toBe("policies");
    expect(primaryIdForPath("/renewals")).toBe("policies");
    expect(primaryIdForPath("/certificates")).toBe("policies");
    expect(primaryIdForPath("/settings/billing")).toBe("operations");
    expect(primaryIdForPath("/book-health")).toBe("operations");
    expect(primaryIdForPath("/book-life")).toBe("operations");
    expect(primaryIdForPath("/marketplace")).toBe("operations");
    expect(primaryIdForPath("/admin/operations")).toBe("operations");
    expect(primaryIdForPath("/claims")).toBe("operations");
    expect(primaryIdForPath("/endorsements")).toBe("operations");
    expect(primaryIdForPath("/compliance")).toBe("operations");
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
    expect(ids).toContain("operations");
    expect(ids).toContain("my-book");
    expect(ids).toContain("book-of-life");
    expect(ids).toContain("marketplace");
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
