import { describe, expect, it } from "vitest";
import { defaultLayoutForLine } from "./defaults";
import { removeFieldFromLayout } from "./layout";
import {
  isLegacyDealPersonalLayout,
  migrateDealLayoutParity,
  needsDealLayoutParity,
} from "./migrate-deal-layout-parity";
import {
  AGENCY_LAYOUT_REVISION,
  allLayoutFieldKeys,
  parseLayout,
  withLayoutRevision,
} from "./types";
import {
  DEAL_DETAILS_LANDLORD_FIELD_KEYS,
  isDealDetailsLandlordFieldKey,
  isDealDetailsLandlordSection,
  needsDealDetailsLandlordStrip,
  stripDealDetailsLandlordFields,
} from "./deal-details-landlord";

describe("Deal Details landlord / rental strip", () => {
  it("names the rental block keys Javy called out", () => {
    expect(DEAL_DETAILS_LANDLORD_FIELD_KEYS).toEqual([
      "lease_term",
      "tenant_name",
      "landlord_liability",
      "loss_of_rents",
      "animals",
      "primary_heat",
      "business_on_premises",
    ]);
    expect(isDealDetailsLandlordFieldKey("primary_heat")).toBe(true);
    expect(isDealDetailsLandlordFieldKey("lived_at_address_5_years")).toBe(false);
    expect(isDealDetailsLandlordSection({ id: "landlord", label: "Landlord" })).toBe(true);
    expect(isDealDetailsLandlordSection({ id: "product_landlord", label: "Landlord / DP" })).toBe(
      true,
    );
    expect(isDealDetailsLandlordSection({ id: "insured_address", label: "Insured Address" })).toBe(
      false,
    );
  });

  it("default personal layout never includes the rental block", () => {
    const keys = allLayoutFieldKeys(defaultLayoutForLine("HO"));
    for (const key of DEAL_DETAILS_LANDLORD_FIELD_KEYS) {
      expect(keys).not.toContain(key);
    }
    expect(needsDealDetailsLandlordStrip(defaultLayoutForLine("HO"))).toBe(false);
  });

  it("strips landlord keys and the landlord section without touching personal fields", () => {
    const start = parseLayout({
      revision: AGENCY_LAYOUT_REVISION,
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "insured_address",
              label: "Insured Address",
              fieldKeys: ["mailing_address", "primary_heat", "animals"],
            },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "landlord",
              label: "Landlord",
              fieldKeys: [
                "lease_term",
                "tenant_name",
                "landlord_liability",
                "loss_of_rents",
                "business_on_premises",
              ],
            },
            {
              id: "co_applicant",
              label: "Co-applicant",
              fieldKeys: ["co_applicant_first_name"],
            },
          ],
        },
      ],
    });
    expect(needsDealDetailsLandlordStrip(start)).toBe(true);
    const next = stripDealDetailsLandlordFields(start);
    expect(next.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(allLayoutFieldKeys(next)).toEqual(["mailing_address", "co_applicant_first_name"]);
    expect(next.columns[1].sections.map((section) => section.id)).toEqual(["co_applicant"]);
    expect(needsDealDetailsLandlordStrip(next)).toBe(false);
  });

  it("does not re-seed rental keys after an agency Save / parity no-op", () => {
    const start = defaultLayoutForLine("HO");
    const deleted = removeFieldFromLayout(start, "applicant_education_level");
    const withRental = {
      ...deleted,
      columns: [
        {
          ...deleted.columns[0],
          sections: deleted.columns[0].sections.map((section) =>
            section.id === "insured_address"
              ? { ...section, fieldKeys: [...section.fieldKeys, "primary_heat", "lease_term"] }
              : section,
          ),
        },
        deleted.columns[1],
      ],
    };
    const saved = withLayoutRevision(stripDealDetailsLandlordFields(withRental), AGENCY_LAYOUT_REVISION);
    expect(allLayoutFieldKeys(saved)).not.toContain("primary_heat");
    expect(allLayoutFieldKeys(saved)).not.toContain("lease_term");
    expect(allLayoutFieldKeys(saved)).not.toContain("applicant_education_level");
    expect(isLegacyDealPersonalLayout(saved)).toBe(false);
    expect(needsDealLayoutParity(saved)).toBe(false);
    const reloaded = parseLayout(JSON.parse(JSON.stringify(saved)));
    expect(allLayoutFieldKeys(migrateDealLayoutParity(reloaded))).not.toContain("primary_heat");
    expect(allLayoutFieldKeys(migrateDealLayoutParity(reloaded))).not.toContain("lease_term");
    expect(allLayoutFieldKeys(migrateDealLayoutParity(reloaded))).not.toContain(
      "applicant_education_level",
    );
  });
});
