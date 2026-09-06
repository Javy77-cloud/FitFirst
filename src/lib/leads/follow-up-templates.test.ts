import { describe, expect, it } from "vitest";
import {
  canStartFollowUpClock,
  delayMs,
  dueAtFromStep,
  followUpEmailSnoozeBody,
  followUpMethodToActivityKind,
  FOLLOW_UP_OVERRIDE_OPTIONS,
  followUpTemplateChipName,
  followUpTemplateFullName,
  nextTemplateStep,
  normalizeFollowUpSteps,
  outboundStubLabel,
  parseFollowUpHideCookie,
  pickTemplateForLead,
  shouldEmailAgentReminder,
  shouldHoldFollowUpUntilFirstContact,
  shouldShowFollowUpModal,
  SMS_SNOOZE_KEYWORD,
  SNOOZE_PRESETS,
  snoozeDueAt,
} from "./follow-up-templates";

const hot = { id: "hot", name: "Aggressive", triggerStatus: "new", enabled: true };
const warm = { id: "warm", name: "Steady", triggerStatus: "warm", enabled: true };
const cold = { id: "cold", name: "Drip", triggerStatus: "cold", enabled: true };
const fallbackDefault = { id: "def", name: "Default", triggerStatus: "default", enabled: true };
const contactedDefault = { id: "cdef", name: "Default", triggerStatus: "contacted", enabled: true };

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

  it("maps Default to contacted and uses Aggressive / Steady / Drip only as overrides", () => {
    expect(pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "new" })?.id).toBe("def");
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "contacted" })?.id).toBe("cdef");
    expect(pickTemplateForLead([hot, warm, cold], { status: "new" })).toBeNull();
    expect(
      pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "contacted", followUpTemplateId: "hot" })
        ?.id,
    ).toBe("hot");
    expect(
      pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "contacted", followUpTemplateId: "def" })
        ?.id,
    ).toBe("def");
    expect(canStartFollowUpClock("contacted")).toBe(true);
    expect(canStartFollowUpClock("new")).toBe(false);
    expect(canStartFollowUpClock("warm")).toBe(false);
  });

  it("holds the clock until status is contacted — not arrival, save, or first-contact stamp", () => {
    expect(shouldHoldFollowUpUntilFirstContact({ status: "new", firstContactAt: null })).toBe(true);
    expect(
      shouldHoldFollowUpUntilFirstContact({
        status: "new",
        firstContactAt: new Date("2026-09-06T12:30:00Z"),
      }),
    ).toBe(true);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "contacted", firstContactAt: null })).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "warm", firstContactAt: null })).toBe(true);
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
    expect(followUpTemplateChipName(contactedDefault)).toBe("Default");
    expect(followUpTemplateFullName(cold)).toBe("Drip");
    expect(followUpTemplateFullName(fallbackDefault)).toBe("Default");
  });

  it("maps text to sms and labels the paid API wall", () => {
    expect(followUpMethodToActivityKind("text")).toBe("sms");
    expect(outboundStubLabel("email")).toMatch(/no paid email API/i);
    expect(outboundStubLabel("text")).toMatch(/no paid SMS API/i);
  });

  it("snoozes with 15 min / 1 hour / 1 day presets", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(SNOOZE_PRESETS.map((row) => row.label)).toEqual(["15 min", "1 hour", "1 day"]);
    expect(snoozeDueAt(now, 15, "minutes").toISOString()).toBe("2026-09-06T12:15:00.000Z");
    expect(snoozeDueAt(now, 1, "hours").toISOString()).toBe("2026-09-06T13:00:00.000Z");
    expect(snoozeDueAt(now, 1, "days").toISOString()).toBe("2026-09-07T12:00:00.000Z");
    expect(SMS_SNOOZE_KEYWORD).toBe("Snooze 1h");
    expect(followUpEmailSnoozeBody("https://desk.test", "q1")).toMatch(/amount=15&unit=minutes/);
  });

  it("never emails Javy for an agent reminder channel", () => {
    expect(shouldEmailAgentReminder("javy@fitfirst.local")).toBe(false);
    expect(shouldEmailAgentReminder("Javy@FitFirst.local")).toBe(false);
    expect(shouldEmailAgentReminder(null)).toBe(false);
    expect(shouldEmailAgentReminder("agent@agency.test")).toBe(true);
  });

  it("advances to the next live template step", () => {
    const steps = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ];
    expect(nextTemplateStep(steps, -1)?.id).toBe("a");
    expect(nextTemplateStep(steps, 0)?.id).toBe("b");
    expect(nextTemplateStep(steps, 2)).toBeNull();
  });

  it("hides the modal on the lead page and for 10 minutes after Open lead", () => {
    const hide = parseFollowUpHideCookie("alert-1:2000000000000:lead-1");
    expect(hide?.alertId).toBe("alert-1");
    expect(
      shouldShowFollowUpModal({ id: "alert-1", entityId: "lead-1" }, hide, "/deals", 1_000),
    ).toBe(false);
    expect(shouldShowFollowUpModal({ id: "alert-1", entityId: "lead-1" }, null, "/leads/lead-1")).toBe(false);
    expect(shouldShowFollowUpModal({ id: "alert-1", entityId: "lead-1" }, null, "/leads")).toBe(true);
    expect(shouldShowFollowUpModal({ id: "alert-1", readAt: new Date() }, null, "/leads")).toBe(false);
  });
});
