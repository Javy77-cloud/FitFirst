import { describe, expect, it } from "vitest";
import {
  COPY_SHEET_LABEL,
  FILL_HANDOFF_HINT,
  FILL_HANDOFF_TITLE,
  MASTER_TO_FILL_STEPS,
  OPEN_FILL_LABEL,
  SEND_TO_FILL_LABEL,
  fillPathStepIndex,
} from "./fill-path";

describe("Risk Profile → Fill path labels", () => {
  it("names the five steps in producer English", () => {
    expect(MASTER_TO_FILL_STEPS.map((step) => step.label)).toEqual([
      "Drop source docs",
      "Choose quoting line",
      "Fill Risk Profile",
      "Glance yellow / CHECK",
      "Approve, then Send to Fill",
    ]);
    expect(MASTER_TO_FILL_STEPS[4]?.hint).toMatch(/zero rekey/i);
    expect(MASTER_TO_FILL_STEPS[2]?.hint).toMatch(/Yellow missing/);
  });

  it("labels the handoff as Risk Profile → Fill, not PDF paste", () => {
    expect(FILL_HANDOFF_TITLE).toBe("Send the approved Risk Profile to Fill");
    expect(FILL_HANDOFF_HINT).toMatch(/never the raw PDFs/);
    expect(COPY_SHEET_LABEL).toBe("Copy Risk Profile");
    expect(SEND_TO_FILL_LABEL).toBe("Send Risk Profile to Fill");
    expect(OPEN_FILL_LABEL).toBe("Open Fill window");
  });

  it("advances the stepper from drop → line → fill → glance → send", () => {
    expect(fillPathStepIndex({ sourceDocCount: 0, hasQuotingForm: false, fillFinished: false, unlocked: false })).toBe(1);
    expect(fillPathStepIndex({ sourceDocCount: 2, hasQuotingForm: false, fillFinished: false, unlocked: false })).toBe(2);
    expect(fillPathStepIndex({ sourceDocCount: 2, hasQuotingForm: true, fillFinished: false, unlocked: false })).toBe(3);
    expect(fillPathStepIndex({ sourceDocCount: 2, hasQuotingForm: true, fillFinished: true, unlocked: false })).toBe(4);
    expect(fillPathStepIndex({ sourceDocCount: 2, hasQuotingForm: true, fillFinished: true, unlocked: true })).toBe(5);
  });
});
