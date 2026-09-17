import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/lib/businesses/entity-industry";
import {
  BUSINESS_IDENTITY_FIELD_KEYS,
  COMMERCIAL_ENTITY_TYPE_OPTIONS,
  defaultCommercialDealLayout,
} from "@/lib/custom-fields/business-identity-fields";
import { APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { layoutForDealDetails, usesBusinessIdentityDetails } from "./product-layout";

describe("Commercial Deal Details business identity", () => {
  it("reuses businesses/accounts keys instead of minting fein/owner_* duplicates", () => {
    expect([...COMMERCIAL_ENTITY_TYPE_OPTIONS]).toEqual([...BUSINESS_ENTITY_TYPE_OPTIONS]);
    expect([...BUSINESS_IDENTITY_FIELD_KEYS]).toEqual(
      expect.arrayContaining(["ein", "operations", "annual_sales", "first_name", "date_of_birth"]),
    );
    expect(BUSINESS_IDENTITY_FIELD_KEYS).not.toContain("fein");
    expect(BUSINESS_IDENTITY_FIELD_KEYS).not.toContain("annual_revenue");
    expect(BUSINESS_IDENTITY_FIELD_KEYS).not.toContain("business_description");
    expect(BUSINESS_IDENTITY_FIELD_KEYS).not.toContain("owner_name");
  });

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
    expect(keys).toContain("ein");
    expect(keys).toContain("naics");
    expect(keys).toContain("operations");
    expect(keys).toContain("annual_sales");
    expect(keys).toContain("first_name");
    expect(keys).toContain("date_of_birth");
    expect(keys).not.toContain("fein");
    expect(keys).not.toContain("annual_revenue");
    expect(keys).not.toContain("business_description");
    expect(keys).not.toContain("owner_name");
    expect(keys).not.toContain("applicant_marital_status");
    expect(keys).not.toContain("applicant_gender");
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
      expect(keys).not.toContain("ein");
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
    expect(commercial).toMatch(/data-ff-pipeline-strip/);
    expect(commercial).toMatch(/aria-label="Policy form"/);
    expect(commercial).toMatch(/data-ff-deal-section="business"/);
    expect(commercial).toMatch(/data-ff-deal-section="owner"/);
    expect(commercial).toMatch(/data-ff-deal-field="business_name"/);
    expect(commercial).toMatch(/data-ff-deal-field="ein"/);
    expect(commercial).toMatch(/data-ff-deal-field="first_name"/);
    expect(commercial).toContain("Owner first name");
    expect(commercial).toContain("FEIN");
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
