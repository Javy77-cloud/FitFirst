import { describe, expect, it } from "vitest";
import {
  cascadeFromDeal,
  insuranceTypesForFamily,
  pipelineFamilyFromDeal,
  policySubtypesForType,
} from "./insurance-cascade";

describe("insurance cascade", () => {
  it("maps pipeline slug / LOB to family", () => {
    expect(pipelineFamilyFromDeal({ pipelineSlug: "p-c" })).toBe("pc");
    expect(pipelineFamilyFromDeal({ pipelineSlug: "life" })).toBe("life");
    expect(pipelineFamilyFromDeal({ lineOfBusiness: "HEALTH" })).toBe("health");
  });

  it("lists P&C insurance types including Rec and Umbrella", () => {
    const ids = insuranceTypesForFamily("pc").map((t) => t.id);
    expect(ids).toEqual(["home", "auto", "rec", "flood", "umbrella", "commercial"]);
  });

  it("Home subtypes are HO/DP forms", () => {
    expect(policySubtypesForType("pc", "home").map((s) => s.id)).toEqual([
      "HO3",
      "HO5",
      "HO6",
      "DP1",
      "DP3",
    ]);
  });

  it("Commercial subtypes are GL/WC/BOP", () => {
    expect(policySubtypesForType("pc", "commercial").map((s) => s.label)).toEqual([
      "General liability",
      "Workers comp",
      "BOP",
    ]);
  });

  it("cascadeFromDeal defaults HO3 to Home", () => {
    expect(cascadeFromDeal({ family: "pc", quotingForm: "HO3" })).toMatchObject({
      typeId: "home",
      subtypeId: "HO3",
    });
  });

  it("Life uses desk settings options as subtypes", () => {
    const subs = policySubtypesForType("life", "life", [
      { label: "Term Life" },
      { label: "Whole Life" },
    ]);
    expect(subs.map((s) => s.label)).toEqual(["Term Life", "Whole Life"]);
  });
});
