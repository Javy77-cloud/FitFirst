import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "./as-of";
import {
  filterAttentionItems,
  matchesAttentionWindow,
  parseAttentionWindow,
} from "./attention-window";

describe("needs-attention windows", () => {
  const asOf = DESK_AS_OF; // 2026-09-03

  it("parses the four Home filters", () => {
    expect(parseAttentionWindow("overdue")).toBe("overdue");
    expect(parseAttentionWindow("this_week")).toBe("this_week");
    expect(parseAttentionWindow("this_month")).toBe("this_month");
    expect(parseAttentionWindow("next_month")).toBe("next_month");
    expect(parseAttentionWindow("nope")).toBeNull();
  });

  it("classifies overdue / this week / this month / next month from desk clock", () => {
    expect(matchesAttentionWindow(new Date("2026-08-20T12:00:00.000Z"), asOf, "overdue")).toBe(true);
    expect(matchesAttentionWindow(new Date("2026-09-04T12:00:00.000Z"), asOf, "this_week")).toBe(true);
    expect(matchesAttentionWindow(new Date("2026-09-20T12:00:00.000Z"), asOf, "this_month")).toBe(true);
    expect(matchesAttentionWindow(new Date("2026-10-02T12:00:00.000Z"), asOf, "next_month")).toBe(true);
    expect(matchesAttentionWindow(new Date("2026-10-02T12:00:00.000Z"), asOf, "this_month")).toBe(false);
  });

  it("filters a mixed queue", () => {
    const items = [
      { id: "a", dueAt: new Date("2026-08-01T00:00:00.000Z") },
      { id: "b", dueAt: new Date("2026-09-04T00:00:00.000Z") },
      { id: "c", dueAt: new Date("2026-10-02T00:00:00.000Z") },
    ];
    expect(filterAttentionItems(items, asOf, "overdue").map((row) => row.id)).toEqual(["a"]);
    expect(filterAttentionItems(items, asOf, "next_month").map((row) => row.id)).toEqual(["c"]);
    expect(filterAttentionItems(items, asOf, null)).toHaveLength(3);
  });
});
