import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import {
  APPLICANT_CRM_FIELDS,
  APPLICANT_SECTION_FIELD_KEYS,
  CONTACT_IDENTITY_FIELD_KEYS,
} from "@/lib/custom-fields/applicant-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { DEAL_DETAILS_LANDLORD_FIELD_KEYS } from "@/lib/custom-fields/deal-details-landlord";
import { occupationsForIndustry } from "@/lib/custom-fields/industry-occupation";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { layoutForActiveProduct, productLayoutFields } from "./product-layout";

describe("Deal Details personal / identity layout", () => {
  it("keeps a shared personal default layout and does not overlay Home/Auto/Flood modules", () => {
    const layout = defaultLayoutForLine("HO");
    const keys = allLayoutFieldKeys(layout);
    expect(keys).toEqual(
      expect.arrayContaining([
        ...CONTACT_IDENTITY_FIELD_KEYS,
        ...APPLICANT_SECTION_FIELD_KEYS,
        "mailing_address",
        "contact_mailing_address",
        "lived_at_address_5_years",
      ]),
    );
    expect(keys).toContain("middle_name");
    expect(keys).toContain("applicant_industry");
    expect(keys).toContain("epolicy");
    expect(layout.columns[0].sections.map((s) => s.id)).toEqual([
      "contact",
      "applicant",
      "insured_address",
    ]);
    expect(layout.columns[1].sections.map((s) => s.id)).toEqual([
      "co_applicant",
      "mailing_address",
      "details",
    ]);
    expect(layout.columns[0].sections.find((s) => s.id === "contact")?.fieldKeys[0]).toBe(
      "entity_type",
    );

    const personal = layoutForActiveProduct(layout, "homeowners");
    const personalKeys = allLayoutFieldKeys(personal);
    expect(personalKeys).not.toContain("year_built");
    expect(personalKeys).not.toContain("vin");
    expect(personalKeys).not.toContain("flood_zone");
    expect(personalKeys).not.toContain("coverage_a");
    expect(personal.columns[1].sections.some((s) => s.id.startsWith("product_"))).toBe(false);

    expect(productLayoutFields("homeowners").map((f) => f.key)).toContain("year_built");
  });

  it("cascades Retire industry to Retire occupation only", () => {
    expect(occupationsForIndustry("Retire")).toEqual(["Retire"]);
  });

  it("renders mailing-same checkbox and hides mailing fields when checked", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: { mailing_same_as_insured: "true" },
      }),
    );
    expect(html).toMatch(/data-ff-mailing-same-switch/);
    expect(html).toContain("Mailing address same as insured address");
    expect(html).not.toMatch(/data-ff-deal-field="contact_mailing_address"/);
    expect(html).toMatch(/data-ff-deal-field="mailing_address"/);
    expect(html).not.toMatch(/data-ff-deal-section-kind="product"/);
    expect(html).toMatch(/data-ff-deal-details-save/);
  });

  it("renders one two-column personal form with no doubled identity fields", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-deal-details-col="left"/);
    expect(html).toMatch(/data-ff-deal-details-col="right"/);
    expect(html).toMatch(/data-ff-deal-section="contact"/);
    expect(html).toMatch(/data-ff-deal-section="applicant"/);
    expect(html).toMatch(/data-ff-deal-section="co_applicant"/);
    expect(html).toMatch(/data-ff-deal-section="insured_address"/);
    expect(html).toMatch(/data-ff-deal-section="mailing_address"/);
    expect(html).not.toMatch(/data-ff-deal-section="details"/);
    expect(html).toMatch(/data-ff-co-applicant-switch/);
    expect(html.match(/data-ff-deal-field="applicant_marital_status"/g)?.length).toBe(1);
    expect(html.match(/data-ff-deal-field="applicant_gender"/g)?.length).toBe(1);
    expect(html.match(/data-ff-deal-field="mailing_address"/g)?.length).toBe(1);
    expect(html).not.toMatch(/data-ff-deal-field="marital_status"/);
    expect(html).not.toMatch(/data-ff-deal-field="year_built"/);
    expect(html).not.toMatch(/data-ff-deal-field="vin"/);
    expect(html).not.toMatch(/data-ff-deal-field="flood_zone"/);
  });

  it("does not render a second marital-status field when applicant marital exists", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: {
          columns: [
            {
              id: "left",
              sections: [
                {
                  id: "contact",
                  label: "Contact",
                  fieldKeys: ["first_name", "marital_status"],
                },
                {
                  id: "applicant",
                  label: "Applicant",
                  fieldKeys: ["applicant_marital_status"],
                },
              ],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-deal-field="applicant_marital_status"/);
    expect(html).not.toMatch(/data-ff-deal-field="marital_status"/);
  });

  it("shows previous address only when lived-here is No", () => {
    const hidden = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: { lived_at_address_5_years: "Yes" },
      }),
    );
    expect(hidden).not.toMatch(/data-ff-deal-field="previous_address"/);

    const unanswered = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
      }),
    );
    expect(unanswered).not.toMatch(/data-ff-deal-field="previous_address"/);
    expect(unanswered).not.toMatch(/data-ff-deal-field="previous_city"/);

    const shown = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: { lived_at_address_5_years: "No" },
      }),
    );
    expect(shown).toMatch(/data-ff-deal-field="previous_address"/);
    expect(shown).toMatch(/data-ff-deal-field="previous_city"/);
  });

  it("never renders landlord / rental fields even if a saved layout still lists them", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: {
          columns: [
            {
              id: "left",
              sections: [
                {
                  id: "insured_address",
                  label: "Insured Address",
                  fieldKeys: ["mailing_address", "primary_heat", "lease_term", "animals"],
                },
              ],
            },
            {
              id: "right",
              sections: [
                {
                  id: "landlord",
                  label: "Landlord",
                  fieldKeys: [...DEAL_DETAILS_LANDLORD_FIELD_KEYS],
                },
              ],
            },
          ],
        },
        fields: [],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-deal-field="mailing_address"/);
    expect(html).not.toMatch(/data-ff-deal-field="primary_heat"/);
    expect(html).not.toMatch(/data-ff-deal-field="lease_term"/);
    expect(html).not.toMatch(/data-ff-deal-field="tenant_name"/);
    expect(html).not.toMatch(/data-ff-deal-section="landlord"/);
  });

  it("filters occupation options by selected industry", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [...APPLICANT_CRM_FIELDS],
        values: { applicant_industry: "Retire" },
      }),
    );
    expect(html).toMatch(/data-ff-picklist="applicant_occupation"/);
    expect(html).toMatch(/<option value="Retire">Retire<\/option>/);
    expect(html).not.toMatch(/Select industry first/);

    const empty = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [...APPLICANT_CRM_FIELDS],
        values: {},
      }),
    );
    expect(empty).toMatch(/Select industry first/);

    const stub = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: { applicant_industry: "Agriculture / Forestry / Fishing" },
      }),
    );
    expect(stub).toMatch(/data-ff-picklist="applicant_occupation"/);
    expect(stub).toMatch(/Farm Ranch Owner/);
  });
});
