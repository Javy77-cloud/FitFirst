import { describe, expect, it } from "vitest";
import { DESK_NAV_ITEMS } from "./nav-items";

describe("desk nav chrome", () => {
  it("keeps one Deals row, no Pipeline row, and no stub-only rows", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(DESK_NAV_ITEMS[0]).toEqual({ href: "/", label: "Dashboard" });
    expect(labels).toContain("Dashboard");
    expect(labels).not.toContain("Home");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(labels.filter((label) => label === "Deals")).toHaveLength(1);
    expect(DESK_NAV_ITEMS.some((item) => item.href === "/deals")).toBe(true);
    expect(labels.filter((label) => label === "Settings")).toHaveLength(1);
    expect(labels).not.toContain("Support");
    expect(labels).not.toContain("Get Started");
    expect(hrefs).not.toContain("/support");
    expect(hrefs).not.toContain("/get-started");
    expect(DESK_NAV_ITEMS.filter((item) => item.href === "/settings")).toHaveLength(1);
    expect(labels.filter((label) => label === "Automations")).toHaveLength(1);
    expect(labels.filter((label) => label === "Developer")).toHaveLength(1);
    expect(hrefs).toContain("/developer");
  });

  it("labels the /accounts module Accounts, not Business or Businesses", () => {
    const accounts = DESK_NAV_ITEMS.find((item) => item.href === "/accounts");
    expect(accounts?.label).toBe("Accounts");
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    expect(labels).not.toContain("Business");
    expect(labels).not.toContain("Businesses");
  });

  it("moves Alerts and Search out of the left nav into top chrome", () => {
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    expect(hrefs).not.toContain("/alerts");
    expect(hrefs).not.toContain("/search");
    expect(labels).not.toContain("Alerts");
    expect(labels).not.toContain("Search");
  });

  it("adds Scorecards and Glance without a second Pipeline row", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Scorecards");
    expect(labels).toContain("Glance");
    expect(hrefs).toContain("/scorecards");
    expect(hrefs).toContain("/glance");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
  });

  it("adds Book health, Renewals, and Certificates without a second Pipeline", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Book health");
    expect(labels).toContain("Renewals");
    expect(labels).toContain("Certificates");
    expect(hrefs).toContain("/book-health");
    expect(hrefs).toContain("/renewals");
    expect(hrefs).toContain("/certificates");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
  });

  it("adds Suspense and Notices without a second Pipeline or Alerts row", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Suspense");
    expect(labels).toContain("Notices");
    expect(hrefs).toContain("/suspense");
    expect(hrefs).toContain("/notices");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(hrefs).not.toContain("/alerts");
  });

  it("adds Endorsements without a second Pipeline or Alerts row", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Endorsements");
    expect(hrefs).toContain("/endorsements");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(hrefs).not.toContain("/alerts");
  });

  it("adds Service timeline, Inspections, and Installments without a second Pipeline or Alerts row", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Service timeline");
    expect(labels).toContain("Inspections");
    expect(labels).toContain("Installments");
    expect(hrefs).toContain("/service-timeline");
    expect(hrefs).toContain("/inspections");
    expect(hrefs).toContain("/installments");
    expect(labels.filter((label) => label === "Pipeline")).toHaveLength(0);
    expect(hrefs).not.toContain("/alerts");
  });

  it("uses Documents instead of Forms on the left nav", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).toContain("Documents");
    expect(labels).not.toContain("Forms");
    expect(labels).not.toContain("Document templates");
    expect(hrefs).toContain("/documents");
    expect(hrefs).not.toContain("/forms");
    expect(labels.filter((label) => label === "Documents")).toHaveLength(1);
    expect(labels).toContain("Signed");
    expect(hrefs).toContain("/esign");
    expect(labels).toContain("Email templates");
    expect(hrefs).toContain("/automations/templates");
  });

  it("removes standalone Tasks from the left nav", () => {
    const labels = DESK_NAV_ITEMS.map((item) => item.label as string);
    const hrefs = DESK_NAV_ITEMS.map((item) => item.href);
    expect(labels).not.toContain("Tasks");
    expect(hrefs).not.toContain("/tasks");
  });
});
