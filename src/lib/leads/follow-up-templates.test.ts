import { describe, expect, it } from "vitest";
import {
  delayMs,
  dueAtFromStep,
  followUpMethodToActivityKind,
  FOLLOW_UP_OVERRIDE_OPTIONS,
  followUpTemplateChipName,
  followUpTemplateFullName,
  normalizeFollowUpSteps,
  outboundStubLabel,
  pickTemplateForLead,
  shouldEmailAgentReminder,
  shouldHoldFollowUpUntilFirstContact,
  snoozeDueAt,
} from "./follow-up-templates";

const hot = { id: "hot", name: "Aggressive", triggerStatus: "new", enabled: true };
const warm = { id: "warm", name: "Steady", triggerStatus: "warm", enabled: true };
const cold = { id: "cold", name: "Drip", triggerStatus: "cold", enabled: true };
const fallbackDefault = { id: "def", name: "Default", triggerStatus: "default", enabled: true };

describe("follow-up templates", () => {
  it("caps a template at four steps and drops incomplete rows", () => {
    const steps = normalizeFollowUpSteps([
      { method: "call", delayAmount: 5, delayUnit: "minutes", message: "now" },
      { method: "text", delayAmount: 30, delayUnit: "minutes" },
      { method: "email", delayAmount: 2, delayUnit: "hours" },
      { method: "call", delayAmount: 1, delayUnit: "days" },
      { method: "email", delayAmount: 2, delayUnit: "days" },
      { method: "fax", delayAmount: 1, delayUnit: "hours" },
    ]);
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.method)).toEqual(["call", "text", "email", "call"]);
    expect(steps.every((step) => step.remindVia === "task")).toBe(true);
    expect(
      normalizeFollowUpSteps([
        { method: "call", delayAmount: 5, delayUnit: "minutes", remindVia: "popup" },
        { method: "email", delayAmount: 1, delayUnit: "days", remindVia: "email" },
      ]).map((step) => step.remindVia),
    ).toEqual(["popup", "email"]);
  });

  it("computes Hot Lead and Not Interested delays", () => {
    expect(delayMs(5, "minutes")).toBe(5 * 60 * 1000);
    expect(delayMs(2, "hours")).toBe(2 * 60 * 60 * 1000);
    expect(delayMs(30, "days")).toBe(30 * 24 * 60 * 60 * 1000);
    const now = new Date("2026-09-06T12:00:00Z");
    expect(dueAtFromStep(now, 1, "days").toISOString()).toBe("2026-09-07T12:00:00.000Z");
  });

  it("auto-picks Default for new leads, then status templates, unless the lead overrides", () => {
    expect(pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "new" })?.id).toBe("def");
    expect(pickTemplateForLead([hot, warm, cold], { status: "new" })?.id).toBe("hot");
    expect(pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "warm" })?.id).toBe("warm");
    expect(pickTemplateForLead([hot, warm, cold], { status: "cold" })?.id).toBe("cold");
    expect(
      pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "new", followUpTemplateId: "cold" })
        ?.id,
    ).toBe("cold");
    expect(pickTemplateForLead([hot, warm, cold], { status: "contacted" })).toBeNull();
  });

  it("holds the new / Aggressive template until first contact is logged", () => {
    expect(shouldHoldFollowUpUntilFirstContact({ status: "new", firstContactAt: null })).toBe(true);
    expect(
      shouldHoldFollowUpUntilFirstContact({
        status: "new",
        firstContactAt: new Date("2026-09-06T12:30:00Z"),
      }),
    ).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "warm", firstContactAt: null })).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "cold", firstContactAt: null })).toBe(false);
  });

  it("orders Follow-up override options Aggressive, Steady, Drip, then Default", () => {
    expect(FOLLOW_UP_OVERRIDE_OPTIONS.map((row) => row.label)).toEqual([
      "Aggressive",
      "Steady",
      "Drip",
      "Default",
    ]);
  });

  it("labels templates Aggressive / Steady / Drip and keeps Default", () => {
    expect(followUpTemplateChipName(hot)).toBe("Aggressive");
    expect(followUpTemplateChipName(warm)).toBe("Steady");
    expect(followUpTemplateChipName(cold)).toBe("Drip");
    expect(followUpTemplateChipName(fallbackDefault)).toBe("Default");
    expect(followUpTemplateFullName(cold)).toBe("Drip");
    expect(followUpTemplateFullName(fallbackDefault)).toBe("Default");
  });

  it("maps text to sms and labels the paid API wall", () => {
    expect(followUpMethodToActivityKind("text")).toBe("sms");
    expect(outboundStubLabel("email")).toMatch(/no paid email API/i);
    expect(outboundStubLabel("text")).toMatch(/no paid SMS API/i);
  });

  it("snoozes a follow-up by hours or days without losing the delay", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(snoozeDueAt(now, 2, "hours").toISOString()).toBe("2026-09-06T14:00:00.000Z");
    expect(snoozeDueAt(now, 1, "days").toISOString()).toBe("2026-09-07T12:00:00.000Z");
    expect(snoozeDueAt(now, 0, "hours").toISOString()).toBe("2026-09-06T13:00:00.000Z");
  });

  it("never emails Javy for an agent reminder channel", () => {
    expect(shouldEmailAgentReminder("javy@fitfirst.local")).toBe(false);
    expect(shouldEmailAgentReminder("Javy@FitFirst.local")).toBe(false);
    expect(shouldEmailAgentReminder(null)).toBe(false);
    expect(shouldEmailAgentReminder("agent@agency.test")).toBe(true);
  });
});
