import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { SectionDensityControl } from "@/components/custom-fields/section-density-control";
import { addSection, duplicateSection, setSectionDensity } from "./layout";
import {
  compactRowClass,
  groupSectionFieldRows,
  isCompactLayoutField,
  isStreetAddressFieldKey,
  isTrueAddressFieldKey,
  layoutFieldKind,
  propertyAddressRun,
  readRenderedColumnCount,
  sectionFieldGridClass,
  sectionFieldGridVars,
  sectionGridTemplate,
} from "./section-density";
import {
  DEFAULT_SECTION_DENSITY,
  SECTION_DENSITIES,
  parseLayout,
  parseSectionDensity,
  sectionDensityOf,
  withLayoutRevision,
  AGENCY_LAYOUT_REVISION,
} from "./types";

describe("section density schema", () => {
  it("defaults missing density to 2 and persists 1–5 through parse + revision", () => {
    expect(DEFAULT_SECTION_DENSITY).toBe(2);
    expect(SECTION_DENSITIES).toEqual([1, 2, 3, 4, 5]);
    expect(parseSectionDensity(undefined)).toBeUndefined();
    expect(parseSectionDensity("3")).toBe(3);
    expect(parseSectionDensity(4)).toBe(4);
    expect(parseSectionDensity("5")).toBe(5);
    expect(parseSectionDensity(9)).toBeUndefined();
    expect(sectionDensityOf({})).toBe(2);
    expect(sectionDensityOf({ density: 1 })).toBe(1);
    expect(sectionDensityOf({ density: 5 })).toBe(5);

    const saved = parseLayout({
      columns: [
        {
          id: "left",
          sections: [{ id: "contact", label: "Contact", fieldKeys: ["first_name"], density: 4 }],
        },
        { id: "right", sections: [{ id: "notes", label: "Notes", fieldKeys: ["notes"] }] },
      ],
    });
    const stamped = withLayoutRevision(saved, AGENCY_LAYOUT_REVISION);
    const reloaded = parseLayout(JSON.parse(JSON.stringify(stamped)));
    expect(reloaded.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(reloaded.columns[0].sections[0]?.density).toBe(4);
    expect(reloaded.columns[1].sections[0]?.density).toBeUndefined();
    expect(sectionDensityOf(reloaded.columns[1].sections[0]!)).toBe(2);
    expect(allKeys(reloaded)).toEqual(["first_name", "notes"]);
  });

  it("copies density on duplicate and sets 2 on new sections", () => {
    const start = parseLayout({
      columns: [
        { id: "left", sections: [{ id: "contact", label: "Contact", fieldKeys: ["email"], density: 1 }] },
        { id: "right", sections: [] },
      ],
    });
    const denser = setSectionDensity(start, "contact", 3);
    expect(denser.columns[0].sections[0]?.density).toBe(3);
    const copy = duplicateSection(denser, "contact");
    expect(copy.columns[0].sections.map((section) => section.density)).toEqual([3, 3]);
    const added = addSection(copy, "right", "Extra");
    expect(added.columns[1].sections.at(-1)?.density).toBe(2);
    expect(setSectionDensity(start, "contact", 5).columns[0].sections[0]?.density).toBe(5);

    const control = renderToStaticMarkup(
      createElement(SectionDensityControl, {
        sectionId: "contact",
        density: 4,
        onChange: () => undefined,
      }),
    );
    expect(control).toMatch(/data-ff-density-choice="1"/);
    expect(control).toMatch(/data-ff-density-choice="2"/);
    expect(control).toMatch(/data-ff-density-choice="3"/);
    expect(control).toMatch(/data-ff-density-choice="4"/);
    expect(control).toMatch(/data-ff-density-choice="5"/);
    expect(control).toMatch(/aria-pressed="true"[^>]*data-ff-density-choice="4"|data-ff-density-choice="4"[^>]*aria-pressed="true"/);
  });
});

describe("section field packing", () => {
  it("packs city/state/zip and DOB/gender/marital, and stretches notes/address", () => {
    expect(isCompactLayoutField("city")).toBe(true);
    expect(isCompactLayoutField("contact_mailing_zip")).toBe(true);
    expect(isCompactLayoutField("applicant_gender")).toBe(true);
    expect(isCompactLayoutField("date_of_birth")).toBe(true);
    expect(isCompactLayoutField("lived_at_address_5_years", { type: "picklist", options: ["Yes", "No"] })).toBe(
      true,
    );
    expect(isCompactLayoutField("military_discount", { type: "checkbox" })).toBe(true);
    expect(isCompactLayoutField("first_name")).toBe(false);
    expect(isCompactLayoutField("year_built")).toBe(true);
    expect(isCompactLayoutField("roof_year")).toBe(true);
    expect(isCompactLayoutField("stories")).toBe(true);
    expect(isTrueAddressFieldKey("address1")).toBe(true);
    expect(isTrueAddressFieldKey("mailing_address")).toBe(true);
    expect(isTrueAddressFieldKey("garaging_address")).toBe(true);
    expect(isTrueAddressFieldKey("prior_address")).toBe(false);
    expect(isTrueAddressFieldKey("years_at_address")).toBe(false);
    expect(isTrueAddressFieldKey("address_same_6_months")).toBe(false);
    expect(layoutFieldKind("mailing_address", { type: "address" })).toBe("wide");
    expect(layoutFieldKind("prior_address")).toBe("standard");
    expect(layoutFieldKind("notes", { type: "multi_line" })).toBe("wide");
    expect(layoutFieldKind("insurance_type")).toBe("wide");
    expect(layoutFieldKind("email")).toBe("wide");
    expect(layoutFieldKind("co_applicant_email")).toBe("wide");

    const rows = groupSectionFieldRows(
      [
        "mailing_address",
        "mailing_unit",
        "city",
        "state",
        "zip",
        "county",
        "first_name",
        "applicant_gender",
        "applicant_marital_status",
        "notes",
      ],
      (key) => {
        if (key === "mailing_address") return { type: "address" };
        if (key === "notes") return { type: "multi_line" };
        return { type: "single_line" };
      },
    );
    expect(rows).toEqual([
      { keys: ["mailing_address"], kind: "wide" },
      { keys: ["mailing_unit"], kind: "compact" },
      { keys: ["city"], kind: "compact" },
      { keys: ["state"], kind: "compact" },
      { keys: ["zip"], kind: "compact" },
      { keys: ["county"], kind: "compact" },
      { keys: ["first_name"], kind: "standard" },
      { keys: ["applicant_gender"], kind: "compact" },
      { keys: ["applicant_marital_status"], kind: "compact" },
      { keys: ["notes"], kind: "wide" },
    ]);
    expect(rows.every((row) => row.keys.length === 1)).toBe(true);
  });

  it("uses standard grid-cols-1 through grid-cols-5 class names", () => {
    expect(sectionFieldGridClass(2)).toMatch(/grid-cols-2/);
    expect(sectionFieldGridClass(2)).toMatch(/max-\[699px\]:grid-cols-1/);
    expect(sectionFieldGridClass(3, { collapse: false })).toMatch(/grid-cols-3/);
    expect(sectionFieldGridClass(3, { collapse: false })).not.toMatch(/max-\[699px\]/);
    expect(sectionFieldGridClass(4, { collapse: false })).toMatch(/grid-cols-4/);
    expect(sectionFieldGridClass(5, { collapse: false })).toMatch(/grid-cols-5/);
    expect(sectionGridTemplate(4)).toBe("repeat(4, minmax(0, 1fr))");
    expect(sectionGridTemplate(5)).toBe("repeat(5, minmax(0, 1fr))");
    expect(sectionFieldGridClass(3, { collapse: false })).not.toEqual(
      sectionFieldGridClass(4, { collapse: false }),
    );
    expect(sectionFieldGridClass(4, { collapse: false })).not.toEqual(
      sectionFieldGridClass(5, { collapse: false }),
    );
    expect(compactRowClass(3)).toMatch(/grid-cols-3/);
    expect(compactRowClass(4)).toMatch(/grid-cols-4/);
    expect(compactRowClass(5)).toMatch(/grid-cols-5/);
    expect(compactRowClass(4)).not.toEqual(compactRowClass(5));
  });

  it("keeps grid-cols-4 and grid-cols-5 as complete source strings", () => {
    const src = readFileSync("src/lib/custom-fields/section-density.ts", "utf8");
    expect(src).toMatch(/"grid grid-cols-3 /);
    expect(src).toMatch(/"grid grid-cols-4 /);
    expect(src).toMatch(/"grid grid-cols-5 /);
    expect(src).not.toMatch(/grid-cols-\[repeat\(\$\{/);
  });

  it("packs property address + city + state + zip + county on one 5-col row", () => {
    expect(isStreetAddressFieldKey("address1")).toBe(true);
    expect(isStreetAddressFieldKey("mailing_address")).toBe(false);
    expect(
      propertyAddressRun(["address1", "city", "state", "zip", "county", "mailing_address"], 0, 5),
    ).toEqual(["address1", "city", "state", "zip", "county"]);
    expect(propertyAddressRun(["address1", "city", "state", "zip"], 0, 3)).toBeNull();

    const keys = ["address1", "city", "state", "zip", "county", "mailing_address", "year_built", "stories", "beds"];
    const fieldOf = (key: string) => {
      if (key === "address1" || key === "mailing_address") return { type: "address" as const };
      return { type: "single_line" as const };
    };
    const rows = groupSectionFieldRows(keys, fieldOf, 5);
    expect(rows.map((row) => row.keys)).toEqual(keys.map((key) => [key]));
    expect(rows[0]).toEqual({ keys: ["address1"], kind: "standard" });
    expect(rows[5]).toEqual({ keys: ["mailing_address"], kind: "wide" });
    expect(rows.slice(6).map((row) => row.kind)).toEqual(["compact", "compact", "compact"]);

    const html = renderToStaticMarkup(
      createElement(LayoutSectionFieldGrid, {
        density: 5,
        keys,
        fieldOf,
        renderField: (key) => createElement("span", { "data-ff-cell": key }, key),
        collapse: false,
      }),
    );
    expect(readRenderedColumnCount(html)).toBe(5);
    expect(html).toMatch(/grid-cols-5/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).toMatch(/data-ff-field-span="1"[^>]*><span data-ff-cell="address1"/);
    expect(html).not.toMatch(/data-ff-field-span="full"[^>]*><span data-ff-cell="address1"/);
    expect(html).toMatch(/data-ff-field-span="full"[^>]*><span data-ff-cell="mailing_address"/);
  });

  it("changes grid column classes and styles from 3 to 4 to 5 on a short-field section", () => {
    const keys = ["year_built", "stories", "beds", "baths", "square_feet"];
    const fieldOf = () => ({ type: "single_line" as const });
    const html = [3, 4, 5].map((density) =>
      renderToStaticMarkup(
        createElement(LayoutSectionFieldGrid, {
          density,
          keys,
          fieldOf,
          renderField: (key) => createElement("span", { "data-ff-cell": key }, key),
          collapse: false,
        }),
      ),
    );
    const [html3, html4, html5] = html;

    expect(sectionFieldGridVars(3).gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(sectionFieldGridVars(4).gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    expect(sectionFieldGridVars(5).gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");

    expect(readRenderedColumnCount(html3)).toBe(3);
    expect(readRenderedColumnCount(html4)).toBe(4);
    expect(readRenderedColumnCount(html5)).toBe(5);
    expect(readRenderedColumnCount(html4)).not.toBe(3);
    expect(readRenderedColumnCount(html5)).not.toBe(3);
    expect(readRenderedColumnCount(html5)).not.toBe(4);

    expect(html3).toMatch(/data-ff-section-density="3"/);
    expect(html4).toMatch(/data-ff-section-density="4"/);
    expect(html5).toMatch(/data-ff-section-density="5"/);
    expect(html3).toMatch(/grid-cols-3/);
    expect(html4).toMatch(/grid-cols-4/);
    expect(html5).toMatch(/grid-cols-5/);
    expect(html4).not.toMatch(/grid-cols-3/);
    expect(html5).not.toMatch(/grid-cols-3/);
    expect(html5).not.toMatch(/grid-cols-4/);
    expect(html3).toMatch(/grid-template-columns:repeat\(3/);
    expect(html4).toMatch(/grid-template-columns:repeat\(4/);
    expect(html5).toMatch(/grid-template-columns:repeat\(5/);
    expect(html3).not.toEqual(html4);
    expect(html4).not.toEqual(html5);
    expect(html4).not.toMatch(/data-ff-compact-row/);
    expect(html5).not.toMatch(/data-ff-compact-row/);
    expect(html4).not.toMatch(/col-span-full/);
    expect(html5).not.toMatch(/col-span-full/);

    expect(groupSectionFieldRows(keys, fieldOf, 4).map((row) => row.keys[0])).toEqual(keys);
    expect(groupSectionFieldRows(keys, fieldOf, 5).map((row) => row.keys[0])).toEqual(keys);
    expect(groupSectionFieldRows(keys, fieldOf, 4).every((row) => row.keys.length === 1)).toBe(true);
  });

  it("fails if selecting 4 yields anything other than 4 columns (same for 5)", () => {
    const keys = ["year_built", "stories", "beds", "baths", "square_feet"];
    const fieldOf = () => ({ type: "single_line" as const });
    for (const density of [4, 5] as const) {
      const html = renderToStaticMarkup(
        createElement(LayoutSectionFieldGrid, {
          density,
          keys,
          fieldOf,
          renderField: (key) => createElement("span", { "data-ff-cell": key }, key),
          collapse: false,
        }),
      );
      expect(readRenderedColumnCount(html), `Columns ${density}`).toBe(density);
      expect(html).toMatch(new RegExp(`data-ff-section-density="${density}"`));
      expect(html).toMatch(new RegExp(`grid-cols-${density}`));
      expect(html).toMatch(new RegExp(`grid-template-columns:repeat\\(${density}`));
      expect(html).not.toMatch(/data-ff-section-density="3"/);
      expect(html).not.toMatch(/grid-cols-3/);
      expect(html).not.toMatch(/data-ff-compact-row/);
      expect(html).not.toMatch(/col-span-full/);
      const packed = groupSectionFieldRows(keys, fieldOf, density);
      expect(packed.every((row) => row.keys.length === 1), `one cell each at ${density}`).toBe(true);
      expect(packed.map((row) => row.keys[0])).toEqual(keys);
    }
  });

  it("packs Residence-like four keys into one CSS row at density 4", () => {
    const keys = ["own_rent", "years_at_address", "address_same_6_months", "prior_address"];
    const fieldOf = (key: string) => {
      if (key === "own_rent") return { type: "picklist" as const, options: ["Own", "Rent"] };
      if (key === "address_same_6_months") return { type: "picklist" as const, options: ["Yes", "No"] };
      return { type: "single_line" as const };
    };
    const packed = groupSectionFieldRows(keys, fieldOf, 4);
    expect(packed.map((row) => row.keys)).toEqual(keys.map((key) => [key]));
    expect(packed.every((row) => row.kind !== "wide")).toBe(true);

    const html = renderToStaticMarkup(
      createElement(LayoutSectionFieldGrid, {
        density: 4,
        keys,
        fieldOf,
        renderField: (key) => createElement("span", { "data-ff-cell": key }, key),
        collapse: false,
      }),
    );
    expect(readRenderedColumnCount(html)).toBe(4);
    expect(html).toMatch(/grid-cols-4/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/col-span-full/);
    for (const key of keys) {
      expect(html).toMatch(new RegExp(`data-ff-cell="${key}"`));
    }
  });

  it("does not isolate Drivers name then nest DOB+gender on a full-width row", () => {
    const keys = ["name", "dob", "gender", "occupation", "license"];
    const fieldOf = (key: string) => {
      if (key === "gender") return { type: "picklist" as const, options: ["Male", "Female"] };
      if (key === "dob") return { type: "dob" as const };
      return { type: "single_line" as const };
    };
    const packed = groupSectionFieldRows(keys, fieldOf, 5);
    expect(packed.map((row) => row.keys)).toEqual(keys.map((key) => [key]));
    expect(packed.find((row) => row.keys.includes("name"))?.kind).toBe("standard");
    expect(packed.find((row) => row.keys.includes("dob"))?.kind).toBe("compact");
    expect(packed.find((row) => row.keys.includes("gender"))?.kind).toBe("compact");

    const html = renderToStaticMarkup(
      createElement(LayoutSectionFieldGrid, {
        density: 5,
        keys,
        fieldOf,
        renderField: (key) => createElement("span", { "data-ff-cell": key }, key),
        collapse: false,
      }),
    );
    expect(readRenderedColumnCount(html)).toBe(5);
    expect(html).toMatch(/grid-cols-5/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/col-span-full/);
    const nameAt = html.indexOf('data-ff-cell="name"');
    const dobAt = html.indexOf('data-ff-cell="dob"');
    const genderAt = html.indexOf('data-ff-cell="gender"');
    expect(nameAt).toBeGreaterThan(-1);
    expect(dobAt).toBeGreaterThan(nameAt);
    expect(genderAt).toBeGreaterThan(dobAt);
  });
});

function allKeys(layout: ReturnType<typeof parseLayout>): string[] {
  return layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
}


describe("contact desk density (sketch v4)", () => {
  const desk = { contactDesk: true as const };

  it("keeps email standard on contact desk so it shares the phones row", () => {
    expect(layoutFieldKind("email")).toBe("wide");
    expect(layoutFieldKind("email", { type: "single_line" }, desk)).toBe("standard");
    expect(layoutFieldKind("co_applicant_email")).toBe("wide");
    expect(layoutFieldKind("co_applicant_email", undefined, desk)).toBe("standard");
    const rows = groupSectionFieldRows(
      ["date_of_birth", "phone", "secondary_phone", "email"],
      () => ({ type: "single_line" as const }),
      4,
      desk,
    );
    expect(rows.every((row) => row.kind !== "wide")).toBe(true);
    expect(rows.map((row) => row.keys[0])).toEqual([
      "date_of_birth",
      "phone",
      "secondary_phone",
      "email",
    ]);
  });

  it("treats contact mailing_address as street span-2; contact_mailing_* stay out of the run", () => {
    expect(isStreetAddressFieldKey("mailing_address")).toBe(false);
    expect(isStreetAddressFieldKey("mailing_address", desk)).toBe(true);
    expect(isStreetAddressFieldKey("contact_mailing_address", desk)).toBe(false);
    expect(
      propertyAddressRun(["mailing_address", "city", "state", "zip"], 0, 4, desk),
    ).toEqual(["mailing_address", "city", "state", "zip"]);
    expect(propertyAddressRun(["mailing_address", "city", "state", "zip"], 0, 4)).toBeNull();

    const rows = groupSectionFieldRows(
      ["mailing_address", "city", "state", "zip"],
      (key) => (key === "mailing_address" ? { type: "address" as const } : { type: "single_line" as const }),
      4,
      desk,
    );
    expect(rows[0]).toMatchObject({ keys: ["mailing_address"], kind: "standard", span: 2 });
    expect(rows.slice(1).every((row) => row.kind === "standard" && !row.span)).toBe(true);
  });

  it("uses equal standard cells for prefs (no compact strips) on contact desk", () => {
    const keys = ["preferred_language", "marital_status", "occupation", "gender"];
    const packed = groupSectionFieldRows(keys, () => ({ type: "single_line" as const }), 4, desk);
    expect(packed.every((row) => row.kind === "standard")).toBe(true);
    expect(isCompactLayoutField("marital_status")).toBe(true);
    expect(layoutFieldKind("marital_status", undefined, desk)).toBe("standard");

    const html = renderToStaticMarkup(
      createElement(LayoutSectionFieldGrid, {
        density: 4,
        keys,
        contactDesk: true,
        fieldOf: () => ({ type: "single_line" as const }),
        renderField: (key: string) => createElement("span", { "data-ff-cell": key }, key),
        collapse: false,
      }),
    );
    expect(html).toMatch(/data-ff-contact-desk="1"/);
    expect(html).not.toMatch(/col-span-full/);
    expect(readRenderedColumnCount(html)).toBe(4);
  });

  it("spans spouse_name across two columns on contact desk", () => {
    const rows = groupSectionFieldRows(
      ["spouse_name", "spouse_dob", "spouse_link"],
      () => ({ type: "single_line" as const }),
      4,
      desk,
    );
    expect(rows[0]).toMatchObject({ keys: ["spouse_name"], span: 2, kind: "standard" });
  });
});

describe("shared layout engine wiring", () => {
  it("uses one header + density grid on Deal Details, record forms, and the builder", () => {
    const files = [
      "src/components/custom-fields/deal-details-panel.tsx",
      "src/components/custom-fields/record-layout-form.tsx",
      "src/components/custom-fields/field-builder.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/LayoutSectionHeader/);
      expect(src).toMatch(/LayoutSectionFieldGrid/);
      expect(src).not.toMatch(/Asked once/);
      expect(src).not.toMatch(/data-ff-shared-once/);
    }
    expect(readFileSync("src/components/custom-fields/field-builder.tsx", "utf8")).toMatch(
      /SectionDensityControl/,
    );
    expect(readFileSync("src/app/settings/field-builder/page.tsx", "utf8")).not.toMatch(
      /Compact field-type chips/,
    );
  });

  it("renders RecordLayoutFields with a 2-col section grid and centered titles", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "leads",
        layout: {
          columns: [
            {
              id: "left",
              sections: [
                {
                  id: "contact",
                  label: "Contact",
                  fieldKeys: ["first_name", "last_name", "city", "state", "zip"],
                },
              ],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [
          { key: "first_name", label: "First name", type: "single_line" },
          { key: "last_name", label: "Last name", type: "single_line" },
          { key: "city", label: "City", type: "single_line" },
          { key: "state", label: "State", type: "single_line" },
          { key: "zip", label: "Zip", type: "single_line" },
        ],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-layout-section-header/);
    expect(html).toMatch(/text-center text-lg font-semibold/);
    expect(html).toMatch(/data-ff-section-density="2"/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).toMatch(/data-ff-record-field="city"/);
  });

  it("honors a saved section density of 1 or 3 on the shared renderer", () => {
    const layout = {
      columns: [
        {
          id: "left" as const,
          sections: [
            {
              id: "contact",
              label: "Contact",
              fieldKeys: ["first_name", "last_name"],
              density: 3 as const,
            },
          ],
        },
        {
          id: "right" as const,
          sections: [{ id: "notes", label: "Notes", fieldKeys: ["notes"], density: 1 as const }],
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "contacts",
        layout,
        fields: [
          { key: "first_name", label: "First name", type: "single_line" },
          { key: "last_name", label: "Last name", type: "single_line" },
          { key: "notes", label: "Notes", type: "multi_line" },
        ],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-section-density="3"/);
    expect(html).toMatch(/data-ff-section-density="1"/);
    expect(html).toMatch(/grid-cols-3/);
    expect(html).toMatch(/grid-template-columns:repeat\(3/);
    expect(html).toMatch(/data-ff-record-section="notes"/);
  });
});
