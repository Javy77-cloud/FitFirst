import { describe, expect, it } from "vitest";
import { isNavActive } from "./nav";

describe("isNavActive", () => {
  it("highlights Contacts on the list and a contact record", () => {
    expect(isNavActive("/contacts", "/contacts")).toBe(true);
    expect(isNavActive("/contacts", "/contacts/4444")).toBe(true);
    expect(isNavActive("/contacts", "/leads")).toBe(false);
  });

  it("does not treat Home as a prefix of every route", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/contacts")).toBe(false);
    expect(isNavActive("/deals", "/deals")).toBe(true);
    expect(isNavActive("/deals", "/pipeline")).toBe(true);
    expect(isNavActive("/settings", "/settings/phone")).toBe(true);
  });

  it("treats the old Forms routes as the Documents nav row", () => {
    expect(isNavActive("/documents", "/documents")).toBe(true);
    expect(isNavActive("/documents", "/forms")).toBe(true);
    expect(isNavActive("/documents", "/forms/fl-ho3")).toBe(true);
  });
});
