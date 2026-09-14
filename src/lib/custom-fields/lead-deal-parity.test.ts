import { describe, expect, it } from "vitest";
import {
  isLeadDealParityLayout,
  needsLeadLayoutMigration,
  migrateLeadLayout,
} from "@/lib/custom-fields/migrate-lead-layout";
import { dealValuesFromLead } from "@/lib/custom-fields/transfer";
import type { FieldLayout } from "@/lib/custom-fields/types";

const dealLike: FieldLayout = {
  columns: [
    {
      id: "left",
      sections: [
        {
          id: "contact",
          label: "Applicant",
          fieldKeys: ["first_name", "last_name", "email", "phone", "date_of_birth", "applicant_marital_status"],
        },
        {
          id: "applicant",
          label: "Applicant Details",
          fieldKeys: [
            "applicant_gender",
            "applicant_occupation",
            "applicant_employment",
            "applicant_education_level",
          ],
        },
        {
          id: "insured_address",
          label: "Insured Address",
          fieldKeys: ["mailing_address", "city", "state", "zip"],
        },
      ],
    },
    {
      id: "right",
      sections: [
        {
          id: "co_applicant",
          label: "Co-applicant",
          fieldKeys: ["co_applicant_first_name", "co_applicant_last_name", "co_applicant_dob"],
        },
        {
          id: "mailing_address",
          label: "Mailing Address",
          fieldKeys: [
            "contact_mailing_address",
            "contact_mailing_city",
            "contact_mailing_state",
            "contact_mailing_zip",
          ],
        },
      ],
    },
  ],
};

describe("Lead ↔ Deal layout parity", () => {
  it("treats Deal-shaped Lead layout as parity and injects Insurance Type + subtype", () => {
    expect(isLeadDealParityLayout(dealLike)).toBe(true);
    expect(needsLeadLayoutMigration(dealLike)).toBe(true);
    const migrated = migrateLeadLayout(dealLike);
    const keys = migrated.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
    expect(keys).toContain("insurance_type");
    expect(keys).toContain("insurance_subtype");
    expect(migrated.columns[1].sections.map((s) => s.id)).toEqual([
      "co_applicant",
      "mailing_address",
      "details",
    ]);
    expect(migrated.columns[0].sections.find((s) => s.id === "applicant")?.fieldKeys).toEqual([
      "applicant_gender",
      "applicant_occupation",
      "applicant_employment",
      "applicant_education_level",
      "applicant_marital_status",
      "entity_type",
    ]);
  });

  it("copies same-key lead custom fields onto the deal on convert", () => {
    const values = dealValuesFromLead(
      {
        firstName: "Edmerson",
        lastName: "Vazquez",
        email: "edmersonv@gmail.com",
        phone: "508-922-0612",
      } as any,
      [
        { key: "first_name", systemKey: "firstName" },
        { key: "co_applicant_first_name" },
        { key: "co_applicant_gender" },
        { key: "applicant_occupation" },
        { key: "entity_type" },
        { key: "contact_mailing_city" },
      ],
      null,
      {
        co_applicant_first_name: "Maria",
        co_applicant_gender: "Female",
        applicant_occupation: "Professional",
        entity_type: "LLC",
        contact_mailing_city: "Naples",
      },
    );
    expect(values.co_applicant_first_name).toBe("Maria");
    expect(values.co_applicant_gender).toBe("Female");
    expect(values.applicant_occupation).toBe("Professional");
    expect(values.entity_type).toBe("LLC");
    expect(values.contact_mailing_city).toBe("Naples");
    expect(values.first_name).toBe("Edmerson");
  });

  it("copies insurance_type + category + subtype onto the deal", () => {
    const values = dealValuesFromLead(
      { firstName: "Ana", lastName: "Dib" } as any,
      [
        { key: "insurance_type" },
        { key: "insurance_category" },
        { key: "insurance_subtype", systemKey: "quotingForm" },
      ],
      null,
      { insurance_type: "PC", insurance_category: "Auto", insurance_subtype: "Auto" },
    );
    expect(values.insurance_type).toBe("PC");
    expect(values.insurance_category).toBe("Auto");
    expect(values.insurance_subtype).toBe("Auto");
  });

});
