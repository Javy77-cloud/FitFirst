import { describe, expect, it } from "vitest";
import {
  APPLICANT_CORE_FIELDS,
  CO_APPLICANT_FIELDS,
  ENTITY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
  RELATIONSHIP_TO_INSURED_OPTIONS,
  coApplicantRequired,
  isMarriedStatus,
} from "./applicant-core";
import { fieldsForLine, groupFields } from "./catalog";

describe("applicant / co-applicant household", () => {
  it("applicant has marital status + occupation", () => {
    const keys = APPLICANT_CORE_FIELDS.map((f) => f.key);
    expect(keys).toContain("applicant_gender");
    expect(keys).toContain("applicant_marital_status");
    expect(keys).toContain("applicant_occupation");
    expect(keys).toContain("entity_type");
    expect([...GENDER_OPTIONS]).toEqual(["Male", "Female"]);
    expect(APPLICANT_CORE_FIELDS.find((f) => f.key === "applicant_gender")?.input).toBe("select");
    expect([...ENTITY_TYPE_OPTIONS]).toEqual([
      "Individual",
      "Joint",
      "LLC",
      "Corporation",
      "Partnership",
      "Trust",
      "Estate",
      "Association",
      "Other",
    ]);
    expect(APPLICANT_CORE_FIELDS.find((f) => f.key === "entity_type")?.input).toBe("select");
    expect([...MARITAL_STATUS_OPTIONS]).toEqual([
      "Single",
      "Married",
      "Widow",
      "Divorced",
      "Separated",
    ]);
    expect(OCCUPATION_OPTIONS.at(-1)).toBe("Other");
    expect(OCCUPATION_OPTIONS).toEqual(
      expect.arrayContaining([
        "Employed",
        "Self-employed",
        "Homemaker",
        "Retired",
        "Student",
        "Unemployed",
        "Administrative",
        "Professional",
        "Sales",
        "Trades",
        "Management",
        "Military",
      ]),
    );
    expect(OCCUPATION_OPTIONS.length).toBeGreaterThan(20);
    // Not a lone-Other list — real portal categories first.
    expect(OCCUPATION_OPTIONS.filter((o) => o !== "Other").length).toBeGreaterThan(15);
  });

  it("co-applicant fields — no address / dual relationship", () => {
    const keys = CO_APPLICANT_FIELDS.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "co_applicant_name",
        "co_applicant_relationship_to_insured",
        "co_applicant_gender",
        "co_applicant_marital_status",
        "co_applicant_occupation",
        "co_applicant_employment",
        "co_applicant_education_level",
        "co_applicant_dob",
        "co_applicant_email",
        "co_applicant_phone",
      ]),
    );
    expect(keys).not.toContain("applicant_relationship_to_co_applicant");
    expect(keys).not.toContain("co_applicant_relationship");
    expect(keys).not.toContain("co_applicant_share_address");
    expect(keys).not.toContain("co_applicant_address");
    expect(RELATIONSHIP_TO_INSURED_OPTIONS).toContain("Spouse");
    expect(RELATIONSHIP_TO_INSURED_OPTIONS).toContain("Roommate");
  });

  it("Married requires co-applicant", () => {
    expect(isMarriedStatus("Married")).toBe(true);
    expect(
      coApplicantRequired({
        applicant_marital_status: { value: "Married", status: "confirmed" },
      }),
    ).toBe(true);
  });

  it("Deal Details Off does not require co-applicant even when Married", () => {
    expect(
      coApplicantRequired(
        { applicant_marital_status: { value: "Married", status: "confirmed" } },
        { hasCoApplicantFlag: "false" },
      ),
    ).toBe(false);
    expect(
      coApplicantRequired(
        { applicant_marital_status: { value: "Married", status: "confirmed" } },
        { hasCoApplicantFlag: "off" },
      ),
    ).toBe(false);
  });

  it("stays off Home / Auto / Flood Risk Profile (Deal Details owns identity)", () => {
    for (const line of ["home", "auto", "flood"] as const) {
      expect(groupFields(line).some((g) => g.group === "Co-applicant")).toBe(false);
      expect(fieldsForLine(line).some((f) => f.key === "applicant_marital_status")).toBe(false);
    }
    expect(groupFields("rec_rv").some((g) => g.group === "Co-applicant")).toBe(true);
  });
});
