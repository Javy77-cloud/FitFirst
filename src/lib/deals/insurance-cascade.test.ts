import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  cascadeFromDeal,
  categoriesForType,
  DEAL_LIST_PIPELINE_KEY,
  DEAL_LIST_SUBTYPE_KEY,
  dealListCascadeSyncValues,
  formsForCategory,
  insuranceTypesForFamily,
  mergeDealListCascadeSync,
  pipelineFamilyFromDeal,
  pipelineListLabelFromType,
  policySubtypesForType,
  subtypeListLabelFromForm,
} from "./insurance-cascade";

describe("insurance cascade", () => {
  it("maps pipeline slug / LOB to family", () => {
    expect(pipelineFamilyFromDeal({ pipelineSlug: "p-c" })).toBe("pc");
    expect(pipelineFamilyFromDeal({ pipelineSlug: "life" })).toBe("life");
    expect(pipelineFamilyFromDeal({ lineOfBusiness: "HEALTH" })).toBe("health");
  });

  it("Insurance Type is exactly PC / Life / Health", () => {
    const labels = insuranceTypesForFamily("pc").map((t) => t.label);
    expect(labels).toEqual(["PC", "Life", "Health"]);
    expect(insuranceTypesForFamily("life").map((t) => t.id)).toEqual(["pc", "life", "health"]);
  });

  it("Type=PC middle categories are Home/Auto — not HO3 forms", () => {
    const labels = categoriesForType("pc").map((c) => c.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("Auto");
    expect(labels).toContain("Renter/Landlord");
    expect(labels).toContain("Commercial");
    expect(labels).not.toContain("HO3");
  });

  it("Home category forms are HO3/HO5/HO6", () => {
    const ids = formsForCategory("pc", "home").map((s) => s.id);
    expect(ids).toEqual(["HO3", "HO5", "HO6"]);
  });

  it("Renter/Landlord forms are HO4/DP1/DP3", () => {
    const ids = formsForCategory("pc", "renter_landlord").map((s) => s.id);
    expect(ids).toEqual(["HO4", "DP1", "DP3"]);
  });

  it("cascadeFromDeal defaults HO3 under Type=PC Category=Home", () => {
    expect(cascadeFromDeal({ family: "pc", quotingForm: "HO3" })).toMatchObject({
      typeId: "pc",
      categoryId: "home",
      subtypeId: "HO3",
    });
  });

  it("Life uses desk settings options as middle categories", () => {
    const cats = categoriesForType("life", [{ label: "Term Life" }, { label: "Whole Life" }]);
    expect(cats.map((c) => c.label)).toEqual(["Term Life", "Whole Life"]);
    const forms = formsForCategory("life", cats[0]!.id, [
      { label: "Term Life" },
      { label: "Whole Life" },
    ]);
    expect(forms.map((s) => s.label)).toEqual(["Term Life"]);
  });

  it("legacy flat policySubtypesForType still lists P&C forms", () => {
    const ids = policySubtypesForType("pc", "pc").map((s) => s.id);
    expect(ids).toContain("HO3");
    expect(ids).toContain("PA");
  });
});

describe("deal list cascade sync", () => {
  it("maps Type PC/Life/Health onto list Pipeline picklist_5n3i as P&C/Life/Health", () => {
    expect(pipelineListLabelFromType("PC")).toBe("P&C");
    expect(pipelineListLabelFromType("P&C")).toBe("P&C");
    expect(pipelineListLabelFromType("Life")).toBe("Life");
    expect(pipelineListLabelFromType("Health")).toBe("Health");
    expect(pipelineListLabelFromType("")).toBe("");
  });

  it("maps deepest form/subtype to human list labels", () => {
    expect(subtypeListLabelFromForm({ insuranceSubtype: "HO3" })).toBe("HO3");
    expect(subtypeListLabelFromForm({ quotingForm: "PA" })).toBe("Auto");
    expect(subtypeListLabelFromForm({ insuranceSubtype: "DP3" })).toBe("DP3");
    expect(subtypeListLabelFromForm({ policySubType: "Term Life" })).toBe("Term Life");
  });

  it("writes standing list keys only — picklist_5n3i + picklist", () => {
    expect(
      dealListCascadeSyncValues({ insuranceType: "PC", insuranceSubtype: "HO3" }),
    ).toEqual({ [DEAL_LIST_PIPELINE_KEY]: "P&C", [DEAL_LIST_SUBTYPE_KEY]: "HO3" });
    expect(
      dealListCascadeSyncValues({ insuranceType: "Life", insuranceSubtype: "Term Life" }),
    ).toEqual({ [DEAL_LIST_PIPELINE_KEY]: "Life", [DEAL_LIST_SUBTYPE_KEY]: "Term Life" });
    expect(mergeDealListCascadeSync({ insurance_type: "PC", insurance_subtype: "DP3", first_name: "Gloria" })).toMatchObject({
      first_name: "Gloria",
      insurance_type: "PC",
      insurance_subtype: "DP3",
      picklist_5n3i: "P&C",
      picklist: "DP3",
    });
  });

  it("Details save + convert persist list keys; cascade parent reads Pipeline", () => {
    expect(readFileSync("src/app/actions/custom-fields.ts", "utf8")).toMatch(/dealListCascadeSyncValues/);
    expect(readFileSync("src/app/actions/crm.ts", "utf8")).toMatch(/dealListCascadeSyncValues/);
    expect(readFileSync("src/lib/custom-fields/transfer.ts", "utf8")).toMatch(/mergeDealListCascadeSync/);
    const cascade = readFileSync("src/components/custom-fields/insurance-cascade-control.tsx", "utf8");
    expect(cascade).toMatch(/aria-label="Pipeline"/);
    expect(cascade).toMatch(/\n        Pipeline\n/);
    expect(cascade).not.toMatch(/aria-label="Insurance Type"/);
  });
});

