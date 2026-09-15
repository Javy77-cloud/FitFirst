import { describe, expect, it } from "vitest";
import {
  canUnlockQuoting,
  coerceQuotingFormId,
  companionLines,
  dealCreateFieldsFromPick,
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
    expect(quotingFormById("HO8")?.shopLine).toBe("home");
    expect(quotingFormById("MHO")?.label).toBe("MHO");
    expect(quotingFormById("MDP")?.label).toBe("MDP");
    expect(coerceQuotingFormId("MH")).toBe("MHO");
    expect(quotingFormById("MOTORCYCLE")?.label).toBe("Motorcycle");
    expect(quotingFormById("BOAT")?.label).toBe("Boat/Watercraft");
    expect(quotingFormById("CA")?.label).toBe("Commercial Auto");
    expect(sheetsToPrepare("HO5")).toEqual(["home"]);
    expect(sheetsToPrepare("DP1")).toEqual(["home"]);
    expect(sheetsToPrepare("MOTORCYCLE")).toEqual(["auto"]);
    expect(sheetsToPrepare("BOAT")).toEqual(["rec_rv"]);
    expect(sheetsToPrepare("CA")).toEqual(["auto"]);
  });

  it("coerces Insurance subtype labels and legacy Home/Auto words to form ids", () => {
    expect(coerceQuotingFormId("HO3")).toBe("HO3");
    expect(coerceQuotingFormId("Auto")).toBe("PA");
    expect(coerceQuotingFormId("Home")).toBe("HO3");
    expect(coerceQuotingFormId("Landlord")).toBe("DP3");
    expect(coerceQuotingFormId("Motorcycle")).toBe("MOTORCYCLE");
    expect(coerceQuotingFormId("Commercial Auto")).toBe("CA");
    expect(coerceQuotingFormId("Boat")).toBe("BOAT");
    expect(quotingFormLabel("PA")).toBe("Auto");
    expect(quotingFormLabel("MOTORCYCLE")).toBe("Motorcycle");
    expect(quotingFormLabel("CA")).toBe("Commercial Auto");
    expect(insuranceSubtypeOptions()).toEqual(
      expect.arrayContaining([
        "HO3",
        "HO5",
        "HO6",
        "HO8",
        "MHO",
        "MDP",
        "DP1",
        "DP3",
        "Auto",
        "Motorcycle",
        "Boat/Watercraft",
        "Commercial Auto",
        "Flood",
      ]),
    );
  });

  it("maps create-deal picks onto quotingForm, subtype label, LOB, and sheet line", () => {
    expect(dealCreateFieldsFromPick("DP1")).toEqual({
      quotingForm: "DP1",
      policySubType: "DP1",
      lineOfBusiness: "HO",
      quotingLine: "home",
    });
    expect(dealCreateFieldsFromPick("Auto")).toEqual({
      quotingForm: "PA",
      policySubType: "Auto",
      lineOfBusiness: "AUTO",
      quotingLine: "auto",
    });
    expect(dealCreateFieldsFromPick("HO")).toEqual({
      quotingForm: "HO3",
      policySubType: "HO3",
      lineOfBusiness: "HO",
      quotingLine: "home",
    });
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

  it("maps Life / Term Life picks onto life quoting line (never HO3)", () => {
    expect(coerceQuotingFormId("Life")).toBeNull();
    expect(coerceQuotingFormId("Health")).toBeNull();
    expect(dealCreateFieldsFromPick("Term Life")).toEqual({
      quotingForm: "Term Life",
      policySubType: "Term Life",
      lineOfBusiness: "LIFE",
      quotingLine: "life",
    });
    expect(dealCreateFieldsFromPick("Life")).toMatchObject({
      lineOfBusiness: "LIFE",
      quotingLine: "life",
    });
    expect(sheetsToPrepare("Term Life")).toEqual(["life"]);
  });

