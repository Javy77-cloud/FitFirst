import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canStartFollowUpClock,
  delayMs,
  dueAtFromStep,
  FOLLOW_UP_METHODS,
  followUpEmailSnoozeBody,
  followUpMethodToActivityKind,
  FOLLOW_UP_OVERRIDE_OPTIONS,
  followUpTemplateChipName,
  followUpTemplateFullName,
  dedupeFollowUpSteps,
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

  it("binds Aggressive to new, Default to contacted, Steady to warm, Drip to cold", () => {
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "new" })?.id).toBe("hot");
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "contacted" })?.id).toBe("cdef");
    expect(pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "contacted" })?.id).toBe("def");
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "warm" })?.id).toBe("warm");
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "cold" })?.id).toBe("cold");
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], { status: "qualified" })).toBeNull();
    expect(
      pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "contacted", followUpTemplateId: "hot" })
        ?.id,
    ).toBe("hot");
    expect(
      pickTemplateForLead([hot, warm, cold, fallbackDefault], { status: "new", followUpTemplateId: "def" })?.id,
    ).toBe("hot");
    expect(canStartFollowUpClock("new")).toBe(true);
    expect(canStartFollowUpClock("contacted")).toBe(true);
    expect(canStartFollowUpClock("Contacted")).toBe(true);
    expect(canStartFollowUpClock("warm")).toBe(true);
    expect(canStartFollowUpClock("cold")).toBe(true);
    expect(canStartFollowUpClock("qualified")).toBe(false);
    expect(pickTemplateForLead(undefined, { status: "new" })).toBeNull();
    expect(pickTemplateForLead(null, { status: "new" })).toBeNull();
    expect(pickTemplateForLead([hot, warm, cold, contactedDefault], null)).toBeNull();
    expect(
      pickTemplateForLead([{ id: "hot", name: "Aggressive", triggerStatus: "new" } as never], {
        status: "new",
      })?.id,
    ).toBe("hot");
    expect(followUpTemplateChipName(undefined)).toBe("");
    expect(
      pickTemplateForLead([{ ...hot, enabled: false }, warm, cold, contactedDefault], { status: "new" }),
    ).toBeNull();
    expect(
      pickTemplateForLead([{ ...hot, enabled: false }, warm, cold, contactedDefault], {
        status: "new",
        followUpTemplateId: "hot",
      }),
    ).toBeNull();
    expect(
      pickTemplateForLead([{ ...hot, enabled: false }, warm, cold, contactedDefault], { status: "contacted" })
        ?.id,
    ).toBe("cdef");
    expect(followUpTemplateFullName({ name: null, triggerStatus: "new" })).toBe("Aggressive");
    expect(dedupeFollowUpSteps(undefined)).toEqual([]);
    expect(nextTemplateStep(undefined)).toBeNull();
  });

  it("starts the clock from status alone — new does not wait for a contact stamp or Aggressive pick", () => {
    expect(shouldHoldFollowUpUntilFirstContact({ status: "new", firstContactAt: null })).toBe(false);
    expect(
      shouldHoldFollowUpUntilFirstContact({
        status: "new",
        firstContactAt: new Date("2026-09-06T12:30:00Z"),
      }),
    ).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "contacted", firstContactAt: null })).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "warm", firstContactAt: null })).toBe(false);
    expect(shouldHoldFollowUpUntilFirstContact({ status: "qualified", firstContactAt: null })).toBe(true);
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
    expect(FOLLOW_UP_METHODS).toEqual(["call", "text", "email", "skip"]);
    expect(followUpMethodToActivityKind("text")).toBe("sms");
    expect(followUpMethodToActivityKind("skip")).toBeNull();
    expect(normalizeFollowUpSteps([{ method: "skip", delayAmount: 1, delayUnit: "hours" }])[0]?.method).toBe(
      "skip",
    );
    expect(outboundStubLabel("email")).toMatch(/no paid email API/i);
    expect(outboundStubLabel("text")).toMatch(/no paid SMS API/i);
    expect(outboundStubLabel("skip")).toMatch(/skip/i);
  });

  it("snoozes with 15 min / 1 hour / 1 day presets", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(SNOOZE_PRESETS.map((row) => row.label)).toEqual([
      "Snooze 15 min",
      "Snooze 1 hour",
      "Snooze 1 day",
    ]);
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

  it("renders each template step once by id", () => {
    expect(
      dedupeFollowUpSteps([
        { id: "a", sortOrder: 0 },
        { id: "a", sortOrder: 0 },
        { id: "b", sortOrder: 1 },
        { id: "b", sortOrder: 1 },
      ]).map((step) => step.id),
    ).toEqual(["a", "b"]);
  });

  it("advances to the next live template step and dedupes by step id", () => {
    const steps = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ];
    expect(nextTemplateStep(steps, -1)?.id).toBe("a");
    expect(nextTemplateStep(steps, 0)?.id).toBe("b");
    expect(nextTemplateStep(steps, 2)).toBeNull();
    expect(
      nextTemplateStep(
        [
          { id: "a", sortOrder: 0 },
          { id: "a", sortOrder: 0 },
          { id: "b", sortOrder: 1 },
        ],
        -1,
      )?.id,
    ).toBe("a");
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

describe("follow-up template editor + fire-path checks", () => {
  it("exposes a per-template on/off toggle and Skip in the method dropdown", () => {
    const panel = readFileSync("src/components/leads/follow-up-templates-panel.tsx", "utf8");
    const actions = readFileSync("src/app/actions/lead-follow-up.ts", "utf8");
    expect(panel).toMatch(/setFollowUpTemplateEnabled/);
    expect(panel).toMatch(/role="switch"/);
    expect(panel).toMatch(/data-ff-template-enabled/);
    expect(panel).toMatch(/FOLLOW_UP_METHOD_LABELS/);
    expect(panel).toMatch(/FOLLOW_UP_METHODS/);
    const methods = readFileSync("src/lib/leads/follow-up-templates.ts", "utf8");
    expect(methods).toMatch(/skip: "Skip"/);
    expect(actions).toMatch(/setFollowUpTemplateEnabled/);
    expect(actions).toMatch(/cancelFollowUpsForTemplate/);
  });

  it("skips disabled templates and Skip steps on the fire path without rewriting snooze", () => {
    const fire = readFileSync("src/lib/leads/apply-follow-up.ts", "utf8");
    const snooze = readFileSync("src/components/leads/follow-up-snooze-presets.tsx", "utf8");
    expect(fire).toMatch(/isSkipFollowUpMethod/);
    expect(fire).toMatch(/enabledById/);
    expect(fire).toMatch(/cancelFollowUpsForTemplate/);
    expect(fire).toMatch(/scheduleNextLiveStep/);
    expect(snooze).not.toMatch(/isSkipFollowUpMethod/);
  });
});
