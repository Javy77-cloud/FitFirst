import { describe, expect, it } from "vitest";
import { activityLogBody, assertRelatedRecord, hasRelatedRecord } from "./activity";

describe("activity related-record FKs", () => {
  it("rejects an orphan task with no contact, policy, business, deal, or lead", () => {
    expect(hasRelatedRecord({})).toBe(false);
    expect(() => assertRelatedRecord({})).toThrow(
      /Contact, Policy, Business, Deal, and\/or Lead/,
    );
  });

  it("accepts contact, policy, business, deal, or lead", () => {
    expect(hasRelatedRecord({ contactId: "c" })).toBe(true);
    expect(hasRelatedRecord({ policyId: "p" })).toBe(true);
    expect(hasRelatedRecord({ accountId: "a" })).toBe(true);
    expect(hasRelatedRecord({ dealId: "deal-only" })).toBe(true);
    expect(hasRelatedRecord({ leadId: "lead-only" })).toBe(true);
    expect(hasRelatedRecord({ contactId: "c", policyId: "p" })).toBe(true);
    expect(assertRelatedRecord({ dealId: "deal-only" }).dealId).toBe("deal-only");
    expect(assertRelatedRecord({ leadId: "lead-only" }).leadId).toBe("lead-only");
  });

  it("writes a log line for every kind", () => {
    expect(activityLogBody("task", "created", "30-day check-in")).toBe(
      "Task created: 30-day check-in",
    );
    expect(activityLogBody("meeting", "created", "Review bound HO3")).toBe(
      "Meeting created: Review bound HO3",
    );
    expect(activityLogBody("call", "logged", "Bind confirmation")).toBe(
      "Call logged: Bind confirmation",
    );
    expect(activityLogBody("email", "created", "Quote packet")).toBe(
      "Email created: Quote packet",
    );
    expect(activityLogBody("sms", "logged", "Inspection reminder")).toBe(
      "SMS logged: Inspection reminder",
    );
  });
});
