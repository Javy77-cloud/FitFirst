import { describe, expect, it } from "vitest";
import { detailHref, listPosition, listOrderStorageKey } from "./record-list-order";

describe("record list order", () => {
  it("builds storage keys and detail hrefs with tab", () => {
    expect(listOrderStorageKey("contacts")).toBe("ff:list-order:contacts");
    expect(listOrderStorageKey("accounts")).toBe("ff:list-order:accounts");
    expect(detailHref("contacts", "abc", "details")).toBe("/contacts/abc?tab=details");
    expect(detailHref("accounts", "xyz", null)).toBe("/accounts/xyz");
  });

  it("finds N of M position", () => {
    expect(listPosition(["a", "b", "c"], "b")).toEqual({ index: 1, total: 3 });
    expect(listPosition(["a", "b"], "z")).toBeNull();
    expect(listPosition([], "a")).toBeNull();
  });
});
