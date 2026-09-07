import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_ADDRESS_KEYS,
  ESSENTIAL_CONTACT_KEYS,
  defaultFieldsForLine,
  defaultLayoutForLine,
} from "./defaults";
import { formatCurrencyDisplay, parseNumericInput } from "./format";
import { evaluateFormula, extractFormulaFields } from "./formula";
import { FIELD_TYPE_ICON_NAMES, iconNameForType } from "./icons";
import { addSection, insertFieldAfter, insertIndexFromClientY, moveField, relabelSection } from "./layout";
import {
  cloneFieldDef,
  MAX_PICKLIST_OPTIONS,
  missingRequiredFields,
  resizePicklistOptions,
  resolveFieldOptions,
  resolvedFieldValue,
} from "./picklists";
import {
  COMMON_CARRIER_OPTIONS,
  LINE_OF_BUSINESS_OPTIONS,
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_CARRIERS,
  STARTER_PICKLIST_LINES,
  STARTER_PICKLIST_US_STATES,
  US_STATE_OPTIONS,
  missingStarterPicklistNames,
} from "./starter-picklists";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, PALETTE_ITEMS, PALETTE_LABELS } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal field builder", () => {
  it("exposes every Javy field type plus Section on a locked three-column builder", () => {
    expect(CUSTOM_FIELD_TYPES).toEqual([
      "single_line",
      "multi_line",
      "email",
      "phone",
      "picklist",
      "multi_select",
      "date",
      "date_time",
      "number",
      "currency",
      "percentage",
      "checkbox",
      "lookup",
      "formula",
      "image",
    ]);
    expect(CUSTOM_FIELD_TYPE_LABELS.image).toBe("Image upload");
    expect(CUSTOM_FIELD_TYPE_LABELS.multi_line).toBe("Notes");
    expect(PALETTE_ITEMS).toContain("section");
    expect(PALETTE_LABELS.section).toBe("Section");
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-builder/);
    expect(builder).toMatch(/data-ff-builder-columns/);
    expect(builder).toMatch(/data-ff-builder-lock="three-col"/);
    expect(builder).toMatch(/grid-cols-\[max-content_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
    expect(builder).toMatch(/items-start/);
    expect(builder).not.toMatch(/grid-cols-3/);
    expect(builder).not.toMatch(/grid-cols-\[1fr_1fr_1fr\]/);
    expect(builder).not.toMatch(/max-\[899px\]:grid-cols-1/);
    expect(builder).not.toMatch(/max-\[699px\]:grid-cols-1/);
    expect(builder).toMatch(/data-ff-builder-palette/);
    expect(builder).toMatch(/data-ff-palette-compact/);
    expect(builder).toMatch(/data-ff-palette-chip="compact"/);
    expect(builder).toMatch(/flex w-max max-w-full cursor-grab/);
    expect(builder).toMatch(/insertIndexFromClientY/);
    expect(builder).toMatch(/Save applies to every deal/);
    expect(builder).not.toMatch(/every \{line\} deal/);
    expect(builder).toMatch(/data-ff-palette-type/);
    expect(builder).toMatch(/data-ff-palette-type=\{type\}/);
    expect(builder).toMatch(/kind: "new-section"/);
    expect(builder).not.toMatch(/>\s*Add section\s*</);
    expect(builder).not.toMatch(/data-ff-add-section/);
    expect(builder).toMatch(/kind: "type"/);
    expect(builder).toMatch(/onDragStart/);
    expect(builder).toMatch(/FormulaBuilder/);
    expect(builder).toMatch(/FieldControl/);
    expect(builder).toMatch(/data-ff-save-layout/);
    expect(builder).toMatch(/\bSave\b/);
    expect(builder).toMatch(/data-ff-section-label/);
    expect(builder).toMatch(/data-ff-field-label/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/FieldBuilder/);
    expect(source("src/app/settings/field-builder/page.tsx")).not.toMatch(/DEAL_LAYOUT_LINES/);
    expect(source("src/app/settings/field-builder/page.tsx")).not.toMatch(/data-ff-builder-lobs/);
    expect(source("src/app/settings/field-builder/page.tsx")).not.toMatch(/Homeowners/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveLayoutForEveryLine/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveDealFieldLayout/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/upsertFieldDef/);
  });

  it("renders each field type as that type — not a text-box fake", () => {
    const control = source("src/components/custom-fields/field-control.tsx");
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(control).toMatch(/data-ff-control-type=\{field.type\}/);
    expect(control).toMatch(/data-ff-currency-input/);
    expect(control).toMatch(/\$/);
    expect(control).toMatch(/data-ff-percent-input/);
    expect(control).toMatch(/>%<\/span>/);
    expect(control).toMatch(/type="checkbox"/);
    expect(control).toMatch(/data-ff-picklist/);
    expect(control).toMatch(/<select/);
    expect(control).toMatch(/\? "email"/);
    expect(control).toMatch(/\? "tel"/);
    expect(control).toMatch(/\? "date"/);
    expect(control).toMatch(/datetime-local/);
    expect(control).toMatch(/data-ff-lookup-input/);
    expect(control).toMatch(/data-ff-image-control/);
    expect(control).toMatch(/Textarea/);
    expect(control).toMatch(/data-ff-single-line/);
    expect(builder).toMatch(/placeNewField/);
    expect(builder).toMatch(/CUSTOM_FIELD_TYPE_LABELS\[type\]/);
    expect(builder).toMatch(/<FieldControl/);
  });

  it("opens a picklist / multi-select config panel and links Settings → Picklists", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    const config = source("src/components/custom-fields/picklist-config.tsx");
    const page = source("src/app/settings/picklists/page.tsx");
    expect(builder).toMatch(/PicklistConfig/);
    expect(builder).toMatch(/data-ff-edit-properties/);
    expect(builder).toMatch(/type === "picklist" \|\| type === "multi_select"/);
    expect(config).toMatch(/data-ff-picklist-config/);
    expect(config).toMatch(/data-ff-option-count/);
    expect(config).toMatch(/data-ff-global-list/);
    expect(config).toMatch(/data-ff-add-option/);
    expect(config).toMatch(/\/settings\/picklists/);
    expect(page).toMatch(/SettingsShell title="Picklists"/);
    expect(page).toMatch(/current="picklists"/);
    expect(page).toMatch(/data-ff-new-picklist/);
    expect(page).toMatch(/data-ff-picklist-name/);
    expect(page).toMatch(/US states/);
    expect(source("src/lib/settings/nav.ts")).toMatch(/"picklists"/);
    expect(source("src/lib/settings/nav.ts")).toMatch(/\/settings\/picklists/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/ensureDefaultFieldPicklists/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/STARTER_FIELD_PICKLISTS/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/listFieldPicklists/);
  });

  it("uses the same icon set on palette, canvas, and settings", () => {
    expect(FIELD_TYPE_ICON_NAMES.single_line).toBe("Type");
    expect(FIELD_TYPE_ICON_NAMES.multi_line).toBe("AlignLeft");
    expect(FIELD_TYPE_ICON_NAMES.email).toBe("Mail");
    expect(FIELD_TYPE_ICON_NAMES.phone).toBe("Phone");
    expect(FIELD_TYPE_ICON_NAMES.picklist).toBe("List");
    expect(FIELD_TYPE_ICON_NAMES.multi_select).toBe("ListChecks");
    expect(FIELD_TYPE_ICON_NAMES.date).toBe("Calendar");
    expect(FIELD_TYPE_ICON_NAMES.currency).toBe("DollarSign");
    expect(FIELD_TYPE_ICON_NAMES.percentage).toBe("Percent");
    expect(FIELD_TYPE_ICON_NAMES.checkbox).toBe("SquareCheck");
    expect(FIELD_TYPE_ICON_NAMES.lookup).toBe("Link");
    expect(FIELD_TYPE_ICON_NAMES.formula).toBe("Sigma");
    expect(FIELD_TYPE_ICON_NAMES.image).toBe("Image");
    expect(FIELD_TYPE_ICON_NAMES.section).toBe("Rows3");
    expect(iconNameForType("email")).toBe("Mail");
    const icon = source("src/components/custom-fields/field-type-icon.tsx");
    expect(icon).toMatch(/data-ff-type-icon=\{type\}/);
    expect(source("src/components/custom-fields/field-builder.tsx")).toMatch(/FieldTypeIcon/);
    expect(source("src/app/settings/picklists/page.tsx")).toMatch(/FieldTypeIcon/);
    for (const type of PALETTE_ITEMS) {
      expect(icon).toMatch(new RegExp(`${type}:`));
    }
  });

  it("persists required and default, and toggles preview", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-required/);
    expect(builder).toMatch(/data-ff-field-default/);
    expect(builder).not.toMatch(/data-ff-duplicate-field/);
    expect(builder).toMatch(/data-ff-preview-toggle/);
    expect(builder).toMatch(/data-ff-builder-preview/);
    expect(builder).toMatch(/data-ff-preview-field/);
    expect(source("src/lib/custom-fields/types.ts")).toMatch(/required\?: boolean/);
    expect(source("src/lib/custom-fields/types.ts")).toMatch(/defaultValue\?:/);
    expect(source("src/components/custom-fields/field-control.tsx")).toMatch(/required=\{required\}/);
    expect(source("src/components/custom-fields/field-control.tsx")).toMatch(/resolvedFieldValue/);
    const field = {
      key: "state",
      label: "State",
      type: "single_line" as const,
      required: true,
      defaultValue: "Florida",
    };
    expect(resolvedFieldValue(field, "")).toBe("Florida");
    expect(resolvedFieldValue(field, "Georgia")).toBe("Georgia");
    expect(missingRequiredFields([field], {})).toHaveLength(1);
    expect(missingRequiredFields([field], { state: "Florida" })).toHaveLength(0);
    const copy = cloneFieldDef(field, ["state"]);
    expect(copy.key).toBe("state_copy");
    expect(copy.label).toBe("State copy");
    expect(copy.defaultValue).toBe("Florida");
  });

  it("resizes picklist options and resolves a global list", () => {
    expect(resizePicklistOptions(["FL", "GA"], 4)).toEqual(["FL", "GA", "", ""]);
    expect(resizePicklistOptions(["FL", "GA", "AL"], 1)).toEqual(["FL"]);
    const field = {
      key: "state",
      label: "State",
      type: "picklist" as const,
      options: ["Custom"],
      picklistId: "list-1",
    };
    expect(resolveFieldOptions(field, [{ id: "list-1", name: "States", options: ["Florida", "Georgia"] }])).toEqual([
      "Florida",
      "Georgia",
    ]);
    expect(MAX_PICKLIST_OPTIONS).toBeGreaterThanOrEqual(US_STATE_OPTIONS.length);
    expect(STARTER_FIELD_PICKLISTS.map((list) => list.name)).toEqual([
      STARTER_PICKLIST_US_STATES,
      STARTER_PICKLIST_LINES,
      STARTER_PICKLIST_CARRIERS,
    ]);
    expect(US_STATE_OPTIONS).toHaveLength(51);
    expect(US_STATE_OPTIONS).toContain("FL — Florida");
    expect(LINE_OF_BUSINESS_OPTIONS).toEqual(expect.arrayContaining(["Home", "Auto", "Flood", "Homeowners"]));
    expect(COMMON_CARRIER_OPTIONS).toEqual(expect.arrayContaining(["Tailrow", "Progressive", "Citizens"]));
    expect(missingStarterPicklistNames([])).toEqual([...STARTER_FIELD_PICKLISTS.map((list) => list.name)]);
    expect(missingStarterPicklistNames(["US states", "Lines of business", "Common carriers"])).toEqual([]);
    expect(formatCurrencyDisplay("321000")).toBe("321,000.00");
    expect(parseNumericInput("$321,000.00")).toBe("321000");
  });

  it("defaults every line of business to Contact essentials + Address only", () => {
    const home = defaultLayoutForLine("HO");
    const salon = defaultLayoutForLine("GL");
    expect(home.columns).toHaveLength(2);
    expect(salon.columns).toHaveLength(2);
    const homeKeys = home.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    const salonKeys = salon.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    expect(homeKeys).toEqual([...ESSENTIAL_CONTACT_KEYS, ...ESSENTIAL_ADDRESS_KEYS]);
    expect(salonKeys).toEqual(homeKeys);
    expect(homeKeys).not.toContain("roof_year");
    expect(homeKeys).not.toContain("occupancy");
    expect(home.columns[0].sections.map((section) => section.label)).toEqual(["Contact"]);
    expect(home.columns[1].sections.map((section) => section.label)).toEqual(["Address"]);
  });

  it("keeps LOB field catalogs so the builder can add them later", () => {
    expect(defaultFieldsForLine("HO").map((field) => field.key)).toEqual(
      expect.arrayContaining(["roof_year", "coverage_a", "roof_photo"]),
    );
    expect(defaultFieldsForLine("GL").map((field) => field.key)).toEqual(
      expect.arrayContaining(["legal_name", "class_code", "occupancy"]),
    );
    expect(defaultFieldsForLine("HO").some((field) => field.type === "formula")).toBe(true);
    expect(defaultFieldsForLine("HO").some((field) => field.type === "image")).toBe(true);
  });

  it("evaluates simple math and field references", () => {
    expect(evaluateFormula("coverage_a * 0.1", { coverage_a: "321000" })).toEqual({
      ok: true,
      value: 32100,
    });
    expect(evaluateFormula("{roof_year} + 1", { roof_year: 2018 })).toEqual({ ok: true, value: 2019 });
    expect(evaluateFormula("(10 + 2) / 4", {})).toEqual({ ok: true, value: 3 });
    expect(evaluateFormula("10 / 0", {}).ok).toBe(false);
    expect(extractFormulaFields("coverage_a * 0.1 + stories")).toEqual(
      expect.arrayContaining(["coverage_a", "stories"]),
    );
  });

  it("adds and relabels sections, moves fields, and clones after the original", () => {
    const start = defaultLayoutForLine("HO");
    const withSection = addSection(start, "left", "Extra");
    expect(withSection.columns[0].sections.some((section) => section.label === "Extra")).toBe(true);
    const renamed = relabelSection(withSection, withSection.columns[0].sections.at(-1)!.id, "More");
    expect(renamed.columns[0].sections.some((section) => section.label === "More")).toBe(true);
    const moved = moveField(start, "email", { columnId: "right" });
    expect(moved.columns[1].sections.some((section) => section.fieldKeys.includes("email"))).toBe(true);
    expect(moved.columns[0].sections.every((section) => !section.fieldKeys.includes("email"))).toBe(true);
    const drop = insertIndexFromClientY(40, [
      { key: "a", top: 0, height: 30 },
      { key: "b", top: 40, height: 30 },
    ]);
    expect(drop.beforeKey).toBe("b");
    const cloned = insertFieldAfter(start, "first_name", "first_name_copy");
    expect(cloned.columns[0].sections[0].fieldKeys).toEqual([
      "first_name",
      "first_name_copy",
      "last_name",
      "email",
      "phone",
    ]);
  });

  it("ships an additive picklist migrate and does not touch deal Documents / Markets / Quotes files", () => {
    const sql = source("drizzle/0085_field_builder_picklists.sql");
    expect(sql).toMatch(/desk_field_picklists/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "required"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "default_value"/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/db:seed/);
    const catalog = source("drizzle/0088_stage_title_picklists.sql");
    expect(catalog).toMatch(/US states/);
    expect(catalog).toMatch(/Lines of business/);
    expect(catalog).toMatch(/Common carriers/);
    expect(catalog).toMatch(/NOT EXISTS/);
    expect(catalog).not.toMatch(/DROP TABLE/);
    expect(catalog).not.toMatch(/db:seed/);
    const journal = source("drizzle/meta/_journal.json");
    expect(journal).toMatch(/0085_field_builder_picklists/);
    expect(journal).toMatch(/0088_stage_title_picklists/);
    expect(source("src/components/custom-fields/deal-details-panel.tsx")).toMatch(/FieldControl/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/FieldBuilder/);
  });
});
