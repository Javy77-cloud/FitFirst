import { describe, expect, it } from "vitest";
import { migrateLeadLayout, needsLeadLayoutMigration } from "./migrate-lead-layout";
import { defaultLayoutForModule } from "./modules";
import { allLayoutFieldKeys } from "./types";

describe("migrateLeadLayout", () => {
  it("strips Status + Insurance desired and keeps Insurance subtype + Applicant stack", () => {
    const dirty = {
      columns: [
        {
          id: "left",
          sections: [
            { id: "contact", label: "Contact", fieldKeys: ["first_name", "last_name", "email", "phone"] },
            {
              id: "address",
              label: "Address",
              fieldKeys: ["mailing_address", "city", "state", "zip", "contact_mailing_address"],
            },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "details",
              label: "Details",
              fieldKeys: ["source", "status", "temperature", "insurance_type_desired", "notes"],
            },
          ],
        },
      ],
    };
    expect(needsLeadLayoutMigration(dirty)).toBe(true);
    const clean = migrateLeadLayout(dirty);
    const keys = allLayoutFieldKeys(clean);
        expect(keys).not.toContain("insurance_type_desired");
    expect(keys).toContain("insurance_subtype");
    expect(keys).toContain("insurance_category");
    expect(keys).toContain("temperature");
    expect(keys).toEqual(
      expect.arrayContaining([
        "applicant_gender",
        "applicant_occupation",
        "applicant_industry",
        "applicant_marital_status",
        "applicant_education_level",
        "contact_mailing_address",
        "date_of_birth",
      ]),
    );
    const applicant = clean.columns[0].sections.find((s) => s.id === "applicant");
    expect(applicant?.fieldKeys).toEqual([
      "applicant_gender",
      "applicant_marital_status",
      "applicant_industry",
      "applicant_occupation",
      "military_discount",
      "credit_permission",
      "assumed_credit_rating",
      "applicant_education_level",
    ]);
    expect(applicant?.fieldKeys).not.toContain("applicant_employment");
  });

  it("default lead layout already clean", () => {
    const layout = defaultLayoutForModule("leads");
    expect(needsLeadLayoutMigration(layout)).toBe(false);
    expect(allLayoutFieldKeys(layout)).toContain("status");
    expect(allLayoutFieldKeys(layout)).toContain("cadence");
    expect(allLayoutFieldKeys(layout)).not.toContain("insurance_type_desired");
  });

  it("deal-parity live layout gets Insurance Type + subtype", () => {
    const parity = {
      columns: [
        {
          id: "left",
          sections: [
            { id: "contact", label: "Applicant", fieldKeys: ["first_name", "last_name", "email", "phone", "date_of_birth"] },
            { id: "applicant", label: "Applicant Details", fieldKeys: ["applicant_gender", "applicant_occupation"] },
            { id: "insured_address", label: "Insured Address", fieldKeys: ["mailing_address", "city", "state", "zip"] },
            { id: "sec_quality", label: "Lead Quality", fieldKeys: ["cadence", "temperature"] },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "co_applicant",
              label: "Co-applicant",
              fieldKeys: ["co_applicant_first_name", "co_applicant_last_name"],
            },
            {
              id: "mailing_address",
              label: "Mailing Address",
              fieldKeys: ["contact_mailing_address", "contact_mailing_city", "contact_mailing_state", "contact_mailing_zip"],
            },
          ],
        },
      ],
    };
    expect(needsLeadLayoutMigration(parity)).toBe(true);
    const next = migrateLeadLayout(parity);
    const keys = allLayoutFieldKeys(next);
    expect(keys).toContain("insurance_type");
    expect(keys).toContain("insurance_subtype");
    expect(keys).toContain("insurance_category");
    expect(keys).toContain("temperature");
    expect(keys).toContain("entity_type");
    expect(next.columns[0].sections.find((s) => s.id === "contact")?.fieldKeys).toEqual(
      expect.arrayContaining(["entity_type"]),
    );
    expect(next.columns[0].sections.find((s) => s.id === "applicant")?.fieldKeys).toEqual(
      expect.arrayContaining(["applicant_gender", "applicant_occupation", "applicant_industry"]),
    );
  });

});
