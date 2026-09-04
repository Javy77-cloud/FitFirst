import { describe, expect, it } from "vitest";
import { DESK_NAV_ITEMS } from "./nav-items";

describe("desk nav chrome", () => {
  it("keeps one Pipeline row, one Settings row, and a Support stub", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label);
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(1);
    expect(labels.filter((label) => label === "Settings")).toHaveLength(1);
    expect(labels).toContain("Support");
    expect(DESK_NAV_ITEMS.filter((item) => item.href === "/settings")).toHaveLength(1);
    expect(DESK_NAV_ITEMS.some((item) => item.href === "/support")).toBe(true);
  });
});
