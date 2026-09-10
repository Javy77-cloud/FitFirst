import { describe, expect, it } from "vitest";
import {
  CO_APPLICANT_FIELDS,
  CO_APPLICANT_RELATIONSHIP_OPTIONS,
  coApplicantHasValue,
} from "./applicant-core";
import { fieldsForLine, groupFields } from "./catalog";

describe("co-applicant on every master sheet", () => {
  it("ships relationship picklist + required contact fields", () => {
    expect(CO_APPLICANT_RELATIONSHIP_OPTIONS).toContain("Spouse");
    expect(CO_APPLICANT_RELATIONSHIP_OPTIONS).toContain("Cousin");
    const keys = CO_APPLICANT_FIELDS.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "applicant_relationship_to_co_applicant",
        "co_applicant_name",
        "co_applicant_relationship",
        "co_applicant_dob",
        "co_applicant_email",
        "co_applicant_phone",
        "co_applicant_share_address",
        "co_applicant_address",
      ]),
    );
  });

  it("is on Home and Auto catalogs", () => {
    for (const line of ["home", "auto", "flood"] as const) {
      const groups = groupFields(line);
      expect(groups.some((g) => g.group === "Co-applicant")).toBe(true);
      expect(fieldsForLine(line).some((f) => f.key === "co_applicant_name")).toBe(true);
    }
  });

  it("detects when a co-applicant was filled", () => {
    expect(coApplicantHasValue({})).toBe(false);
    expect(
      coApplicantHasValue({
        co_applicant_name: { value: "Jane Doe", status: "confirmed" },
      }),
    ).toBe(true);
  });
});
