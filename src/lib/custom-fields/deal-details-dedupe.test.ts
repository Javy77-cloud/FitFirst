import { describe, expect, it } from "vitest";
import { isDuplicateDealDetailsField } from "./deal-details-dedupe";

describe("Deal Details personal field dedupe", () => {
  it("hides contact-module aliases when the applicant key is already on the layout", () => {
    const keys = new Set(["applicant_marital_status", "phone", "applicant_industry"]);
    expect(isDuplicateDealDetailsField("marital_status", keys, new Set())).toBe(true);
    expect(isDuplicateDealDetailsField("applicant_phone", keys, new Set())).toBe(true);
    expect(isDuplicateDealDetailsField("industry", keys, new Set())).toBe(true);
    expect(isDuplicateDealDetailsField("selling_agency", new Set(["picklist_yp0c"]), new Set())).toBe(
      true,
    );
    expect(isDuplicateDealDetailsField("applicant_marital_status", keys, new Set())).toBe(false);
  });

  it("keeps an alias when the canonical key is not present", () => {
    expect(isDuplicateDealDetailsField("marital_status", new Set(["first_name"]), new Set())).toBe(
      false,
    );
  });

  it("drops a key that already rendered", () => {
    expect(
      isDuplicateDealDetailsField("applicant_marital_status", new Set(["applicant_marital_status"]), new Set(["applicant_marital_status"])),
    ).toBe(true);
  });
});
