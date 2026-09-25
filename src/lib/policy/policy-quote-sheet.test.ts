import { describe, expect, it } from "vitest";
import { selectPolicyQuoteSheet } from "./policy-quote-sheet";

const gloria = {
  line: "home~homeowners~88uvyj",
  values: {
    year_built: { value: "2000" },
    construction: { value: "masonry" },
    occupancy: { value: "Owner" },
    policy_number: { value: "803-16021" },
  },
};

describe("selectPolicyQuoteSheet", () => {
  it("reads the HO3 copy sheet instead of a blank first home line", () => {
    const blankHome = { line: "home", values: { occupancy: { value: "Owner" } } };
    const picked = selectPolicyQuoteSheet([blankHome, gloria], {
      sourceProduct: "homeowners~88uvyj",
      policyNumber: "803-16021",
      lineOfBusiness: "HO3",
    });
    expect(picked?.line).toBe("home~homeowners~88uvyj");
    expect(picked?.values?.year_built?.value).toBe("2000");
    expect(picked?.values?.construction?.value).toBe("masonry");
  });

  it("matches the policy number when the product instance is not on the policy", () => {
    const picked = selectPolicyQuoteSheet(
      [
        { line: "home", values: { year_built: { value: "1988" } } },
        gloria,
      ],
      { policyNumber: "803 16021", lineOfBusiness: "HO" },
    );
    expect(picked?.line).toBe("home~homeowners~88uvyj");
  });

  it("keeps a single HO3 sheet on the plain home line", () => {
    const home = { line: "home", values: { year_built: { value: "2004" }, construction: { value: "Frame" } } };
    expect(
      selectPolicyQuoteSheet([home], {
        sourceProduct: "homeowners",
        lineOfBusiness: "HO3",
      })?.line,
    ).toBe("home");
  });

  it("uses the landlord sheet for DP when homeowners already owns line home", () => {
    const picked = selectPolicyQuoteSheet(
      [
        { line: "home", values: { year_built: { value: "1990" } } },
        { line: "home~landlord", values: { year_built: { value: "1975" }, construction: { value: "Frame" } } },
      ],
      { sourceProduct: "landlord", lineOfBusiness: "DP3" },
    );
    expect(picked?.line).toBe("home~landlord");
    expect(picked?.values?.year_built?.value).toBe("1975");
  });
});
