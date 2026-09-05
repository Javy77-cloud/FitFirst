import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID, LEAD_ID } from "@/lib/fixtures/ids";
import { listSelectionActions, type SelectionRecord } from "./selection-actions";

function rec(partial: Partial<SelectionRecord> & { id: string }): SelectionRecord {
  return { label: partial.label ?? partial.id, ...partial };
}

describe("listSelectionActions", () => {
  it("shows Convert on leads and Bind on deals", () => {
    const lead = listSelectionActions({
      module: "leads",
      selected: [rec({ id: "a", email: "a@x.com" })],
    });
    expect(lead.find((item) => item.id === "convert")?.enabled).toBe(true);

    const converted = listSelectionActions({
      module: "leads",
      selected: [rec({ id: "a", convertedDealId: "deal-1" })],
    });
    expect(converted.find((item) => item.id === "convert")?.enabled).toBe(false);
    expect(converted.find((item) => item.id === "convert")?.href).toBe("/deals/deal-1");

    const deal = listSelectionActions({
      module: "deals",
      selected: [rec({ id: "d1" })],
    });
    expect(deal.find((item) => item.id === "bind")?.href).toBe("/deals/d1#bind");

    const bound = listSelectionActions({
      module: "deals",
      selected: [rec({ id: "d1", policyId: "p1", boundAt: "2026-09-01" })],
    });
    expect(bound.find((item) => item.id === "bind")?.label).toBe("Open bound file");
    expect(bound.find((item) => item.id === "bind")?.href).toBe("/policies/p1");
  });

  it("enables merge only for 2+ leads or contacts", () => {
    const one = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: "c1" })],
    });
    expect(one.find((item) => item.id === "merge")?.enabled).toBe(false);

    const two = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: "c1" }), rec({ id: "c2" })],
    });
    expect(two.find((item) => item.id === "merge")?.enabled).toBe(true);

    const deals = listSelectionActions({
      module: "deals",
      selected: [rec({ id: "d1" }), rec({ id: "d2" })],
    });
    expect(deals.find((item) => item.id === "merge")?.enabled).toBe(false);
    expect(deals.find((item) => item.id === "merge")?.reason).toMatch(/Leads and Contacts/);
  });

  it("wires email and SMS only when the selected rows have addresses", () => {
    const none = listSelectionActions({
      module: "leads",
      selected: [rec({ id: "a" })],
    });
    expect(none.find((item) => item.id === "email")?.enabled).toBe(false);
    expect(none.find((item) => item.id === "sms")?.enabled).toBe(false);

    const both = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: "c1", email: "c@x.com", phone: "3215550100" })],
    });
    expect(both.find((item) => item.id === "email")?.enabled).toBe(true);
    expect(both.find((item) => item.id === "sms")?.enabled).toBe(true);
  });

  it("never enables Call — the desk has no live trunk", () => {
    const actions = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: "c1", phone: "3215550100" })],
    });
    const call = actions.find((item) => item.id === "call");
    expect(call?.enabled).toBe(false);
    expect(call?.reason).toMatch(/No live phone line/);
  });

  it("keeps hard delete off except tasks, and archive on people + deals", () => {
    const contact = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: "c1" })],
    });
    expect(contact.find((item) => item.id === "delete")?.enabled).toBe(false);
    expect(contact.find((item) => item.id === "archive")?.enabled).toBe(true);

    const policy = listSelectionActions({
      module: "policies",
      selected: [rec({ id: "p1" })],
    });
    expect(policy.find((item) => item.id === "duplicate")?.enabled).toBe(false);
    expect(policy.find((item) => item.id === "archive")?.enabled).toBe(false);

    const task = listSelectionActions({
      module: "tasks",
      selected: [rec({ id: "t1", taskSource: "review" })],
    });
    expect(task.find((item) => item.id === "delete")?.enabled).toBe(true);
    expect(task.find((item) => item.id === "archive")?.enabled).toBe(false);
  });

  it("locks Ana so live-book actions stay off", () => {
    const actions = listSelectionActions({
      module: "leads",
      selected: [rec({ id: LEAD_ID, email: "ana@x.com" }), rec({ id: "other" })],
    });
    expect(actions.find((item) => item.id === "merge")?.enabled).toBe(false);
    expect(actions.find((item) => item.id === "archive")?.enabled).toBe(false);
    expect(actions.find((item) => item.id === "merge")?.reason).toMatch(/Ana Dib/);

    const deal = listSelectionActions({
      module: "deals",
      selected: [rec({ id: DEAL_ID })],
    });
    expect(deal.find((item) => item.id === "bind")?.enabled).toBe(false);

    const contact = listSelectionActions({
      module: "contacts",
      selected: [rec({ id: CONTACT_ID })],
    });
    expect(contact.find((item) => item.id === "duplicate")?.enabled).toBe(false);
  });

  it("enables print and macros when rows are selected", () => {
    const empty = listSelectionActions({ module: "leads", selected: [], hasMacros: true });
    expect(empty.find((item) => item.id === "print")?.enabled).toBe(false);
    expect(empty.find((item) => item.id === "run_macro")?.enabled).toBe(false);

    const picked = listSelectionActions({
      module: "leads",
      selected: [rec({ id: "a" })],
      hasMacros: true,
    });
    expect(picked.find((item) => item.id === "print")?.enabled).toBe(true);
    expect(picked.find((item) => item.id === "run_macro")?.enabled).toBe(true);
  });
});
