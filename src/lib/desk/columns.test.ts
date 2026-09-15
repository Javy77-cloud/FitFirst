import { describe, expect, it } from "vitest";
import { LEAD_FORM_COLUMN_KEYS, TABLE_COLUMNS, parseColumns } from "./columns";

describe("table column pickers", () => {
  it("exposes every New Lead layout field as a choosable Leads column", () => {
    const keys = new Set((TABLE_COLUMNS.leads ?? []).map((col) => col.key));
    for (const field of LEAD_FORM_COLUMN_KEYS) {
      expect(keys.has(field)).toBe(true);
    }
    expect(keys.has("status")).toBe(true);
    expect(keys.has("tags")).toBe(true);
    expect(keys.has("preferredLanguage")).toBe(false);
    expect(keys.has("preferred_language")).toBe(false);
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
    expect(deals.has("phone")).toBe(true);
    expect(deals.has("email")).toBe(true);
    expect(deals.has("state")).toBe(true);
    expect(deals.has("assigned")).toBe(false);
    expect(deals.has("value")).toBe(false);
    expect(deals.has("premium")).toBe(false);
    expect(deals.has("preferred_language")).toBe(false);
    expect(deals.has("esign")).toBe(false);
    expect(deals.has("comms")).toBe(false);
    expect(deals.has("contact")).toBe(false);
    expect((TABLE_COLUMNS.deals ?? []).map((col) => col.key).slice(0, 2)).toEqual(["title", "stage"]);
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

  it("drops dead deal columns and keeps phone from the deal field list", () => {
    expect(parseColumns("deals", "title,stage,phone")).toEqual(["title", "stage", "phone"]);
    expect(parseColumns("deals", "title,stage,phone,assigned")).toEqual(["title", "stage", "phone", "assigned"]);
    expect(parseColumns("deals", "title,stage,esign,comms")).toEqual(["title", "stage"]);
    expect(parseColumns("policies", "number,status")).toEqual(["number", "status"]);
  });
});
