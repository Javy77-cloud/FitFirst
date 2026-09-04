import { describe, expect, it } from "vitest";
import { navHrefPath, navItemIsActive } from "./nav-active";

describe("navHrefPath", () => {
  it("strips the query so Pipeline still matches", () => {
    expect(navHrefPath("/pipeline?pipeline=p-c")).toBe("/pipeline");
    expect(navHrefPath("/leads")).toBe("/leads");
  });
});

describe("navItemIsActive", () => {
  it("highlights Home only on /", () => {
    expect(navItemIsActive("/", "/")).toBe(true);
    expect(navItemIsActive("/get-started", "/")).toBe(false);
    expect(navItemIsActive("/pipeline", "/")).toBe(false);
  });

  it("highlights Pipeline from the query href and nested paths", () => {
    expect(navItemIsActive("/pipeline", "/pipeline?pipeline=p-c")).toBe(true);
    expect(navItemIsActive("/pipeline", "/pipeline")).toBe(true);
    expect(navItemIsActive("/deals", "/pipeline?pipeline=p-c")).toBe(false);
  });

  it("highlights list rows on their record pages", () => {
    expect(navItemIsActive("/contacts/abc", "/contacts")).toBe(true);
    expect(navItemIsActive("/deals/abc", "/deals")).toBe(true);
    expect(navItemIsActive("/policies/abc", "/policies")).toBe(true);
    expect(navItemIsActive("/carriers/abc", "/carriers")).toBe(true);
    expect(navItemIsActive("/quotes", "/quotes")).toBe(true);
    expect(navItemIsActive("/quotes", "/deals")).toBe(false);
  });

  it("treats /businesses as the Businesses nav row", () => {
    expect(navItemIsActive("/accounts", "/accounts")).toBe(true);
    expect(navItemIsActive("/accounts/abc", "/accounts")).toBe(true);
    expect(navItemIsActive("/businesses", "/accounts")).toBe(true);
    expect(navItemIsActive("/businesses/abc", "/accounts")).toBe(true);
  });

  it("highlights Settings on nested settings pages", () => {
    expect(navItemIsActive("/settings", "/settings")).toBe(true);
    expect(navItemIsActive("/settings/phone", "/settings")).toBe(true);
  });

  it("highlights Automations on hub and section pages", () => {
    expect(navItemIsActive("/automations", "/automations")).toBe(true);
    expect(navItemIsActive("/automations/builder", "/automations")).toBe(true);
    expect(navItemIsActive("/automations/signatures", "/automations")).toBe(true);
    expect(navItemIsActive("/settings/email-templates", "/automations")).toBe(false);
  });
});
