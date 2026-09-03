import { describe, expect, it } from "vitest";
import { recordHref } from "./record-href";

describe("recordHref", () => {
  it("maps clickable desk records", () => {
    expect(recordHref("policy", "p1")).toBe("/policies/p1");
    expect(recordHref("contact", "c1")).toBe("/contacts/c1");
    expect(recordHref("account", "a1")).toBe("/accounts/a1");
    expect(recordHref("deal", "d1")).toBe("/deals/d1");
    expect(recordHref("lead", "l1")).toBe("/leads/l1");
    expect(recordHref("carrier", "k1")).toBe("/carriers/k1");
  });

  it("does not invent a path for commission rows", () => {
    expect(recordHref("commission", "x")).toBeNull();
    expect(recordHref("policy", null)).toBeNull();
  });
});
