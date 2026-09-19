import { describe, expect, it } from "vitest";
import {
  AUTOPILOT_KIND,
  AUTOPILOT_SILENCE_DAYS,
  autopilotBandFor,
  autopilotConfirmLabel,
  autopilotCoveredPolicyIds,
  autopilotKey,
  autopilotUrgency,
  autopilotWhy,
  encodeAutopilotMeta,
  markAutopilotEscalated,
  parseAutopilotMeta,
  shouldEscalateAutopilot,
  shouldQueueAutopilot,
} from "./autopilot";

const asOf = new Date("2026-09-19T13:00:00.000Z");

describe("renewal autopilot", () => {
  it("queues only at 90/60/30 and refuses a second nag when that band was already chased", () => {
    expect(autopilotBandFor(91)).toBeNull();
    expect(autopilotBandFor(73)).toBe("60to90");
    expect(autopilotBandFor(45)).toBe("30to60");
    expect(autopilotBandFor(12)).toBe("under30");
    expect(shouldQueueAutopilot({ chasedThisBand: false, band: "60to90" })).toBe(true);
    expect(shouldQueueAutopilot({ chasedThisBand: true, band: "under30" })).toBe(false);
    expect(shouldQueueAutopilot({ chasedThisBand: false, band: "90plus" })).toBe(false);
    expect(autopilotKey("p1", "30to60")).toBe(`${AUTOPILOT_KIND}:p1:30to60`);
  });

  it("escalates once after N silent days and never a second time", () => {
    const queuedAt = new Date("2026-09-14T13:00:00.000Z");
    expect(
      shouldEscalateAutopilot({
        queuedAt,
        asOf,
        alreadyEscalated: false,
        chasedThisBand: false,
      }),
    ).toBe(true);
    expect(
      shouldEscalateAutopilot({
        queuedAt: new Date("2026-09-18T13:00:00.000Z"),
        asOf,
        alreadyEscalated: false,
        chasedThisBand: false,
      }),
    ).toBe(false);
    expect(
      shouldEscalateAutopilot({
        queuedAt,
        asOf,
        alreadyEscalated: true,
        chasedThisBand: false,
      }),
    ).toBe(false);
    expect(
      shouldEscalateAutopilot({
        queuedAt,
        asOf,
        alreadyEscalated: false,
        chasedThisBand: true,
      }),
    ).toBe(false);
  });

  it("bumps urgency once and keeps one-click confirm copy", () => {
    expect(autopilotUrgency("60to90", false)).toBe("low");
    expect(autopilotUrgency("60to90", true)).toBe("medium");
    expect(autopilotUrgency("30to60", false)).toBe("medium");
    expect(autopilotUrgency("30to60", true)).toBe("high");
    expect(autopilotUrgency("under30", false)).toBe("high");
    expect(autopilotConfirmLabel("60to90", false)).toBe("Confirm 90-day note");
    expect(autopilotConfirmLabel("under30", true)).toMatch(/Escalated/);
    expect(autopilotWhy({ band: "30to60", daysUntil: 45, escalated: false })).toMatch(/queued/);
    expect(
      autopilotWhy({
        band: "30to60",
        daysUntil: 45,
        escalated: true,
        silenceDays: AUTOPILOT_SILENCE_DAYS,
      }),
    ).toMatch(/escalated once/);
  });

  it("round-trips meta and marks escalate without losing the panel key", () => {
    const meta = encodeAutopilotMeta({
      band: "30to60",
      queuedAt: "2026-09-14T13:00:00.000Z",
      escalated: false,
    });
    const body = `<!--ff-panel:renewal_autopilot:p1:30to60-->\n\nDesk queued\n${meta}`;
    expect(parseAutopilotMeta(body)?.band).toBe("30to60");
    const next = markAutopilotEscalated(body, asOf);
    expect(parseAutopilotMeta(next)?.escalated).toBe(true);
    expect(next).toMatch(/ff-panel:renewal_autopilot:p1:30to60/);
    expect(autopilotCoveredPolicyIds([{ policyId: "p1" }, { policyId: null }])).toEqual(new Set(["p1"]));
  });
});
