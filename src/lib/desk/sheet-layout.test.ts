import { describe, expect, it } from "vitest";
import {
  compareSheetValues,
  cycleSheetSort,
  parseSheetLayout,
  serializeSheetLayout,
  sortSheetRows,
  togglePinnedColumns,
} from "./sheet-layout";

describe("sheet layout persistence", () => {
  it("round-trips sort and pin", () => {
    const raw = serializeSheetLayout({
      sort: { key: "title", dir: "desc" },
      pinned: ["title", "due"],
    });
    expect(parseSheetLayout(raw)).toEqual({
      sort: { key: "title", dir: "desc" },
      pinned: ["title", "due"],
    });
  });

  it("accepts JSON leftovers and empty input", () => {
    expect(parseSheetLayout(null)).toEqual({ sort: null, pinned: [] });
    expect(parseSheetLayout('{"sort":{"key":"status","dir":"asc"},"pinned":["name"]}')).toEqual({
      sort: { key: "status", dir: "asc" },
      pinned: ["name"],
    });
    expect(parseSheetLayout("not-a-layout")).toEqual({ sort: null, pinned: [] });
  });
});

describe("sheet organize helpers", () => {
  it("cycles none → asc → desc → none on the same column", () => {
    const first = cycleSheetSort(null, "due");
    const second = cycleSheetSort(first, "due");
    const third = cycleSheetSort(second, "due");
    expect(first).toEqual({ key: "due", dir: "asc" });
    expect(second).toEqual({ key: "due", dir: "desc" });
    expect(third).toBeNull();
  });

  it("starts a new column at ascending", () => {
    expect(cycleSheetSort({ key: "due", dir: "desc" }, "status")).toEqual({
      key: "status",
      dir: "asc",
    });
  });

  it("pins and unpins in the order the agent chose", () => {
    expect(togglePinnedColumns([], "title")).toEqual(["title"]);
    expect(togglePinnedColumns(["title"], "due")).toEqual(["title", "due"]);
    expect(togglePinnedColumns(["title", "due"], "title")).toEqual(["due"]);
  });
});

describe("sheet value compare", () => {
  it("sorts money and counts as numbers", () => {
    expect(compareSheetValues("$1,132.28", "$804.50")).toBeGreaterThan(0);
    expect(compareSheetValues("56", "9")).toBeGreaterThan(0);
    expect(sortSheetRows(["$2,840", "$4,180", "$1,428"], (row) => row, { key: "p", dir: "asc" })).toEqual([
      "$1,428",
      "$2,840",
      "$4,180",
    ]);
  });

  it("sorts ISO dates and leaves blanks last", () => {
    expect(compareSheetValues("2026-09-02", "2026-08-01")).toBeGreaterThan(0);
    expect(compareSheetValues("—", "Ana Dib")).toBeGreaterThan(0);
    expect(compareSheetValues("Elena Ruiz", "—")).toBeLessThan(0);
  });

  it("sorts names without treating them as dates", () => {
    expect(compareSheetValues("Ruiz, Elena", "Dib, Ana")).toBeGreaterThan(0);
    expect(
      sortSheetRows(
        [
          { title: "Follow up Ana" },
          { title: "Call Elena" },
          { title: "Issue Harbor COI" },
        ],
        (row, key) => String(row[key as "title"]),
        { key: "title", dir: "asc" },
      ).map((row) => row.title),
    ).toEqual(["Call Elena", "Follow up Ana", "Issue Harbor COI"]);
  });
});
