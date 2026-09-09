import { describe, expect, it } from "vitest";
import {
  CONTACTS_LIST_COLUMNS,
  DEALS_LIST_COLUMNS,
  LEADS_LIST_COLUMNS,
  PIPELINE_LIST_COLUMNS,
  allColumnIds,
  clampColumnWidth,
  MIN_PICK_COLUMN_WIDTH,
  DEFAULT_PICK_COLUMN_WIDTH,
  columnMenuLabel,
  cycleListSort,
  defaultColumnWidth,
  isListColumnSortable,
  isLiveSearchColumn,
  isValueFilterColumn,
  listColumnHeaderText,
  LEADS_DEFAULT_WIDTHS,
  listSortForColumn,
  mergeColumnWidths,
  preferColumnWidths,
  parseListSort,
  parseStoredColumnLayout,
  columnStorageKey,
  defaultVisibleIds,
  fromDeskColumns,
  mergeVisibleColumns,
  reorderVisibleColumns,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
} from "./list-columns";

const COLUMNS: ListColumn[] = [
  { id: "name", label: "Name", locked: true },
  { id: "status", label: "Status" },
  { id: "source", label: "Source" },
  { id: "phone", label: "Phone" },
];

describe("list column visibility", () => {
  it("keys modules separately", () => {
    expect(columnStorageKey("leads")).toBe("ff-list-columns:v1:leads");
    expect(columnStorageKey("deals")).not.toBe(columnStorageKey("policies"));
  });

  it("defaults to every column unless defaultOn is false", () => {
    expect(defaultVisibleIds(COLUMNS)).toEqual(["name", "status", "source", "phone"]);
    expect(
      defaultVisibleIds([
        { id: "name", label: "Name", locked: true },
        { id: "city", label: "City", defaultOn: false },
        { id: "phone", label: "Phone" },
      ]),
    ).toEqual(["name", "phone"]);
  });

  it("builds desk column defs with a locked pick column", () => {
    const cols = fromDeskColumns(
      [
        { key: "title", label: "Deal" },
        { key: "city", label: "City", defaultOn: false },
      ],
      { pick: true, lock: ["title"] },
    );
    expect(cols.map((column) => column.id)).toEqual(["pick", "title", "city"]);
    expect(cols[0]?.locked).toBe(true);
    expect(cols[1]?.locked).toBe(true);
    expect(defaultVisibleIds(cols)).toEqual(["pick", "title"]);
  });

  it("keeps Deal title locked and builds columns from deal layout fields, not E-sign or Comms", () => {
    expect(DEALS_LIST_COLUMNS[0]).toMatchObject({ id: "pick", locked: true });
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "title")?.locked).toBe(true);
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "title")?.liveSearch).toBe(true);
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "stage")?.locked).toBe(true);
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "tags")?.locked).toBe(true);
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "contact")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "esign")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "comms")).toBeUndefined();
    // Phantoms not on default Edit Layout
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "assigned")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "value")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "premium")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "preferred_language")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "dependents")).toBeUndefined();
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "notes")).toBeUndefined();
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).toEqual(
      expect.arrayContaining(["pick", "title", "stage", "tags"]),
    );
    const dealsVisible = defaultVisibleIds(DEALS_LIST_COLUMNS);
    expect(dealsVisible).not.toContain("contact");
    expect(dealsVisible).not.toContain("esign");
    expect(dealsVisible).not.toContain("comms");
    expect(dealsVisible.indexOf("stage")).toBe(dealsVisible.indexOf("title") + 1);
    expect(dealsVisible).not.toContain("phone");
    expect(allColumnIds(DEALS_LIST_COLUMNS)).toContain("phone");
    expect(allColumnIds(DEALS_LIST_COLUMNS)).toContain("state");
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).not.toContain("city");
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).not.toContain("premium");
    expect(PIPELINE_LIST_COLUMNS.find((column) => column.id === "title")?.locked).toBe(true);
    expect(PIPELINE_LIST_COLUMNS.find((column) => column.id === "actions")?.locked).toBe(true);
    expect(PIPELINE_LIST_COLUMNS.find((column) => column.id === "coverageA")).toBeUndefined();
    expect(allColumnIds(DEALS_LIST_COLUMNS)).toEqual(
      expect.arrayContaining(["pick", "title", "stage", "phone", "tags"]),
    );
  });

  it("drops unknown ids and reinserts locked columns", () => {
    expect(mergeVisibleColumns(COLUMNS, ["source", "gone"])).toEqual(["name", "source"]);
    expect(mergeVisibleColumns(COLUMNS, "nope")).toEqual(defaultVisibleIds(COLUMNS));
    expect(mergeVisibleColumns(COLUMNS, [])).toEqual(["name"]);
  });

  it("toggles optional columns and keeps at least one visible", () => {
    expect(toggleColumnVisibility(COLUMNS, ["name", "status"], "status")).toEqual(["name"]);
    expect(toggleColumnVisibility(COLUMNS, ["name"], "source")).toEqual(["name", "source"]);
    expect(toggleColumnVisibility(COLUMNS, ["name"], "name")).toEqual(["name"]);
    expect(toggleColumnVisibility(COLUMNS, ["status"], "status")).toEqual(["status"]);
  });

  it("lets Leads and Contacts hide optional columns without dropping locked ones", () => {
    const leadsVisible = defaultVisibleIds(LEADS_LIST_COLUMNS);
    const afterHeat = toggleColumnVisibility(LEADS_LIST_COLUMNS, leadsVisible, "heat");
    expect(afterHeat).toEqual(["pick", "name", "status", "source", "timer", "followUp", "shop", "tags"]);
    expect(toggleColumnVisibility(LEADS_LIST_COLUMNS, afterHeat, "status")).toEqual(afterHeat);
    expect(toggleColumnVisibility(LEADS_LIST_COLUMNS, afterHeat, "pick")).toEqual(afterHeat);
    expect(toggleColumnVisibility(LEADS_LIST_COLUMNS, afterHeat, "timer")).toEqual(afterHeat);
    expect(LEADS_LIST_COLUMNS.find((column) => column.id === "timer")?.locked).toBe(true);
    expect(LEADS_LIST_COLUMNS.find((column) => column.id === "status")?.locked).toBe(true);
    expect(shownColumns(LEADS_LIST_COLUMNS, afterHeat).map((column) => column.id)).toEqual([
      "pick",
      "name",
      "status",
      "source",
      "timer",
      "followUp",
      "shop",
      "tags",
    ]);

    const contactsVisible = defaultVisibleIds(CONTACTS_LIST_COLUMNS);
    const afterLifetime = toggleColumnVisibility(CONTACTS_LIST_COLUMNS, contactsVisible, "lifetime");
    expect(afterLifetime).toEqual(["pick", "name", "status", "source", "inForce", "tags"]);
    expect(mergeVisibleColumns(CONTACTS_LIST_COLUMNS, ["status", "gone"])).toEqual([
      "pick",
      "name",
      "status",
    ]);
  });

  it("gives empty locked columns a menu label so Base UI can name the checkbox", () => {
    expect(columnMenuLabel({ id: "pick", label: "", locked: true })).toBe("Select");
    expect(columnMenuLabel({ id: "status", label: "Status" })).toBe("Status");
  });

  it("renames Leads Template/Shop and keeps user column order", () => {
    expect(LEADS_LIST_COLUMNS.find((column) => column.id === "followUp")?.label).toBe("Follow-up");
    expect(LEADS_LIST_COLUMNS.find((column) => column.id === "shop")?.label).toBe("Convert");
    expect(reorderVisibleColumns(["pick", "name", "status", "source"], "status", "name")).toEqual([
      "pick",
      "status",
      "name",
      "source",
    ]);
    expect(shownColumns(COLUMNS, ["source", "name"]).map((column) => column.id)).toEqual([
      "source",
      "name",
    ]);
    expect(mergeVisibleColumns(COLUMNS, ["phone", "status", "name"])).toEqual([
      "phone",
      "status",
      "name",
    ]);
  });

  it("clamps widths and cycles sort inactive → asc → desc → clear", () => {
    expect(clampColumnWidth(10)).toBe(56);
    expect(clampColumnWidth(10, "pick")).toBe(MIN_PICK_COLUMN_WIDTH);
    expect(clampColumnWidth(900)).toBe(720);
    expect(defaultColumnWidth({ id: "pick", label: "" })).toBe(DEFAULT_PICK_COLUMN_WIDTH);
    expect(defaultColumnWidth({ id: "pick", label: "", defaultWidth: 48 })).toBe(48);
    expect(defaultColumnWidth({ id: "name", label: "Name" })).toBe(260);
    expect(defaultColumnWidth(LEADS_LIST_COLUMNS.find((column) => column.id === "name")!)).toBe(
      LEADS_DEFAULT_WIDTHS.name,
    );
    expect(LEADS_DEFAULT_WIDTHS.name).toBeGreaterThanOrEqual(280);
    expect(listSortForColumn("status", "desc")).toEqual({ key: "status", dir: "desc" });
    expect(listSortForColumn("status", null)).toBeNull();
    expect(mergeColumnWidths(COLUMNS, { status: 200, gone: 180, name: "120" })).toEqual({
      status: 200,
      name: 120,
    });
    expect(preferColumnWidths(COLUMNS, { name: 320, status: 180 }, {})).toEqual({
      name: 320,
      status: 180,
    });
    expect(preferColumnWidths(COLUMNS, { name: 320 }, { name: 100, status: 200, gone: 90 })).toEqual({
      name: 320,
      status: 200,
    });
    expect(parseListSort({ key: "status", dir: "desc" })).toEqual({ key: "status", dir: "desc" });
    expect(parseListSort({ key: "status", dir: "sideways" })).toBeNull();
    expect(cycleListSort(null, "name")).toEqual({ key: "name", dir: "asc" });
    expect(cycleListSort({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
    expect(cycleListSort({ key: "name", dir: "desc" }, "name")).toBeNull();
    expect(cycleListSort({ key: "name", dir: "asc" }, "status")).toEqual({ key: "status", dir: "asc" });
    expect(parseStoredColumnLayout(["name", "status"]).columns).toEqual(["name", "status"]);
    expect(parseStoredColumnLayout({ columns: ["name"], widths: { name: 160 }, sort: { key: "name", dir: "asc" } })).toEqual({
      columns: ["name"],
      widths: { name: 160 },
      sort: { key: "name", dir: "asc" },
    });
  });

  it("treats Name as live search and every other labeled column as funnel-sortable", () => {
    const name = LEADS_LIST_COLUMNS.find((column) => column.id === "name")!;
    const source = LEADS_LIST_COLUMNS.find((column) => column.id === "source")!;
    const status = CONTACTS_LIST_COLUMNS.find((column) => column.id === "status")!;
    const pick = LEADS_LIST_COLUMNS.find((column) => column.id === "pick")!;
    expect(isLiveSearchColumn(name)).toBe(true);
    expect(isListColumnSortable(name)).toBe(false);
    expect(isLiveSearchColumn({ id: "title", label: "Name" })).toBe(true);
    const deal = DEALS_LIST_COLUMNS.find((column) => column.id === "title")!;
    expect(isLiveSearchColumn(deal)).toBe(true);
    expect(isListColumnSortable(deal)).toBe(false);
    expect(isLiveSearchColumn({ id: "title", label: "Deal" })).toBe(false);
    expect(isLiveSearchColumn(source)).toBe(false);
    expect(isListColumnSortable(source)).toBe(true);
    expect(isValueFilterColumn(source)).toBe(true);
    expect(isValueFilterColumn(name)).toBe(false);
    expect(isValueFilterColumn(status)).toBe(false);
    expect(isListColumnSortable(status)).toBe(true);
    expect(isListColumnSortable(pick)).toBe(false);
    expect(listColumnHeaderText(source)).toBe("Source");
    expect(listColumnHeaderText(source)).not.toContain("Referral");
    expect(listColumnHeaderText(source)).not.toMatch(/ASC|DESC/i);
  });
});
