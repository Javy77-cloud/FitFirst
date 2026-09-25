import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import {
  APPLICANT_CRM_FIELDS,
  APPLICANT_SECTION_FIELD_KEYS,
  CONTACT_IDENTITY_FIELD_KEYS,
} from "@/lib/custom-fields/applicant-fields";
import { CO_APPLICANT_CRM_FIELDS } from "@/lib/custom-fields/co-applicant-fields";
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
    expect(keys).not.toContain("applicant_employment");
    expect(keys).not.toContain("co_applicant_employment");
    expect(keys).toContain("epolicy");
    expect(keys).toContain("referral");
    expect(keys).not.toContain("nickname");
    expect(keys).not.toContain("secondary_phone");
    expect(keys).not.toContain("spouse_link");
    expect(keys).not.toContain("dependents");
    expect(keys).not.toContain("drivers_license_number");
    expect(layout.columns[0].sections.map((s) => s.id)).toEqual([
      "contact",
      "applicant",
      "insured_address",
    ]);
    expect(layout.columns[1].sections.map((s) => s.id)).toEqual([
      "co_applicant",
      "mailing_address",
      "intake",
      "pipeline",
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
    expect(html).toMatch(/Verify address/);
    expect(html.match(/Verify address/g)?.length).toBe(1);
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
    expect(html).not.toMatch(/data-ff-deal-section="prefs"/);
    expect(html).not.toMatch(/>Preferences</);
    expect(html).toMatch(/data-ff-deal-section="intake"/);
    expect(html).toMatch(/data-ff-deal-section="pipeline"/);
    expect(html).not.toMatch(/data-ff-deal-field="drivers_license_number"/);
    expect(html).toMatch(/data-ff-pipeline-strip/);
    expect(html).toMatch(/aria-label="Pipeline"/);
    expect(html).toMatch(/aria-label="Insurance type"/);
    expect(html).toMatch(/aria-label="Policy form"/);
    expect(html).not.toMatch(/data-ff-insurance-quote-request/);
    expect(html).not.toMatch(/#e0f2fe/);
    expect(html).toMatch(/data-ff-co-applicant-switch/);
    expect(html).toMatch(/data-ff-layout-section-header/);
    expect(html).toMatch(/data-ff-section-field-grid/);
    expect(html).toMatch(/data-ff-section-density="2"/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/Asked once/);
    expect(html).not.toMatch(/data-ff-shared-once/);
    expect(html).not.toMatch(/master sheet Fill/);
    expect(html.match(/data-ff-deal-field="applicant_marital_status"/g)?.length).toBe(1);
    expect(html.match(/data-ff-deal-field="applicant_gender"/g)?.length).toBe(1);
    expect(html.match(/data-ff-deal-field="mailing_address"/g)?.length).toBe(1);
    expect(html).not.toMatch(/data-ff-deal-field="marital_status"/);
    expect(html).not.toMatch(/data-ff-deal-field="year_built"/);
    expect(html).not.toMatch(/data-ff-deal-field="vin"/);
    expect(html).not.toMatch(/data-ff-deal-field="flood_zone"/);
  });

  it("prefills Pipeline strip from Term Life product when stored cascade is empty", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-tyler",
        line: "LIFE",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
        pipelineFamily: "life",
        quotingForm: "Term Life",
        policySubType: "Term Life",
        dealProducts: ["life_term"],
        activeProduct: "life_term",
      }),
    );
    expect(html).toMatch(/data-ff-pipeline-strip/);
    expect(html).toMatch(/data-ff-cascade-type-value="Life"/);
    expect(html).toMatch(/data-ff-cascade-category-value="Term Life"/);
    expect(html).toMatch(/data-ff-cascade-subtype-value="Term Life"/);
    expect(html).toMatch(/data-ff-required-field="pipeline"/);
    expect(html).toMatch(/data-ff-required-field="selling-agency"/);
    expect(html).toMatch(/text-red-700/);
    expect(html).not.toMatch(/#e0f2fe/);
    expect(html).not.toMatch(/Policy type/);
  });

  it("puts pipeline, selling agency, insurance type, and policy form on one card row", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
        lineSettings: { writeLife: true, writeHealth: false },
      }),
    );
    const pipeline = html.indexOf('aria-label="Pipeline"');
    const agency = html.indexOf('aria-label="Selling agency"');
    const type = html.indexOf('aria-label="Insurance type"');
    const form = html.indexOf('aria-label="Policy form"');
    expect(pipeline).toBeGreaterThan(-1);
    expect(pipeline).toBeLessThan(agency);
    expect(agency).toBeLessThan(type);
    expect(type).toBeLessThan(form);
    expect(html).toMatch(/data-ff-pipeline-row="1"/);
    expect(html).toMatch(/data-ff-pipeline-columns="4"/);
    expect(html).toMatch(/grid-cols-4/);
    expect(html).not.toMatch(/grid-cols-3/);
    const card = html.slice(
      html.indexOf('data-ff-deal-section="pipeline"') - 180,
      html.indexOf('data-ff-deal-section="pipeline"'),
    );
    expect(card).toMatch(/ff-card/);
    expect(card).not.toMatch(/bg-background/);
    expect(html).toMatch(/data-ff-section-title-tone="required"/);
    expect(html).toMatch(/text-red-700">Pipeline</);
  });

  it("drops selling agency from the pipeline row when Life and Health are both off", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: {},
        lineSettings: { writeLife: false, writeHealth: false },
      }),
    );
    expect(html).not.toMatch(/aria-label="Selling agency"/);
    expect(html).not.toMatch(/data-ff-required-field="selling-agency"/);
    expect(html).toMatch(/data-ff-pipeline-columns="3"/);
    expect(html).toMatch(/grid-cols-3/);
    const pipeline = html.indexOf('aria-label="Pipeline"');
    const type = html.indexOf('aria-label="Insurance type"');
    const form = html.indexOf('aria-label="Policy form"');
    expect(pipeline).toBeLessThan(type);
    expect(type).toBeLessThan(form);
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

    const aliasHidden = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [],
        values: { lived_here_5_years: "Yes", previous_address: "9 Pine" },
      }),
    );
    expect(aliasHidden).not.toMatch(/data-ff-deal-field="previous_address"/);
  });

  it("hides mailing fields and Verify on shared create/lead when same-as-insured", () => {
    const layout = defaultLayoutForLine("HO");
    const same = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout,
        fields: [],
        values: { mailing_same_as_insured: "true" },
      }),
    );
    expect(same).toMatch(/data-ff-mailing-same-switch/);
    expect(same).toContain("Mailing address same as insured address");
    expect(same).not.toMatch(/data-ff-record-field="contact_mailing_address"/);
    expect(same).toMatch(/data-ff-record-field="mailing_address"/);
    expect(same).toMatch(/Verify address/);
    expect(same.match(/Verify address/g)?.length).toBe(1);

    const distinct = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout,
        fields: [],
        values: { mailing_same_as_insured: "false" },
      }),
    );
    expect(distinct).toMatch(/data-ff-record-field="contact_mailing_address"/);
    expect(distinct.match(/Verify address/g)?.length).toBe(2);
  });

  it("hides previous address on shared create/lead layouts unless lived-here is No", () => {
    const layout = defaultLayoutForLine("HO");
    const hidden = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout,
        fields: [],
        values: { lived_at_address_5_years: "Yes", previous_address: "1 Oak" },
      }),
    );
    expect(hidden).not.toMatch(/data-ff-record-field="previous_address"/);
    expect(hidden).not.toMatch(/data-ff-record-field="previous_city"/);

    const shown = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout,
        fields: [],
        values: { lived_at_address_5_years: "No" },
      }),
    );
    expect(shown).toMatch(/data-ff-record-field="previous_address"/);
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
    expect(stub).toMatch(/Farmworker/);
    expect(stub).not.toMatch(/Farm Ranch Owner/);
    expect(stub).not.toMatch(/Help Desk Technician/);

    const itHtml = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [...APPLICANT_CRM_FIELDS],
        values: { applicant_industry: "Information Technology" },
      }),
    );
    expect(itHtml).toMatch(/Help Desk Technician/);
    expect(itHtml).not.toMatch(/Farmworker/);

    const otherHtml = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [...APPLICANT_CRM_FIELDS],
        values: { applicant_industry: "Other" },
      }),
    );
    expect(otherHtml).toMatch(/<option value="Retired">Retired<\/option>/);
    expect(otherHtml).toMatch(/<option value="Freelancer">Freelancer<\/option>/);

    const coApp = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: [...APPLICANT_CRM_FIELDS, ...CO_APPLICANT_CRM_FIELDS],
        values: {
          has_co_applicant: "true",
          co_applicant_industry: "Retire",
        },
      }),
    );
    expect(coApp).toMatch(/data-ff-picklist="co_applicant_occupation"/);
    expect(coApp).toMatch(/<option value="Retire">Retire<\/option>/);
  });
});
