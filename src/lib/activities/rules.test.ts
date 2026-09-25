import { describe, expect, it } from "vitest";
import {
  assertContactOrPolicy,
  canCloseCall,
  canDeleteActivity,
  cancelInsteadOfDelete,
  completionFields,
  isDueSoon,
  isDueToday,
  isOverdue,
  normalizeStatus,
  reminderHasFired,
  rescheduleEventBody,
  rescheduleFields,
  shouldNotifyCall,
  whenForActivity,
} from "./rules";

describe("assignment", () => {
  it("requires a contact and/or a policy", () => {
    expect(() => assertContactOrPolicy({})).toThrow(/contact and\/or a policy/);
    expect(() => assertContactOrPolicy({ dealId: "d1", businessId: "b1" })).toThrow(
      /contact and\/or a policy/,
    );
    expect(() => assertContactOrPolicy({ contactId: "c1" })).not.toThrow();
    expect(() => assertContactOrPolicy({ policyId: "p1" })).not.toThrow();
    expect(() => assertContactOrPolicy({ contactId: "c1", policyId: "p1" })).not.toThrow();
  });
});

describe("statuses", () => {
  it("maps calendar aliases without inventing a second system", () => {
    expect(normalizeStatus("open")).toBe("incomplete");
    expect(normalizeStatus("cancelled")).toBe("canceled");
    expect(normalizeStatus("in_progress")).toBe("in_progress");
  });

  it("never deletes — cancel instead", () => {
    expect(canDeleteActivity()).toBe(false);
    expect(cancelInsteadOfDelete()).toEqual({ status: "canceled" });
  });
});

describe("reschedule history", () => {
  it("keeps old due, new due, and who moved it", () => {
    const oldDue = new Date("2026-09-03T15:00:00.000Z");
    const newDue = new Date("2026-09-04T15:00:00.000Z");
    const record = rescheduleFields({
      oldDueAt: oldDue,
      newDueAt: newDue,
      actorId: "44444444-4444-4444-8444-444444444401",
      actorName: "Javy Rivera",
    });
    expect(record.previousDueAt).toEqual(oldDue);
    expect(record.dueAt).toEqual(newDue);
    expect(record.status).toBe("rescheduled");
    expect(record.actorName).toBe("Javy Rivera");
    expect(rescheduleEventBody(record)).toContain("2026-09-03T15:00:00.000Z");
    expect(rescheduleEventBody(record)).toContain("2026-09-04T15:00:00.000Z");
    expect(rescheduleEventBody(record)).toContain("Javy Rivera");
  });
});

describe("task completion", () => {
  it("writes completed_at, completed_by, and duration from start or create", () => {
    const createdAt = new Date("2026-09-03T10:00:00.000Z");
    const startAt = new Date("2026-09-03T11:00:00.000Z");
    const completedAt = new Date("2026-09-03T11:12:00.000Z");
    const fromStart = completionFields({
      createdAt,
      startAt,
      completedAt,
      completedBy: "user-1",
      notes: "Left a voicemail.",
    });
    expect(fromStart.completedAt).toEqual(completedAt);
    expect(fromStart.completedBy).toBe("user-1");
    expect(fromStart.durationSeconds).toBe(12 * 60);
    expect(fromStart.pipelineStage).toBe("done");
    expect(fromStart.notes).toBe("Left a voicemail.");

    const fromCreate = completionFields({
      createdAt,
      completedAt: new Date("2026-09-03T10:05:00.000Z"),
      completedBy: "user-1",
    });
    expect(fromCreate.durationSeconds).toBe(5 * 60);
  });
});

describe("call close", () => {
  it("refuses to close without outcome and notes", () => {
    expect(canCloseCall({ outcome: "connected", notes: "" }).ok).toBe(false);
    expect(canCloseCall({ outcome: "", notes: "Tried twice." }).ok).toBe(false);
    expect(canCloseCall({ outcome: "connected", notes: "Reached Ana." }).ok).toBe(true);
  });
});

describe("due notifications", () => {
  const now = new Date("2026-09-03T16:00:00.000Z");

  it("flags overdue, due today, and tomorrow-with-reminder calls", () => {
    const yesterday = new Date("2026-09-02T15:00:00.000Z");
    const laterToday = new Date("2026-09-03T20:00:00.000Z");
    const tomorrow = new Date("2026-09-04T15:00:00.000Z");

    expect(isOverdue(yesterday, now, "incomplete")).toBe(true);
    expect(isDueToday(laterToday, now, "incomplete")).toBe(true);
    expect(isDueSoon(tomorrow, now, "incomplete", 36)).toBe(true);
    expect(isDueSoon(tomorrow, now, "incomplete")).toBe(false);
    expect(isDueSoon(new Date(now.getTime() + 30 * 60 * 1000), now, "incomplete")).toBe(true);
    expect(isDueSoon(laterToday, now, "incomplete")).toBe(false);
    expect(
      reminderHasFired({
        when: tomorrow,
        reminderMinutes: 24 * 60,
        now,
        status: "incomplete",
      }),
    ).toBe(true);
    expect(
      shouldNotifyCall({
        kind: "call",
        when: tomorrow,
        reminderMinutes: 24 * 60,
        now,
        status: "incomplete",
      }),
    ).toBe(true);
    expect(
      shouldNotifyCall({
        kind: "task",
        when: tomorrow,
        now,
        status: "incomplete",
      }),
    ).toBe(false);
    expect(
      shouldNotifyCall({
        kind: "call",
        when: laterToday,
        now,
        status: "incomplete",
      }),
    ).toBe(false);
    expect(
      shouldNotifyCall({
        kind: "call",
        when: new Date(now.getTime() + 30 * 60 * 1000),
        now,
        status: "incomplete",
      }),
    ).toBe(true);
    expect(
      shouldNotifyCall({
        kind: "call",
        when: tomorrow,
        now,
        status: "completed",
        outcome: "connected",
      }),
    ).toBe(false);
  });

  it("buckets today by America/New_York, not UTC midnight", () => {
    // 9:00 PM ET Wed Sep 23 = 01:00Z Thu — UTC day already rolled; desk day has not.
    const eveningEt = new Date("2026-09-24T01:00:00.000Z");
    const tomorrowMorningEt = new Date("2026-09-24T14:00:00.000Z"); // 10:00 AM ET Thu
    const laterTonightEt = new Date("2026-09-24T02:30:00.000Z"); // 10:30 PM ET Wed
    expect(isDueToday(tomorrowMorningEt, eveningEt, "incomplete")).toBe(false);
    expect(isDueToday(laterTonightEt, eveningEt, "incomplete")).toBe(true);

    // 1:00 AM ET Thu — early morning stays on Thursday Eastern.
    const earlyEt = new Date("2026-09-24T05:00:00.000Z");
    const wedNightEt = new Date("2026-09-24T02:00:00.000Z"); // 10:00 PM ET Wed
    const thuMorningEt = new Date("2026-09-24T13:00:00.000Z"); // 9:00 AM ET Thu
    expect(isDueToday(wedNightEt, earlyEt, "incomplete")).toBe(false);
    expect(isDueToday(thuMorningEt, earlyEt, "incomplete")).toBe(true);
  });

  it("uses scheduled_at for calls", () => {
    expect(
      whenForActivity({
        kind: "call",
        scheduledAt: new Date("2026-09-04T15:00:00.000Z"),
        dueAt: new Date("2026-09-01T00:00:00.000Z"),
      })?.toISOString(),
    ).toBe("2026-09-04T15:00:00.000Z");
  });
});
