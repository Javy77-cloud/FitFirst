import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  cascadeFromDeal,
  cascadeFromPackageLine,
  categoryForPackageLine,
  categoriesForType,
  categoryIdFromLabel,
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

  it("Home category forms are HO3/HO5/HO6/HO8/MHO", () => {
    const ids = formsForCategory("pc", "home").map((s) => s.id);
    expect(ids).toEqual(["HO3", "HO5", "HO6", "HO8", "MHO"]);
  });

  it("Renter/Landlord includes MDP as a distinct mobile dwelling/renters form", () => {
    const ids = formsForCategory("pc", "renter_landlord").map((s) => s.id);
    expect(ids).toEqual(["HO4", "DP1", "DP3", "MDP"]);
  });

  it("Auto keeps Motorcycle distinct from PA", () => {
    const ids = formsForCategory("pc", "auto").map((s) => s.id);
    expect(ids).toEqual(["PA", "MOTORCYCLE"]);
  });

  it("Recreational includes RV and Boat/Watercraft", () => {
    const forms = formsForCategory("pc", "rec");
    expect(forms.map((s) => s.id)).toEqual(["RV", "BOAT"]);
    expect(forms.map((s) => s.label)).toEqual(["Recreational vehicle", "Boat/Watercraft"]);
  });

  it("Commercial includes CA as a distinct form", () => {
    const ids = formsForCategory("pc", "commercial").map((s) => s.id);
    expect(ids).toEqual(["GL", "WC", "BOP", "CA"]);
  });

  it("resolves HO8, MH, Motorcycle, Boat, and CA onto the right category", () => {
    expect(cascadeFromDeal({ family: "pc", quotingForm: "HO8" })).toMatchObject({
      typeId: "pc",
      categoryId: "home",
      subtypeId: "HO8",
    });
    expect(cascadeFromDeal({ family: "pc", quotingForm: "MHO" })).toMatchObject({
      categoryId: "home",
      subtypeId: "MHO",
    });
    expect(cascadeFromDeal({ family: "pc", quotingForm: "MDP" })).toMatchObject({
      categoryId: "renter_landlord",
      subtypeId: "MDP",
    });
    expect(cascadeFromDeal({ family: "pc", quotingForm: "MOTORCYCLE" })).toMatchObject({
      categoryId: "auto",
      subtypeId: "MOTORCYCLE",
    });
    expect(cascadeFromDeal({ family: "pc", quotingForm: "BOAT" })).toMatchObject({
      categoryId: "rec",
      subtypeId: "BOAT",
    });
    expect(cascadeFromDeal({ family: "pc", quotingForm: "CA" })).toMatchObject({
      categoryId: "commercial",
      subtypeId: "CA",
    });
  });

  it("package deals keep Type=PC and Form per Home/Auto/Flood line", () => {
    expect(categoryForPackageLine("home")).toBe("home");
    expect(categoryForPackageLine("auto")).toBe("auto");
    expect(categoryForPackageLine("flood")).toBe("flood");
    expect(cascadeFromPackageLine({ line: "auto", quotingForm: "PA" })).toMatchObject({
      typeId: "pc",
      categoryId: "auto",
      subtypeId: "PA",
    });
    expect(cascadeFromPackageLine({ line: "flood" })).toMatchObject({
      typeId: "pc",
      categoryId: "flood",
      subtypeId: "FLOOD",
    });
    expect(cascadeFromPackageLine({ line: "home", quotingForm: "HO6" })).toMatchObject({
      typeId: "pc",
      categoryId: "home",
      subtypeId: "HO6",
    });
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
    expect(ids).toContain("MOTORCYCLE");
    expect(ids).toContain("BOAT");
    expect(ids).toContain("CA");
  });

  it("maps motorcycle / boat / CA labels onto cascade categories", () => {
    expect(categoryIdFromLabel("Motorcycle")).toBe("auto");
    expect(categoryIdFromLabel("Boat/Watercraft")).toBe("rec");
    expect(categoryIdFromLabel("Commercial Auto")).toBe("commercial");
    expect(categoryIdFromLabel("HO8")).toBe("home");
    expect(categoryIdFromLabel("MHO")).toBe("home");
    expect(categoryIdFromLabel("mobile home")).toBe("home");
    expect(categoryIdFromLabel("MDP")).toBe("renter_landlord");
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

  it("cascade Type picker hides Life/Health when write toggles are off", () => {
    const control = readFileSync("src/components/custom-fields/insurance-cascade-control.tsx", "utf8");
    expect(control).toMatch(/visibleInsuranceTypes/);
    expect(control).toMatch(/lineSettings/);
    const details = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(details).toMatch(/lineSettings=\{deskLineSettings\}/);
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

