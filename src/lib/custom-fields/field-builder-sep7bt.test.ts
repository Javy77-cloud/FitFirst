import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTACT_IDENTITY_FIELD_KEYS } from "./applicant-fields";
import { defaultLayoutForLine } from "./defaults";
import {
  applyResolvedFieldDrop,
  columnIdFromHitStack,
  moveField,
  resolveFieldDrop,
  resolveSectionDrop,
} from "./layout";
import { FIELD_ROW_MENU_ITEMS } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const contact = {
  id: "contact",
  top: 0,
  height: 200,
  fields: [
    { key: "first_name", top: 40, height: 32 },
    { key: "last_name", top: 80, height: 32 },
    { key: "email", top: 120, height: 32 },
    { key: "phone", top: 160, height: 32 },
  ],
};

const address = {
  id: "address",
  top: 220,
  height: 200,
  fields: [
    { key: "mailing_address", top: 260, height: 32 },
    { key: "city", top: 300, height: 32 },
    { key: "state", top: 340, height: 32 },
    { key: "zip", top: 380, height: 32 },
  ],
};

describe("sep7bt field builder drag across sections", () => {
  it("keeps collapsed rows, compact palette, and the four-item menu", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-row="collapsed"/);
    expect(builder).toMatch(/data-ff-palette-compact/);
    expect(builder).toMatch(/data-ff-palette-chip="compact"/);
    for (const item of FIELD_ROW_MENU_ITEMS) {
      expect(builder).toMatch(item);
    }
    expect(builder).toMatch(/data-ff-page-layout/);
    expect(builder).toMatch(/including in Preview/);
  });

  it("lets fields drag independently of sections and shows a drop target", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-drop-line/);
    expect(builder).toMatch(/data-ff-drop-section/);
    expect(builder).toMatch(/data-ff-section-handle/);
    expect(builder).toMatch(/data-ff-field-handle/);
    expect(builder).toMatch(/data-ff-drag-ghost/);
    expect(builder).toMatch(/beginPointerDrag/);
    expect(builder).toMatch(/GripVertical/);
    expect(builder).toMatch(/event\.stopPropagation\(\)/);
    expect(builder).toMatch(/resolveFieldDrop/);
    expect(builder).toMatch(/kind: "field"/);
    expect(builder).not.toMatch(/draggable=\{!preview\}/);
    expect(builder).not.toMatch(/if \(!drag \|\| preview\) return/);
  });

  it("reorders a field within a section from pointer position", () => {
    expect(resolveFieldDrop(85, [contact, address])).toEqual({
      sectionId: "contact",
      beforeKey: "last_name",
    });
    expect(resolveFieldDrop(150, [contact, address])).toEqual({
      sectionId: "contact",
      beforeKey: "phone",
    });
    const start = defaultLayoutForLine("HO");
    const moved = applyResolvedFieldDrop(start, "phone", "left", 50, [contact, address]);
    expect(moved.columns[0].sections[0].fieldKeys).toEqual([
      "entity_type",
      "phone",
      "first_name",
      "middle_name",
      "last_name",
      "date_of_birth",
      "email",
      "epolicy",
    ]);
    expect(moved.columns[0].sections.find((section) => section.id === "insured_address")?.fieldKeys).toEqual(
      start.columns[0].sections.find((section) => section.id === "insured_address")?.fieldKeys,
    );
  });

  it("moves a field into another section or column and keeps drop-on-self a no-op", () => {
    expect(resolveFieldDrop(190, [contact, address])).toEqual({ sectionId: "contact" });
    expect(resolveFieldDrop(310, [contact, address])).toEqual({
      sectionId: "address",
      beforeKey: "city",
    });
    expect(resolveFieldDrop(470, [contact, address, { id: "extra", top: 440, height: 80, fields: [] }])).toEqual({
      sectionId: "extra",
    });

    const start = defaultLayoutForLine("HO");
    const crossed = applyResolvedFieldDrop(start, "email", "right", 310, [
      {
        id: "mailing_address",
        top: 220,
        height: 200,
        fields: [
          { key: "contact_mailing_address", top: 260, height: 32 },
          { key: "contact_mailing_city", top: 300, height: 32 },
          { key: "contact_mailing_state", top: 340, height: 32 },
          { key: "contact_mailing_zip", top: 380, height: 32 },
        ],
      },
    ]);
    expect(crossed.columns[0].sections[0].fieldKeys).toEqual([
      "entity_type",
      "first_name",
      "middle_name",
      "last_name",
      "date_of_birth",
      "phone",
      "epolicy",
    ]);
    const mailing = crossed.columns[1].sections.find((section) => section.id === "mailing_address");
    expect(mailing?.fieldKeys.slice(0, 4)).toEqual([
      "contact_mailing_address",
      "contact_mailing_unit",
      "email",
      "contact_mailing_city",
    ]);

    const self = moveField(start, "email", {
      columnId: "left",
      sectionId: "contact",
      beforeKey: "email",
    });
    expect(self.columns[0].sections[0].fieldKeys).toEqual([...CONTACT_IDENTITY_FIELD_KEYS]);

    const saved = JSON.parse(JSON.stringify(crossed)) as typeof crossed;
    expect(
      saved.columns[1].sections.find((section) => section.id === "mailing_address")?.fieldKeys,
    ).toContain("email");
  });

  it("reads the column under the pointer while skipping the dragged row", () => {
    const dragging = {
      closest: (sel: string) => (sel === "[data-ff-dragging]" ? dragging : null),
    };
    const column = {
      closest: (sel: string) => (sel === "[data-ff-builder-col]" ? column : null),
      getAttribute: (name: string) => (name === "data-ff-builder-col" ? "right" : null),
    };
    expect(columnIdFromHitStack([dragging, column])).toBe("right");
    expect(columnIdFromHitStack([dragging])).toBeNull();
  });

  it("places a dragged section by pointer without taking field drops", () => {
    expect(
      resolveSectionDrop(20, [
        { id: "contact", top: 0, height: 100 },
        { id: "extra", top: 120, height: 100 },
      ]),
    ).toEqual({ beforeSectionId: "contact" });
    expect(
      resolveSectionDrop(80, [
        { id: "contact", top: 0, height: 100 },
        { id: "extra", top: 120, height: 100 },
      ]),
    ).toEqual({ beforeSectionId: "extra" });
    expect(
      resolveFieldDrop(85, [contact, address], { draggingKey: "last_name" }).beforeKey,
    ).toBe("email");
  });
});
