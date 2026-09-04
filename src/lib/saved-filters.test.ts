import { describe, expect, it } from "vitest";
import {
  filterStorageKey,
  matchesField,
  parseSavedFilters,
  pickFilterParams,
  queryFromParams,
  sameFilterParams,
} from "./saved-filters";

describe("saved named filters", () => {
  it("keys modules separately", () => {
    expect(filterStorageKey("leads")).toBe("ff-saved-filters:v1:leads");
    expect(filterStorageKey("deals")).not.toBe(filterStorageKey("policies"));
  });

  it("picks and compares URL params", () => {
    const params = pickFilterParams({ status: "new", source: ["email"], extra: "x" }, ["status", "source"]);
    expect(params).toEqual({ status: "new", source: "email" });
    expect(sameFilterParams(params, { source: "email", status: "new" })).toBe(true);
    expect(sameFilterParams(params, { status: "new" })).toBe(false);
    expect(queryFromParams(params)).toBe("status=new&source=email");
  });

  it("drops junk saved rows and matches fields loosely", () => {
    expect(parseSavedFilters([{ id: "1", name: "Open", params: { status: "new" } }])).toEqual([
      { id: "1", name: "Open", params: { status: "new" } },
    ]);
    expect(parseSavedFilters([{ id: 1, name: "x" }])).toEqual([]);
    expect(matchesField("Shopping", "shopping")).toBe(true);
    expect(matchesField("new", "converted")).toBe(false);
  });
});
