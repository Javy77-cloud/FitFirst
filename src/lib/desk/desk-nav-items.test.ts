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

  it("moves Alerts and Search out of the left nav into top chrome", () => {
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    const labels = DESK_NAV_ITEMS.map((item) => item.label);
    expect(hrefs).not.toContain("/alerts");
    expect(hrefs).not.toContain("/search");
    expect(labels).not.toContain("Alerts");
    expect(labels).not.toContain("Search");
  });

  it("adds Scorecards and Glance without a second Pipeline row", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Scorecards");
    expect(labels).toContain("Glance");
    expect(hrefs).toContain("/scorecards");
    expect(hrefs).toContain("/glance");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(1);
  });

  it("uses Documents instead of Forms on the left nav", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Documents");
    expect(labels).not.toContain("Forms");
    expect(hrefs).toContain("/documents");
    expect(hrefs).not.toContain("/forms");
  });
});
