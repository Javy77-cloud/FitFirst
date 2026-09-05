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

  it("highlights Social on the pulse page", () => {
    expect(navItemIsActive("/social", "/social")).toBe(true);
    expect(navItemIsActive("/", "/social")).toBe(false);
  });

  it("highlights Settings on nested settings pages", () => {
    expect(navItemIsActive("/settings", "/settings")).toBe(true);
    expect(navItemIsActive("/settings/phone", "/settings")).toBe(true);
  });

  it("highlights Support on the stub page", () => {
    expect(navItemIsActive("/support", "/support")).toBe(true);
    expect(navItemIsActive("/support", "/settings")).toBe(false);
  });

  it("highlights Documents on the module, fill workspace, and old Forms routes", () => {
    expect(navItemIsActive("/documents", "/documents")).toBe(true);
    expect(navItemIsActive("/documents/fill/fl-ho3", "/documents")).toBe(true);
    expect(navItemIsActive("/forms", "/documents")).toBe(true);
    expect(navItemIsActive("/forms/fl-ho3", "/documents")).toBe(true);
    expect(navItemIsActive("/quotes", "/documents")).toBe(false);
  });

  it("highlights Scorecards and Glance on those modules", () => {
    expect(navItemIsActive("/scorecards", "/scorecards")).toBe(true);
    expect(navItemIsActive("/scorecards/abc", "/scorecards")).toBe(true);
    expect(navItemIsActive("/glance", "/glance")).toBe(true);
    expect(navItemIsActive("/policies", "/glance")).toBe(false);
    expect(navItemIsActive("/scorecards", "/glance")).toBe(false);
  });

  it("highlights Certificates on the holder directory", () => {
    expect(navItemIsActive("/certificates", "/certificates")).toBe(true);
    expect(navItemIsActive("/certificates/holders", "/certificates")).toBe(true);
    expect(navItemIsActive("/suspense", "/certificates")).toBe(false);
  });

  it("highlights Automations on hub and section pages", () => {
    expect(navItemIsActive("/automations", "/automations")).toBe(true);
    expect(navItemIsActive("/automations/builder", "/automations")).toBe(true);
    expect(navItemIsActive("/automations/sequences", "/automations")).toBe(true);
    expect(navItemIsActive("/automations/signatures", "/automations")).toBe(true);
    expect(navItemIsActive("/settings/email-templates", "/automations")).toBe(false);
  });
});
