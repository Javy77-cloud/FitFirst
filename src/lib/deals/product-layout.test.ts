import { describe, expect, it } from "vitest";
import { DEAL_PRODUCTS } from "./deal-products";
import {
  SHARED_DEAL_SECTION_IDS,
  catalogFieldsForProducts,
  isSharedDealSection,
  layoutForActiveProduct,
  productLayoutFields,
  productSectionComplete,
  productSectionId,
} from "./product-layout";

const SHARED_LAYOUT = {
  columns: [
    {
      id: "left",
      sections: [
        { id: "contact", label: "Contact", fieldKeys: ["first_name", "phone"] },
        { id: "applicant", label: "Applicant", fieldKeys: ["date_of_birth", "occupation"] },
      ],
    },
    {
      id: "right",
      sections: [
        { id: "insured_address", label: "Insured address", fieldKeys: ["mailing_address"] },
        { id: "mailing_address", label: "Mailing address", fieldKeys: ["contact_mailing_address"] },
        { id: "details", label: "Details", fieldKeys: ["year_built"] },
      ],
    },
  ],
};

describe("deal details shared body + product overlay", () => {
  it("keeps identity/phones/DOB/addresses once and hides other product sections", () => {
    expect(SHARED_DEAL_SECTION_IDS).toEqual([
      "contact",
      "applicant",
      "co_applicant",
      "insured_address",
      "mailing_address",
    ]);
    expect(isSharedDealSection({ id: "contact" })).toBe(true);
    expect(isSharedDealSection({ id: "details" })).toBe(false);

    const home = layoutForActiveProduct(SHARED_LAYOUT, "homeowners");
    expect(home.columns[0].sections.map((section) => section.id)).toEqual(["contact", "applicant"]);
    expect(home.columns[1].sections.map((section) => section.id)).toEqual([
      "insured_address",
      "mailing_address",
      productSectionId("homeowners"),
    ]);
    expect(home.columns[1].sections.some((section) => section.fieldKeys.includes("year_built"))).toBe(
      true,
    );

    const life = layoutForActiveProduct(SHARED_LAYOUT, "life_term");
    const lifeKeys = life.columns.flatMap((col) => col.sections.flatMap((section) => section.fieldKeys));
    expect(lifeKeys).toEqual(expect.arrayContaining(["first_name", "face_amount"]));
    expect(lifeKeys).not.toContain("year_built");
    expect(lifeKeys).not.toContain("coverage_a");
  });

  it("does not mix Home questions into Life/Health catalogs", () => {
    const homeKeys = productLayoutFields("homeowners").map((field) => field.key);
    const lifeKeys = productLayoutFields("life_term").map((field) => field.key);
    const healthKeys = productLayoutFields("health_marketplace").map((field) => field.key);
    expect(homeKeys).toEqual(expect.arrayContaining(["year_built", "coverage_a"]));
    expect(lifeKeys).toEqual(expect.arrayContaining(["face_amount", "life_product_type"]));
    expect(lifeKeys.some((key) => homeKeys.includes(key))).toBe(false);
    expect(healthKeys).toEqual(expect.arrayContaining(["plan_type"]));
    expect(healthKeys).not.toContain("year_built");
  });

  it("marks a chip complete with a reasonable fill heuristic", () => {
    expect(productSectionComplete("auto", { vin: "1", vehicle_year: "2018" })).toBe(true);
    expect(productSectionComplete("auto", { vin: "" })).toBe(false);
    expect(productSectionComplete("renters", { coverage_c: "25000" })).toBe(true);
    expect(catalogFieldsForProducts([...DEAL_PRODUCTS]).length).toBeGreaterThan(10);
  });
});
