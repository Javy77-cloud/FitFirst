import { describe, expect, it } from "vitest";
import { DEAL_WORK_TAB_KEY } from "@/lib/deals/tabs";
import { copyDealDetailValues, titleForCopiedDeal } from "./create-from-source";

describe("copyDealDetailValues", () => {
  it("copies filled fields and drops work tab + blanks", () => {
    expect(
      copyDealDetailValues({
        first_name: "Elena",
        last_name: "Ruiz",
        notes: "  ",
        [DEAL_WORK_TAB_KEY]: "markets",
        named_insured: "Elena Ruiz",
      }),
    ).toEqual({
      first_name: "Elena",
      last_name: "Ruiz",
      named_insured: "Elena Ruiz",
    });
  });

  it("returns empty for null/empty source", () => {
    expect(copyDealDetailValues(null)).toEqual({});
    expect(copyDealDetailValues({})).toEqual({});
  });

  it("syncs list Pipeline + subtype from cascade fields", () => {
    expect(
      copyDealDetailValues({
        insurance_type: "PC",
        insurance_subtype: "HO5",
        first_name: "Gloria",
      }),
    ).toMatchObject({
      first_name: "Gloria",
      insurance_type: "PC",
      insurance_subtype: "HO5",
      picklist_5n3i: "P&C",
      picklist: "HO5",
    });
  });
});

describe("titleForCopiedDeal", () => {
  it("keeps First Last / LOB and never appends (copy)", () => {
    expect(
      titleForCopiedDeal({
        title: "Elena Ruiz / Homeowners (copy)",
        lineOfBusiness: "HO",
        firstName: "Elena",
        lastName: "Ruiz",
      }),
    ).toBe("Elena Ruiz / Homeowners");
  });

  it("rebuilds from contact when title is thin", () => {
    expect(
      titleForCopiedDeal({
        title: "Shop",
        lineOfBusiness: "AUTO",
        contact: { firstName: "Javy", lastName: "Garcia" },
      }),
    ).toBe("Javy Garcia / Auto");
  });
});
