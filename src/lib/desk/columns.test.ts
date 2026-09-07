import { describe, expect, it } from "vitest";
import { LEAD_FORM_COLUMN_KEYS, TABLE_COLUMNS, parseColumns } from "./columns";

describe("table column pickers", () => {
  it("exposes every New Lead form field as a choosable Leads column", () => {
    const keys = new Set((TABLE_COLUMNS.leads ?? []).map((col) => col.key));
    for (const field of LEAD_FORM_COLUMN_KEYS) {
      expect(keys.has(field)).toBe(true);
    }
    expect(keys.has("stage")).toBe(true);
  });

  it("lets each module picker include create/edit form fields", () => {
    const contacts = new Set((TABLE_COLUMNS.contacts ?? []).map((col) => col.key));
    for (const key of [
      "firstName",
      "lastName",
      "email",
      "phone",
      "mailingAddress",
      "city",
      "state",
      "zip",
      "dateOfBirth",
      "ssn",
      "emailOptOut",
      "smsOptOut",
    ]) {
      expect(contacts.has(key)).toBe(true);
    }
    const deals = new Set((TABLE_COLUMNS.deals ?? []).map((col) => col.key));
    expect(deals.has("shopLines")).toBe(true);
    expect(deals.has("subType")).toBe(true);
    expect(deals.has("esign")).toBe(true);
    expect(deals.has("contact")).toBe(true);
    expect(deals.has("phone")).toBe(false);
    expect((TABLE_COLUMNS.deals ?? []).map((col) => col.key).slice(0, 2)).toEqual(["title", "contact"]);
    const accounts = new Set((TABLE_COLUMNS.accounts ?? []).map((col) => col.key));
    expect(accounts.has("email")).toBe(true);
    expect(accounts.has("mailingAddress")).toBe(true);
    const policies = new Set((TABLE_COLUMNS.policies ?? []).map((col) => col.key));
    expect(policies.has("coverageA")).toBe(true);
    expect(policies.has("premises")).toBe(true);
    expect(policies.has("esign")).toBe(true);
    const claims = new Set((TABLE_COLUMNS.claims ?? []).map((col) => col.key));
    expect(claims.has("dateOfLoss")).toBe(true);
    expect(claims.has("description")).toBe(true);
    expect(claims.has("carrierClaim")).toBe(true);
    expect(claims.has("policy")).toBe(true);
    expect(claims.has("party")).toBe(true);
    expect((TABLE_COLUMNS["eo-gaps"] ?? []).map((col) => col.key)).toEqual([
      "severity",
      "flag",
      "record",
      "detail",
    ]);
    expect((TABLE_COLUMNS["eo-trail"] ?? []).map((col) => col.key)).toContain("ids");
  });

  it("keeps the e-sign list column on even if older column prefs omit it", () => {
    expect(parseColumns("deals", "title,stage,line")).toContain("esign");
    expect(parseColumns("deals", "title,stage,line,phone")).toEqual(["title", "contact", "stage", "line", "esign"]);
    expect(parseColumns("policies", "number,status")).toContain("esign");
  });
});
