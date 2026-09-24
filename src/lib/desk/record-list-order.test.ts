import { describe, expect, it } from "vitest";
import { columnOrderIds, detailHref, listPosition, listOrderStorageKey } from "./record-list-order";

describe("record list order", () => {
  it("builds storage keys and detail hrefs with tab", () => {
    expect(listOrderStorageKey("contacts")).toBe("ff:list-order:contacts");
    expect(listOrderStorageKey("accounts")).toBe("ff:list-order:accounts");
    expect(listOrderStorageKey("policies")).toBe("ff:list-order:policies");
    expect(detailHref("contacts", "abc", "details")).toBe("/contacts/abc?tab=details");
    expect(detailHref("accounts", "xyz", null)).toBe("/accounts/xyz");
    expect(detailHref("policies", "pol", "coverage")).toBe("/policies/pol?tab=coverage");
    expect(detailHref("policies", "pol", null)).toBe("/policies/pol");
  });

  it("walks policy bands left to right in the filtered card order", () => {
    const ids = columnOrderIds(
      [
        { id: "current-a", column: "current" },
        { id: "now-a", column: "now" },
        { id: "watch-a", column: "watch" },
        { id: "now-b", column: "now" },
        { id: "lapsed-a", column: "lapsed" },
      ],
      [{ id: "now" }, { id: "watch" }, { id: "current" }, { id: "lapsed" }],
    );
    expect(ids).toEqual(["now-a", "now-b", "watch-a", "current-a", "lapsed-a"]);
  });

  it("finds N of M position", () => {
    expect(listPosition(["a", "b", "c"], "b")).toEqual({ index: 1, total: 3 });
    expect(listPosition(["a", "b"], "z")).toBeNull();
    expect(listPosition([], "a")).toBeNull();
  });
});
