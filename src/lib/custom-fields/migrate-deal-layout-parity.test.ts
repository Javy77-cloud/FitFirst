import { describe, expect, it } from "vitest";
import { defaultLayoutForLine } from "./defaults";
import { removeFieldFromLayout } from "./layout";
import {
  isLegacyDealPersonalLayout,
  migrateDealLayoutParity,
  needsDealLayoutParity,
} from "./migrate-deal-layout-parity";
import { needsMailingAddressParity } from "./split-address-sections";
import { AGENCY_LAYOUT_REVISION, parseLayout } from "./types";

describe("deal layout parity", () => {
  it("defaults include co-applicant + mailing city/state/zip", () => {
    const layout = defaultLayoutForLine("HO");
    const right = layout.columns[1].sections.map((s) => s.id);
    expect(right).toContain("co_applicant");
    expect(layout.columns[0].sections.map((s) => s.id)).toEqual([
      "contact",
      "applicant",
      "insured_address",
    ]);
    const mailing = layout.columns[1].sections.find((s) => s.id === "mailing_address");
    expect(mailing?.fieldKeys).toEqual([
      "contact_mailing_address",
      "contact_mailing_unit",
      "contact_mailing_city",
      "contact_mailing_state",
      "contact_mailing_zip",
      "contact_mailing_county",
    ]);
    expect(needsMailingAddressParity(layout)).toBe(false);
    expect(needsDealLayoutParity(layout)).toBe(false);
  });

  it("fills skinny mailing only — never re-seeds co-applicant", () => {
    const skinny = {
      columns: [
        {
          id: "left",
          sections: [
            { id: "contact", label: "Contact", fieldKeys: ["first_name", "last_name"] },
            { id: "applicant", label: "Applicant", fieldKeys: ["applicant_gender"] },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "insured_address",
              label: "Insured Address",
              fieldKeys: ["mailing_address", "city", "state", "zip"],
            },
            {
              id: "mailing_address",
              label: "Mailing Address",
              fieldKeys: ["contact_mailing_address"],
            },
          ],
        },
      ],
    };
    expect(needsDealLayoutParity(skinny)).toBe(true);
    const next = migrateDealLayoutParity(skinny);
    expect(next.columns[0].sections.map((s) => s.id)).toEqual([
      "contact",
      "applicant",
      "insured_address",
    ]);
    expect(next.columns[0].sections.some((s) => s.id === "co_applicant")).toBe(false);
    expect(next.columns[1].sections.some((s) => s.id === "co_applicant")).toBe(false);
    expect(next.columns[0].sections.find((s) => s.id === "applicant")?.fieldKeys).toEqual(
      expect.arrayContaining(["applicant_gender", "applicant_industry"]),
    );
    expect(next.columns[0].sections.find((s) => s.id === "contact")?.fieldKeys).toEqual(
      expect.arrayContaining(["entity_type", "middle_name"]),
    );
    const mailing = next.columns[1].sections.find((s) => s.id === "mailing_address");
    expect(mailing?.fieldKeys).toEqual(
      expect.arrayContaining([
        "contact_mailing_address",
        "contact_mailing_city",
        "contact_mailing_state",
        "contact_mailing_zip",
      ]),
    );
  });

  it("does not resurrect a removed co-applicant section on migrate", () => {
    const layout = {
      columns: [
        {
          id: "left",
          sections: [{ id: "contact", label: "Contact", fieldKeys: ["first_name"] }],
        },
        {
          id: "right",
          sections: [
            {
              id: "details",
              label: "Details",
              fieldKeys: ["insurance_type", "insurance_category", "insurance_subtype"],
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
    expect(needsDealLayoutParity(layout)).toBe(true);
    const next = migrateDealLayoutParity(layout);
    expect(next.columns[0].sections.some((s) => /co.?applicant/i.test(s.id + s.label))).toBe(false);
  });

  it("defaults include Insurance Type + Category + Form", () => {
    const layout = defaultLayoutForLine("HO");
    const keys = layout.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
    expect(keys).toContain("insurance_type");
    expect(keys).toContain("insurance_category");
    expect(keys).toContain("insurance_subtype");
    const details = layout.columns[1].sections.find((s) => s.id === "details");
    expect(details?.fieldKeys).toEqual(
      expect.arrayContaining(["insurance_type", "insurance_category", "insurance_subtype"]),
    );
  });

  it("injects Insurance Type + subtype onto skinny live layouts without reseeding co-applicant", () => {
    const skinny = {
      columns: [
        {
          id: "left",
          sections: [
            { id: "contact", label: "Contact", fieldKeys: ["first_name", "last_name"] },
            { id: "applicant", label: "Applicant", fieldKeys: ["applicant_gender"] },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "insured_address",
              label: "Insured Address",
              fieldKeys: ["mailing_address", "city", "state", "zip"],
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
    expect(needsDealLayoutParity(skinny)).toBe(true);
    const next = migrateDealLayoutParity(skinny);
    const keys = next.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
    expect(keys).toContain("insurance_type");
    expect(keys).toContain("insurance_category");
    expect(keys).toContain("insurance_subtype");
    expect(next.columns[0].sections.some((s) => s.id === "co_applicant")).toBe(false);
  });

  it("moves co-applicant to the right and insured address under applicant", () => {
    const stacked = {
      columns: [
        {
          id: "left",
          sections: [
            { id: "contact", label: "Contact", fieldKeys: ["first_name"] },
            { id: "applicant", label: "Applicant", fieldKeys: ["applicant_gender"] },
            { id: "co_applicant", label: "Co-applicant", fieldKeys: ["co_applicant_first_name"] },
          ],
        },
        {
          id: "right",
          sections: [
            {
              id: "details",
              label: "Details",
              fieldKeys: ["insurance_type", "insurance_category", "insurance_subtype"],
            },
            {
              id: "insured_address",
              label: "Insured Address",
              fieldKeys: ["mailing_address", "city", "state", "zip"],
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
    const next = migrateDealLayoutParity(stacked);
    expect(next.columns[0].sections.map((s) => s.id)).toEqual([
      "contact",
      "applicant",
      "insured_address",
    ]);
    expect(next.columns[1].sections.map((s) => s.id)[0]).toBe("co_applicant");
    expect(next.columns[1].sections.map((s) => s.id)).toContain("mailing_address");
  });

  it("does not re-seed a field the agency removed from an already-personal layout", () => {
    const start = defaultLayoutForLine("HO");
    expect(isLegacyDealPersonalLayout(start)).toBe(false);
    const removed = removeFieldFromLayout(start, "applicant_education_level");
    const withoutMiddle = removeFieldFromLayout(removed, "middle_name");
    const withoutEpolicy = removeFieldFromLayout(withoutMiddle, "epolicy");
    const withoutCounty = removeFieldFromLayout(withoutEpolicy, "county");
    const withoutCoOcc = removeFieldFromLayout(withoutCounty, "co_applicant_occupation");
    expect(needsDealLayoutParity(withoutCoOcc)).toBe(false);
    const next = migrateDealLayoutParity(withoutCoOcc);
    const keys = next.columns.flatMap((col) => col.sections.flatMap((section) => section.fieldKeys));
    expect(keys).not.toContain("applicant_education_level");
    expect(keys).not.toContain("middle_name");
    expect(keys).not.toContain("epolicy");
    expect(keys).not.toContain("county");
    expect(keys).not.toContain("co_applicant_occupation");
    expect(keys).toContain("applicant_gender");
    expect(keys).toContain("first_name");
  });

  it("does not resurrect fields on an agency-owned layout even if every personal marker is gone", () => {
    const owned = parseLayout({
      revision: AGENCY_LAYOUT_REVISION,
      columns: [
        {
          id: "left",
          sections: [{ id: "contact", label: "Contact", fieldKeys: ["first_name", "last_name"] }],
        },
        {
          id: "right",
          sections: [
            {
              id: "mailing_address",
              label: "Mailing Address",
              fieldKeys: ["contact_mailing_address"],
            },
          ],
        },
      ],
    });
    expect(owned.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(isLegacyDealPersonalLayout(owned)).toBe(false);
    expect(needsDealLayoutParity(owned)).toBe(false);
    const next = migrateDealLayoutParity(owned);
    const keys = next.columns.flatMap((col) => col.sections.flatMap((section) => section.fieldKeys));
    expect(keys).toEqual(["first_name", "last_name", "contact_mailing_address"]);
    expect(next.columns[0].sections.find((s) => s.id === "applicant")).toBeUndefined();
  });

});
