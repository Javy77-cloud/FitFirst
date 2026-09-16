import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { CONTACT_IDENTITY_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
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
  });
});
