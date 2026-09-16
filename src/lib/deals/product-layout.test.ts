import { describe, expect, it } from "vitest";
import type { FieldLayout } from "@/lib/custom-fields/types";
import {
  APPLICANT_CUSTOM_KEYS,
  CONTACT_IDENTITY_FIELD_KEYS,
} from "@/lib/custom-fields/applicant-fields";
import { CO_APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/co-applicant-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { DEAL_PRODUCTS } from "./deal-products";
import {
  SHARED_DEAL_SECTION_IDS,
  catalogFieldsForProducts,
  isSharedDealSection,
  layoutForActiveProduct,
  productLayoutFields,
  productSectionComplete,
  productSectionId,
  productSectionProgress,
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
} as FieldLayout;

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
    ]);
    expect(home.columns[1].sections.some((section) => section.id === productSectionId("homeowners"))).toBe(
      false,
    );
    expect(home.columns[1].sections.some((section) => section.fieldKeys.includes("year_built"))).toBe(
      false,
    );

    const life = layoutForActiveProduct(SHARED_LAYOUT, "life_term");
    const lifeKeys = life.columns.flatMap((col) => col.sections.flatMap((section) => section.fieldKeys));
    expect(lifeKeys).toEqual(expect.arrayContaining(["first_name"]));
    expect(lifeKeys).not.toContain("face_amount");
    expect(lifeKeys).not.toContain("year_built");
    expect(lifeKeys).not.toContain("coverage_a");
  });

  it("uses one shared identity page for Home, Auto, and Flood — no per-product personal layout", () => {
    const base = defaultLayoutForLine("HO");
    const home = layoutForActiveProduct(base, "homeowners");
    const auto = layoutForActiveProduct(base, "auto");
    const flood = layoutForActiveProduct(base, "flood");
    const life = layoutForActiveProduct(base, "life_term");
    expect(allLayoutFieldKeys(home)).toEqual(allLayoutFieldKeys(auto));
    expect(allLayoutFieldKeys(auto)).toEqual(allLayoutFieldKeys(flood));
    expect(allLayoutFieldKeys(flood)).toEqual(allLayoutFieldKeys(life));
    expect(allLayoutFieldKeys(home)).toEqual(
      expect.arrayContaining([...CONTACT_IDENTITY_FIELD_KEYS, "applicant_gender", "contact_mailing_address"]),
    );
  });

  it("keeps Home/Auto/Flood product catalogs free of applicant/contact keys", () => {
    const personal = new Set<string>([
      ...CONTACT_IDENTITY_FIELD_KEYS,
      ...APPLICANT_CUSTOM_KEYS,
      ...CO_APPLICANT_SECTION_FIELD_KEYS,
      "phone",
      "email",
      "mailing_address",
      "contact_mailing_address",
    ]);
    for (const product of ["homeowners", "auto", "flood"] as const) {
      const keys = productLayoutFields(product).map((field) => field.key);
      expect(keys.some((key) => personal.has(key))).toBe(false);
    }
    expect(productLayoutFields("life_term").map((field) => field.key)).not.toContain("first_name");
    expect(productLayoutFields("health_marketplace").map((field) => field.key)).not.toContain(
      "applicant_gender",
    );
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
    expect(productSectionProgress("auto", { vin: "1" }).filled).toBe(1);
    expect(productSectionProgress("auto", { vin: "1" }).complete).toBe(false);
  });
});
