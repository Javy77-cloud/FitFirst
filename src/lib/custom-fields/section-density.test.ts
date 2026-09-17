import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { addSection, duplicateSection, setSectionDensity } from "./layout";
import {
  compactRowClass,
  groupSectionFieldRows,
  isCompactLayoutField,
  layoutFieldKind,
  sectionFieldGridClass,
} from "./section-density";
import {
  DEFAULT_SECTION_DENSITY,
  parseLayout,
  parseSectionDensity,
  sectionDensityOf,
  withLayoutRevision,
  AGENCY_LAYOUT_REVISION,
} from "./types";

describe("section density schema", () => {
  it("defaults missing density to 2 and persists 1/2/3 through parse + revision", () => {
    expect(DEFAULT_SECTION_DENSITY).toBe(2);
    expect(parseSectionDensity(undefined)).toBeUndefined();
    expect(parseSectionDensity("3")).toBe(3);
    expect(parseSectionDensity(9)).toBeUndefined();
    expect(sectionDensityOf({})).toBe(2);
    expect(sectionDensityOf({ density: 1 })).toBe(1);

    const saved = parseLayout({
      columns: [
        {
          id: "left",
          sections: [{ id: "contact", label: "Contact", fieldKeys: ["first_name"], density: 3 }],
        },
        { id: "right", sections: [{ id: "notes", label: "Notes", fieldKeys: ["notes"] }] },
      ],
    });
    const stamped = withLayoutRevision(saved, AGENCY_LAYOUT_REVISION);
    const reloaded = parseLayout(JSON.parse(JSON.stringify(stamped)));
    expect(reloaded.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(reloaded.columns[0].sections[0]?.density).toBe(3);
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
    expect(layoutFieldKind("mailing_address", { type: "address" })).toBe("wide");
    expect(layoutFieldKind("notes", { type: "multi_line" })).toBe("wide");
    expect(layoutFieldKind("insurance_type")).toBe("wide");

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
      { keys: ["city", "state", "zip"], kind: "compact" },
      { keys: ["county"], kind: "compact" },
      { keys: ["first_name"], kind: "standard" },
      { keys: ["applicant_gender", "applicant_marital_status"], kind: "compact" },
      { keys: ["notes"], kind: "wide" },
    ]);
  });

  it("uses a 2-col grid by default and avoids a literal grid-cols-3 class", () => {
    expect(sectionFieldGridClass(2)).toMatch(/grid-cols-2/);
    expect(sectionFieldGridClass(2)).toMatch(/max-\[699px\]:grid-cols-1/);
    expect(sectionFieldGridClass(3, { collapse: false })).toMatch(/repeat\(3,minmax\(0,1fr\)\)/);
    expect(sectionFieldGridClass(3, { collapse: false })).not.toMatch(/grid-cols-3/);
    expect(sectionFieldGridClass(3, { collapse: false })).not.toMatch(/max-\[699px\]/);
    expect(compactRowClass(3)).toMatch(/repeat\(3,minmax\(0,1fr\)\)/);
    expect(compactRowClass(3)).not.toMatch(/grid-cols-3/);
  });
});

function allKeys(layout: ReturnType<typeof parseLayout>): string[] {
  return layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
}

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
    expect(html).toMatch(/data-ff-compact-row/);
    expect(html).toMatch(/data-ff-record-field="city"/);
  });
});
