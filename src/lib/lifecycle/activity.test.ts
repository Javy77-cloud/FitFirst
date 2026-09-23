import { describe, expect, it } from "vitest";
import {
  activityLogBody,
  assertCommsRecord,
  assertRelatedRecord,
  hasCommsRecord,
  hasRelatedRecord,
  shouldWriteCommsActivityLog,
} from "./activity";

describe("activity related-record FKs", () => {
  it("rejects an orphan task with no contact, policy, or business", () => {
    expect(hasRelatedRecord({})).toBe(false);
    expect(hasRelatedRecord({ dealId: "deal-only" })).toBe(false);
    expect(() => assertRelatedRecord({ dealId: "deal-only" })).toThrow(
      /Contact, Policy, Business, and\/or Lead/,
    );
  });


  it("allows call/email/sms to hang on Deal alone", () => {
    expect(hasCommsRecord({ dealId: "deal-only" })).toBe(true);
    expect(assertCommsRecord({ dealId: "deal-only" })).toEqual({
      contactId: null,
      accountId: null,
      policyId: null,
      dealId: "deal-only",
      leadId: null,
    });
    expect(() => assertCommsRecord({})).toThrow(/Deal, Contact, Policy, Business, or Lead/);
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

describe("comms activity log gate", () => {
  it("does not insert a log when call / SMS / email is only opened", () => {
    expect(shouldWriteCommsActivityLog({ kind: "call", eventType: "logged", status: "completed" })).toBe(
      false,
    );
    expect(shouldWriteCommsActivityLog({ kind: "call", eventType: "opened" })).toBe(false);
    expect(shouldWriteCommsActivityLog({ kind: "sms", eventType: "logged", status: "completed" })).toBe(
      false,
    );
    expect(shouldWriteCommsActivityLog({ kind: "sms", eventType: "draft" })).toBe(false);
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "logged", status: "completed" })).toBe(
      false,
    );
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "opened" })).toBe(false);
    expect(shouldWriteCommsActivityLog({ kind: "call", eventType: "logged", status: "cancelled" })).toBe(
      false,
    );
  });

  it("inserts a log when the call has an outcome or SMS / email is sent", () => {
    expect(
      shouldWriteCommsActivityLog({
        kind: "call",
        eventType: "logged",
        status: "completed",
        outcome: "connected",
      }),
    ).toBe(true);
    expect(
      shouldWriteCommsActivityLog({
        kind: "call",
        eventType: "completed",
        outcome: "voicemail",
      }),
    ).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "sms", eventType: "queued" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "sms", eventType: "sent" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "queued" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "sent" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "received" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "task", eventType: "created" })).toBe(true);
  });
});
