import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import {
  BUSINESS_IDENTITY_FIELD_KEYS,
  defaultCommercialDealLayout,
} from "@/lib/custom-fields/business-identity-fields";
import { APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { layoutForDealDetails, usesBusinessIdentityDetails } from "./product-layout";

describe("Commercial Deal Details business identity", () => {
  it("uses business identity when the deal is Commercial-family only", () => {
    expect(usesBusinessIdentityDetails({ products: ["gl", "bop"] })).toBe(true);
    expect(usesBusinessIdentityDetails({ products: ["workers_comp"] })).toBe(true);
    expect(usesBusinessIdentityDetails({ products: ["commercial_auto"] })).toBe(true);
    expect(usesBusinessIdentityDetails({ accountKind: "commercial", products: [] })).toBe(true);
    expect(usesBusinessIdentityDetails({ products: ["homeowners"] })).toBe(false);
    expect(usesBusinessIdentityDetails({ products: ["life_term"] })).toBe(false);
    expect(usesBusinessIdentityDetails({ products: ["health_ma"] })).toBe(false);
    expect(usesBusinessIdentityDetails({ products: ["homeowners", "gl"] })).toBe(false);
  });

  it("does not show personal marital/gender applicant fields on the commercial layout", () => {
    const layout = defaultCommercialDealLayout();
    const keys = allLayoutFieldKeys(layout);
    expect(keys).toEqual(expect.arrayContaining([...BUSINESS_IDENTITY_FIELD_KEYS]));
    expect(keys).toContain("business_name");
    expect(keys).toContain("dba");
    expect(keys).toContain("fein");
    expect(keys).toContain("naics");
    expect(keys).toContain("owner_name");
    expect(keys).toContain("owner_dob");
    expect(keys).not.toContain("applicant_marital_status");
    expect(keys).not.toContain("applicant_gender");
    expect(keys).not.toContain("first_name");
    for (const key of APPLICANT_SECTION_FIELD_KEYS) {
      expect(keys).not.toContain(key);
    }
  });

  it("keeps Personal / Life / Health on the shared personal Details layout", () => {
    const personal = defaultLayoutForLine("HO");
    for (const product of ["homeowners", "life_term", "health_marketplace"] as const) {
      const live = layoutForDealDetails(personal, { product, products: [product] });
      const keys = allLayoutFieldKeys(live);
      expect(keys).toContain("applicant_marital_status");
      expect(keys).toContain("applicant_gender");
      expect(keys).not.toContain("business_name");
      expect(keys).not.toContain("fein");
    }
  });

  it("renders business identity on a Commercial deal and personal applicant on Home", () => {
    const commercial = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-c",
        line: "GL",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
        accountKind: "commercial",
        dealProducts: ["gl", "bop"],
        activeProduct: "gl",
      }),
    );
    expect(commercial).toMatch(/data-ff-deal-details-kind="commercial"/);
    expect(commercial).toMatch(/data-ff-deal-section="business"/);
    expect(commercial).toMatch(/data-ff-deal-section="owner"/);
    expect(commercial).toMatch(/data-ff-deal-field="business_name"/);
    expect(commercial).toMatch(/data-ff-deal-field="fein"/);
    expect(commercial).toMatch(/data-ff-deal-field="owner_name"/);
    expect(commercial).not.toMatch(/data-ff-deal-field="applicant_marital_status"/);
    expect(commercial).not.toMatch(/data-ff-deal-field="applicant_gender"/);
    expect(commercial).toContain("Mailing address same as business address");

    const personal = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-p",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
        accountKind: "personal",
        dealProducts: ["homeowners"],
        activeProduct: "homeowners",
      }),
    );
    expect(personal).toMatch(/data-ff-deal-details-kind="personal"/);
    expect(personal).toMatch(/data-ff-deal-field="applicant_marital_status"/);
    expect(personal).toMatch(/data-ff-deal-field="applicant_gender"/);
    expect(personal).not.toMatch(/data-ff-deal-field="business_name"/);
    expect(personal).not.toMatch(/data-ff-deal-section="business"/);
  });
});
