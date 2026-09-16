import { describe, expect, it } from "vitest";
import { quotesBindableSignal } from "./quotes-bindable-signal";

describe("quotes bindable signal", () => {
  it("is green with bindable count and best premium", () => {
    const signal = quotesBindableSignal([
      { bindable: true, premium: "2400", stub: false },
      { bindable: true, premium: "1800", nextStep: "can_bind", stub: false },
      { bindable: false, premium: "900", stub: false },
    ]);
    expect(signal.tone).toBe("green");
    expect(signal.bindableCount).toBe(2);
    expect(signal.bestPremium).toBe(1800);
    expect(signal.label).toMatch(/2 bindable/);
    expect(signal.label).toMatch(/1,800|1800/);
  });

  it("is amber when quotes exist but only conditional, red when none bindable", () => {
    expect(
      quotesBindableSignal([
        { bindable: false, riskOutcome: "conditional", premium: "2100" },
      ]).tone,
    ).toBe("amber");
    expect(
      quotesBindableSignal([{ bindable: false, riskOutcome: "declined", premium: "2100" }]).tone,
    ).toBe("red");
    expect(quotesBindableSignal([]).tone).toBe("empty");
    expect(quotesBindableSignal([{ bindable: true, stub: true, premium: "100" }]).tone).toBe("empty");
  });
});
