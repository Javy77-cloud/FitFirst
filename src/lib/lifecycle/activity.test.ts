import { describe, expect, it } from "vitest";
import { activityLogBody, assertRelatedRecord, hasRelatedRecord } from "./activity";

describe("activity related-record FKs", () => {
  it("rejects an orphan task with no contact, policy, or business", () => {
    expect(hasRelatedRecord({})).toBe(false);
    expect(hasRelatedRecord({ dealId: "deal-only" })).toBe(false);
    expect(() => assertRelatedRecord({ dealId: "deal-only" })).toThrow(/Contact, Policy, and\/or Business/);
  });

  it("accepts contact and/or policy and/or business", () => {
    expect(hasRelatedRecord({ contactId: "c" })).toBe(true);
    expect(hasRelatedRecord({ policyId: "p" })).toBe(true);
    expect(hasRelatedRecord({ accountId: "a" })).toBe(true);
    expect(hasRelatedRecord({ contactId: "c", policyId: "p" })).toBe(true);
    expect(hasRelatedRecord({ contactId: "c", accountId: "a" })).toBe(true);
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
    expect(
      activityLogBody("call", "logged", "Bind confirmation", {
        durationSeconds: 180,
        outcome: "connected",
      }),
    ).toBe("Call logged: Bind confirmation · 3 min · connected");
  });
});
