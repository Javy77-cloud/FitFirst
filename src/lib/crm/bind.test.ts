import { describe, expect, it } from "vitest";
import {
  BindBlockedError,
  QUOTE_CREATES_POLICY,
  REVIEW_OFFSETS,
  assertCanBind,
  isCrmOnlyLine,
  planBind,
  stubPolicyNumber,
} from "./bind";

const now = new Date("2026-09-02T16:00:00.000Z");

const lead = {
  firstName: "Maya",
  lastName: "Cruz",
  email: "maya@example.com",
  phone: "321-555-0100",
};

const risk = {
  id: "risk-1",
  city: "Palm Bay",
  state: "FL",
  zip: "32909",
  address1: "12 Oak St",
  coverageA: 321000,
};

function baseDeal() {
  return {
    id: "deal-1",
    pipelineStage: "shopping",
    lineOfBusiness: "HO",
    contactId: null as string | null,
    notes: null as string | null,
  };
}

describe("bind contract", () => {
  it("never treats a quote as a policy-creating path", () => {
    expect(QUOTE_CREATES_POLICY).toBe(false);
  });

  it("blocks a second bind", () => {
    expect(() => assertCanBind("bound")).toThrow(BindBlockedError);
    expect(() =>
      planBind({
        deal: { ...baseDeal(), pipelineStage: "bound" },
        lead,
        contact: null,
        risk,
        policyNumber: "FF-10000001",
        premium: "1840",
        carrierId: null,
        now,
      }),
    ).toThrow(/already bound/);
  });

  it("plans a new contact + policy + 30/60/90 + expiration from a shopping deal", () => {
    const plan = planBind({
      deal: baseDeal(),
      lead,
      contact: null,
      risk,
      policyNumber: "FF-10000001",
      premium: "1840.50",
      carrierId: null,
      now,
    });

    expect(plan.createContact).toBe(true);
    expect(plan.contactDraft.firstName).toBe("Maya");
    expect(plan.contactDraft.lastName).toBe("Cruz");
    expect(plan.contactDraft.policyCount).toBe(1);
    expect(plan.contactDraft.tenureStart.toISOString()).toBe(now.toISOString());
    expect(plan.nextPolicyCount).toBe(1);
    expect(plan.policy.status).toBe("active");
    expect(plan.policy.effectiveDate.toISOString()).toBe(now.toISOString());
    expect(plan.policy.expirationDate.toISOString()).toBe("2027-09-02T16:00:00.000Z");
    expect(plan.policy.premium).toBe("1840.50");
    expect(plan.policy.coverageA).toBe(321000);
    expect(plan.history.eventType).toBe("bind");
    expect(plan.history.body).toMatch(/only after bind/);
    expect(plan.tasks.map((task) => task.kind)).toEqual([
      "30_day",
      "60_day",
      "90_day",
      "expiration",
    ]);
    expect(plan.tasks[0]?.dueDate.toISOString()).toBe("2026-10-02T16:00:00.000Z");
    expect(plan.tasks[1]?.dueDate.toISOString()).toBe("2026-11-01T16:00:00.000Z");
    expect(plan.tasks[2]?.dueDate.toISOString()).toBe("2026-12-01T16:00:00.000Z");
    expect(plan.tasks[3]?.dueDate.toISOString()).toBe("2027-08-18T16:00:00.000Z");
    expect(REVIEW_OFFSETS).toHaveLength(4);
    expect(plan.alerts).toHaveLength(2);
    expect(plan.alerts.every((alert) => !/email/i.test(alert.body) || /nothing emails/i.test(alert.body))).toBe(
      true,
    );
    expect(plan.alerts.some((alert) => alert.kind === "bind")).toBe(true);
    expect(plan.alerts.some((alert) => alert.kind === "review")).toBe(true);
  });

  it("reuses an existing contact and increments policy count without resetting tenure", () => {
    const tenureStart = new Date("2024-01-15T00:00:00.000Z");
    const plan = planBind({
      deal: { ...baseDeal(), contactId: "contact-1", pipelineStage: "quoting" },
      lead,
      contact: {
        id: "contact-1",
        policyCount: 2,
        tenureStart,
        lifeNotes: "Term 250k",
        healthNotes: null,
      },
      risk,
      policyNumber: "FF-20000002",
      premium: null,
      carrierId: "carrier-1",
      now,
    });

    expect(plan.createContact).toBe(false);
    expect(plan.nextPolicyCount).toBe(3);
    expect(plan.contactDraft.policyCount).toBe(3);
    expect(plan.contactDraft.tenureStart.toISOString()).toBe(tenureStart.toISOString());
    expect(plan.contactDraft.lifeNotes).toBe("Term 250k");
    expect(plan.policy.carrierId).toBe("carrier-1");
  });

  it("copies life/health CRM notes from the deal only for those lines", () => {
    const life = planBind({
      deal: { ...baseDeal(), lineOfBusiness: "LIFE", notes: "Whole life inquiry" },
      lead,
      contact: null,
      risk: null,
      policyNumber: "LF-1",
      premium: null,
      carrierId: null,
      now,
    });
    expect(isCrmOnlyLine("LIFE")).toBe(true);
    expect(life.contactDraft.lifeNotes).toBe("Whole life inquiry");
    expect(life.contactDraft.healthNotes).toBeNull();
    expect(life.policy.coverageA).toBeNull();

    const health = planBind({
      deal: { ...baseDeal(), lineOfBusiness: "HEALTH", notes: "Medicare supplement" },
      lead,
      contact: null,
      risk: null,
      policyNumber: "HL-1",
      premium: null,
      carrierId: null,
      now,
    });
    expect(health.contactDraft.healthNotes).toBe("Medicare supplement");
    expect(health.contactDraft.lifeNotes).toBeNull();
  });

  it("builds a stub policy number from the clock", () => {
    expect(stubPolicyNumber(new Date("2026-09-02T16:00:00.123Z"))).toMatch(/^FF-\d{8}$/);
  });
});
