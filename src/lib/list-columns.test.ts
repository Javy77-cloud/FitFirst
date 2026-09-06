import { describe, expect, it } from "vitest";
import {
  CONTACTS_LIST_COLUMNS,
  DEALS_LIST_COLUMNS,
  LEADS_LIST_COLUMNS,
  PIPELINE_LIST_COLUMNS,
  allColumnIds,
  columnMenuLabel,
  columnStorageKey,
  defaultVisibleIds,
  fromDeskColumns,
  mergeVisibleColumns,
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

  it("keeps Deal title and e-sign locked and hides optional deal columns by default", () => {
    expect(DEALS_LIST_COLUMNS[0]).toMatchObject({ id: "pick", locked: true });
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "title")?.locked).toBe(true);
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "esign")?.locked).toBe(true);
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).toEqual(
      expect.arrayContaining(["pick", "title", "stage", "esign", "comms"]),
    );
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).not.toContain("city");
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).not.toContain("premium");
    expect(PIPELINE_LIST_COLUMNS.find((column) => column.id === "title")?.locked).toBe(true);
    expect(PIPELINE_LIST_COLUMNS.find((column) => column.id === "actions")?.locked).toBe(true);
    expect(allColumnIds(DEALS_LIST_COLUMNS)).toEqual(
      expect.arrayContaining(["pick", "title", "city", "premium", "esign"]),
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
    const afterStatus = toggleColumnVisibility(LEADS_LIST_COLUMNS, leadsVisible, "status");
    expect(afterStatus).toEqual(["pick", "name", "source", "timer", "heat", "followUp", "shop"]);
    expect(toggleColumnVisibility(LEADS_LIST_COLUMNS, afterStatus, "pick")).toEqual(afterStatus);
    expect(shownColumns(LEADS_LIST_COLUMNS, afterStatus).map((column) => column.id)).toEqual([
      "pick",
      "name",
      "source",
      "timer",
      "heat",
      "followUp",
      "shop",
    ]);

    const contactsVisible = defaultVisibleIds(CONTACTS_LIST_COLUMNS);
    const afterLifetime = toggleColumnVisibility(CONTACTS_LIST_COLUMNS, contactsVisible, "lifetime");
    expect(afterLifetime).toEqual(["pick", "name", "status", "source", "inForce"]);
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
});
