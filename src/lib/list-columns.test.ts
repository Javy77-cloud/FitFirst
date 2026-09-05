import { describe, expect, it } from "vitest";
import {
  CONTACTS_LIST_COLUMNS,
  LEADS_LIST_COLUMNS,
  columnMenuLabel,
  columnStorageKey,
  defaultVisibleIds,
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

  it("defaults to every column", () => {
    expect(defaultVisibleIds(COLUMNS)).toEqual(["name", "status", "source", "phone"]);
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
    expect(afterStatus).toEqual(["pick", "name", "source", "shop"]);
    expect(toggleColumnVisibility(LEADS_LIST_COLUMNS, afterStatus, "pick")).toEqual(afterStatus);
    expect(shownColumns(LEADS_LIST_COLUMNS, afterStatus).map((column) => column.id)).toEqual([
      "pick",
      "name",
      "source",
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
