import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLayoutForModule, FIELD_LAYOUT_MODULES } from "./modules";
import {
  layoutContentScore,
  layoutHasFields,
  pickSavedModuleLayout,
  resolveLayoutFields,
} from "./resolve-layout";
import { emptyLayout, parseLayout } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const leadLayout = defaultLayoutForModule("leads");
const dealLayout = defaultLayoutForModule("deals");

describe("sep7bz open existing layout + live form matches builder", () => {
  it("parses saved layouts stored as FieldLayout, bare columns, or JSON", () => {
    expect(parseLayout(leadLayout).columns[0].sections[0].fieldKeys).toContain("first_name");
    expect(parseLayout(leadLayout.columns).columns[1].sections[0].fieldKeys).toEqual(["source", "notes"]);
    expect(parseLayout(JSON.stringify(leadLayout)).columns[0].sections[0].id).toBe("contact");
    expect(parseLayout({ columns: leadLayout }).columns[0].sections[0].label).toBe("Contact");
    expect(layoutHasFields(parseLayout(null))).toBe(false);
    expect(layoutContentScore(emptyLayout())).toBe(0);
    expect(layoutContentScore(leadLayout)).toBeGreaterThan(0);
  });

  it("picks the populated saved layout and ignores a blank sibling row", () => {
    const blank = { lineOfBusiness: "ALL", columns: emptyLayout(), updatedAt: new Date("2026-09-07") };
    const saved = {
      lineOfBusiness: "HO",
      columns: leadLayout,
      updatedAt: new Date("2026-01-01"),
    };
    expect(pickSavedModuleLayout([blank, saved], "leads", "ALL")).toEqual(parseLayout(leadLayout));
    expect(pickSavedModuleLayout([blank], "leads")).toBeNull();
    expect(pickSavedModuleLayout([], "leads")).toBeNull();
    expect(pickSavedModuleLayout([{ lineOfBusiness: "AUTO", columns: dealLayout }], "deals", "HO")).toEqual(
      parseLayout(dealLayout),
    );
  });

  it("hydrates missing catalog rows so saved field keys still render", () => {
    const fields = resolveLayoutFields(leadLayout, []);
    expect(fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(["first_name", "last_name", "email", "phone", "source", "notes"]),
    );
    expect(fields.find((field) => field.key === "first_name")?.label).toBe("First Name");
  });

  it("loads any existing module layout and remounts the builder per module", () => {
    const store = source("src/lib/custom-fields/store.ts");
    expect(store).toMatch(/pickSavedModuleLayout/);
    expect(store).toMatch(/loadSavedLayoutRows/);
    expect(store).toMatch(/if \(rows\.length === 0\)/);
    expect(store).not.toMatch(/if \(module === "deals"\) return loadLayoutForLine/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/key=\{module\}/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/resolveLayoutFields/);
    expect(source("src/components/custom-fields/field-builder.tsx")).toMatch(/data-ff-existing-layout/);
    expect(source("src/components/custom-fields/field-builder.tsx")).toMatch(/humanizeFieldKey/);
    expect(source("src/components/custom-fields/field-builder.tsx")).not.toMatch(/if \(!field\) return null/);
  });

  it("renders the saved module layout on each CRM record form", () => {
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/loadLayoutForModule\("deals"\)/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/loadLayoutForLine\(deal\.lineOfBusiness\)/);
    expect(source("src/app/leads/[id]/page.tsx")).toMatch(/loadModuleLayoutBundle\("leads"/);
    expect(source("src/app/leads/[id]/page.tsx")).toMatch(/RecordLayoutFields/);
    expect(source("src/app/contacts/[id]/page.tsx")).toMatch(/loadModuleLayoutBundle\("contacts"/);
    expect(source("src/app/accounts/[id]/page.tsx")).toMatch(/loadModuleLayoutBundle\("businesses"/);
    expect(source("src/app/policies/[id]/page.tsx")).toMatch(/loadModuleLayoutBundle\("policies"/);
    expect(source("src/app/carriers/[id]/page.tsx")).toMatch(/loadModuleLayoutBundle\("carriers"/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveModuleRecordValues/);
    expect(source("src/components/custom-fields/record-layout-form.tsx")).toMatch(/data-ff-record-layout=\{module\}/);
    for (const module of FIELD_LAYOUT_MODULES) {
      expect(defaultLayoutForModule(module).columns).toHaveLength(2);
    }
  });
});
