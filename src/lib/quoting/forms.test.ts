import { describe, expect, it } from "vitest";
import {
  canUnlockQuoting,
  coerceQuotingFormId,
  companionLines,
  insuranceSubtypeOptions,
  isAppetiteCaptureResult,
  isMatchPriorResult,
  quotingFormById,
  quotingFormLabel,
  quotingUnlockedForDeal,
  sheetsToPrepare,
} from "./forms";

describe("quoting forms", () => {
  it("maps HO3 to the home master sheet and prepares Auto + commercial companions", () => {
    expect(quotingFormById("HO3")?.shopLine).toBe("home");
    expect(companionLines("HO3")).toEqual(["auto", "general_liability", "workers_comp"]);
    expect(sheetsToPrepare("HO3")).toEqual(["home", "auto", "general_liability", "workers_comp"]);
  });

  it("maps Auto and commercial forms to their own sheets without HO3 companions", () => {
    expect(sheetsToPrepare("PA")).toEqual(["auto"]);
    expect(sheetsToPrepare("GL")).toEqual(["general_liability"]);
    expect(companionLines("PA")).toEqual([]);
  });

  it("maps HO5 and DP1 onto the home sheet and lists new subtype ids", () => {
    expect(quotingFormById("HO5")?.shopLine).toBe("home");
    expect(quotingFormById("HO5")?.label).toBe("HO5");
    expect(quotingFormById("DP1")?.shopLine).toBe("home");
    expect(quotingFormById("DP1")?.label).toBe("DP1");
    expect(quotingFormById("PA")?.label).toBe("Auto");
    expect(sheetsToPrepare("HO5")).toEqual(["home"]);
    expect(sheetsToPrepare("DP1")).toEqual(["home"]);
  });

  it("coerces Insurance subtype labels and legacy Home/Auto words to form ids", () => {
    expect(coerceQuotingFormId("HO3")).toBe("HO3");
    expect(coerceQuotingFormId("Auto")).toBe("PA");
    expect(coerceQuotingFormId("Home")).toBe("HO3");
    expect(coerceQuotingFormId("Landlord")).toBe("DP3");
    expect(quotingFormLabel("PA")).toBe("Auto");
    expect(insuranceSubtypeOptions()).toEqual(
      expect.arrayContaining(["HO3", "HO5", "HO6", "DP1", "DP3", "Auto", "Flood"]),
    );
  });

  it("requires both visual review and are-you-sure before unlocking quoting", () => {
    expect(canUnlockQuoting({ reviewed: true, sure: true })).toBe(true);
    expect(canUnlockQuoting({ reviewed: true, sure: false })).toBe(false);
    expect(canUnlockQuoting({ reviewed: false, sure: true })).toBe(false);
  });

  it("treats maybe as an appetite capture, not a match prior", () => {
    expect(isAppetiteCaptureResult("maybe")).toBe(true);
    expect(isAppetiteCaptureResult("quoted")).toBe(true);
    expect(isMatchPriorResult("maybe")).toBe(false);
    expect(isMatchPriorResult("declined")).toBe(true);
  });

  it("keeps shopping deals locked until approve; bound deals stay past the gate", () => {
    expect(quotingUnlockedForDeal({ quotingUnlocked: false, pipelineStage: "shopping" })).toBe(
      false,
    );
    expect(quotingUnlockedForDeal({ quotingUnlocked: false, pipelineStage: "quote_sent" })).toBe(
      false,
    );
    expect(quotingUnlockedForDeal({ quotingUnlocked: true, pipelineStage: "shopping" })).toBe(true);
    expect(quotingUnlockedForDeal({ quotingUnlocked: false, pipelineStage: "bound" })).toBe(true);
  });
});
