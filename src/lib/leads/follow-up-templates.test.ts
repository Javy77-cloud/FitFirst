import { describe, expect, it } from "vitest";
import {
  delayMs,
  dueAtFromStep,
  followUpMethodToActivityKind,
  normalizeFollowUpSteps,
  outboundStubLabel,
  pickTemplateForLead,
} from "./follow-up-templates";

const hot = { id: "hot", name: "Hot Lead", triggerStatus: "new", enabled: true };
const cold = { id: "cold", name: "Not Interested", triggerStatus: "lost", enabled: true };

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
  });

  it("computes Hot Lead and Not Interested delays", () => {
    expect(delayMs(5, "minutes")).toBe(5 * 60 * 1000);
    expect(delayMs(2, "hours")).toBe(2 * 60 * 60 * 1000);
    expect(delayMs(30, "days")).toBe(30 * 24 * 60 * 60 * 1000);
    const now = new Date("2026-09-06T12:00:00Z");
    expect(dueAtFromStep(now, 1, "days").toISOString()).toBe("2026-09-07T12:00:00.000Z");
  });

  it("auto-picks the status template unless the lead overrides", () => {
    expect(pickTemplateForLead([hot, cold], { status: "new" })?.id).toBe("hot");
    expect(pickTemplateForLead([hot, cold], { status: "lost" })?.id).toBe("cold");
    expect(pickTemplateForLead([hot, cold], { status: "new", followUpTemplateId: "cold" })?.id).toBe("cold");
    expect(pickTemplateForLead([hot, cold], { status: "contacted" })).toBeNull();
  });

  it("maps text to sms and labels the paid API wall", () => {
    expect(followUpMethodToActivityKind("text")).toBe("sms");
    expect(outboundStubLabel("email")).toMatch(/no paid email API/i);
    expect(outboundStubLabel("text")).toMatch(/no paid SMS API/i);
  });
});
