import { describe, expect, it } from "vitest";
import { recordHref } from "./record-href";

describe("recordHref", () => {
  it("covers every Ask-a-teammate record type", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(recordHref("policy", id)).toBe(`/policies/${id}`);
    expect(recordHref("claim", id)).toBe(`/claims/${id}`);
    expect(recordHref("contact", id)).toBe(`/contacts/${id}`);
    expect(recordHref("account", id)).toBe(`/accounts/${id}`);
    expect(recordHref("deal", id)).toBe(`/deals/${id}`);
    expect(recordHref("lead", id)).toBe(`/leads/${id}`);
    expect(recordHref("carrier", id)).toBe(`/carriers/${id}`);
    expect(recordHref("activity", id)).toBe(`/calendar?event=${id}`);
    expect(recordHref("document", id)).toBe(`/files/${id}`);
    expect(recordHref("commission", id)).toBeNull();
    expect(recordHref("policy", null)).toBeNull();
  });
});
