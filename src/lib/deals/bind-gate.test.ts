import { describe, expect, it } from "vitest";
import { BIND_GATE_COPY, bindGateReady } from "./bind-gate";

describe("bind gate", () => {
  it("blocks finalize until all three re-checks are ticked", () => {
    expect(bindGateReady({ premium: true, coverages: true, deductibles: false })).toBe(false);
    expect(bindGateReady({ premium: true, coverages: true, deductibles: true })).toBe(true);
    expect(BIND_GATE_COPY.blocked).toMatch(/Cannot finalize/);
    expect(BIND_GATE_COPY.subtitle).toMatch(/provisional|additional/i);
  });

  it("includes verify prompt for bind-recheck popup", () => {
    expect(BIND_GATE_COPY.verifyPrompt).toMatch(/confirm the premium, coverages, and deductibles/i);
    expect(BIND_GATE_COPY.acceptFloorHeading).toMatch(/Meet carrier minimum/i);
    expect(BIND_GATE_COPY.reQuote).toBe("Re-quote");
  });
});
