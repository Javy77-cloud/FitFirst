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
    expect(isNavActive("/pipeline?pipeline=p-c", "/pipeline")).toBe(true);
    expect(isNavActive("/settings", "/settings/phone")).toBe(true);
  });
});
