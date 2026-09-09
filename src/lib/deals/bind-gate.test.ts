import { describe, expect, it } from "vitest";
import { BIND_GATE_COPY, bindGateReady } from "./bind-gate";

describe("bind gate", () => {
  it("blocks finalize until all three re-checks are ticked", () => {
    expect(bindGateReady({ premium: true, coverages: true, deductibles: false })).toBe(false);
    expect(bindGateReady({ premium: true, coverages: true, deductibles: true })).toBe(true);
    expect(BIND_GATE_COPY.blocked).toMatch(/Cannot finalize/);
    expect(BIND_GATE_COPY.subtitle).toMatch(/provisional|additional/i);
  });
});
