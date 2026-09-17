import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { FieldControl } from "@/components/custom-fields/field-control";
import { PicklistConfig } from "@/components/custom-fields/picklist-config";
import {
  ESSENTIAL_ADDRESS_KEYS,
  ESSENTIAL_CONTACT_KEYS,
  defaultFieldsForLine,
  defaultLayoutForLine,
} from "./defaults";
import { APPLICANT_SECTION_FIELD_KEYS } from "./applicant-fields";
import { CO_APPLICANT_SECTION_FIELD_KEYS } from "./co-applicant-fields";
import { formatCurrencyDisplay, parseNumericInput } from "./format";
import { evaluateFormula, extractFormulaFields } from "./formula";
import { FIELD_TYPE_ICON_NAMES, iconNameForType } from "./icons";
import { addSection, duplicateSection, insertFieldAfter, insertIndexFromClientY, layoutContainsFieldKey, moveField, relabelSection, removeFieldOccurrence } from "./layout";
import {
  cloneFieldDef,
  MAX_PICKLIST_OPTIONS,
  missingRequiredFields,
  resizePicklistOptions,
  resolveFieldOptions,
  resolvedFieldValue,
  sanitizePicklistOptions,
} from "./picklists";
import {
  COMMON_CARRIER_OPTIONS,
  LINE_OF_BUSINESS_OPTIONS,
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_CARRIERS,
  STARTER_PICKLIST_LEAD_CADENCE,
  STARTER_PICKLIST_LINES,
  STARTER_PICKLIST_OCCUPATIONS,
  STARTER_PICKLIST_DEAL_NOTICES,
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
      "address",
      "picklist",
      "multi_select",
      "date",
      "dob",
      "date_time",
      "number",
      "currency",
      "percentage",
      "checkbox",
      "lookup",
      "formula",
      "image",
    ]);
    expect(CUSTOM_FIELD_TYPE_LABELS.dob).toBe("DOB");
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
    expect(builder).toMatch(/data-ff-palette-chip-width="longest"/);
    expect(builder).toMatch(/data-ff-palette-equal-width/);
    expect(builder).toMatch(/flex w-full cursor-grab/);
    expect(builder).not.toMatch(/flex w-max max-w-full cursor-grab/);
    expect(builder).toMatch(/insertIndexFromClientY/);
    expect(builder).toMatch(/Save applies to every deal/);
    expect(builder).not.toMatch(/every \{line\} deal/);
    expect(builder).toMatch(/SectionDensityControl/);
    expect(builder).toMatch(/setSectionDensity/);
    expect(builder).toMatch(/LayoutSectionFieldGrid/);
    expect(builder).not.toMatch(/including in Preview/);
    expect(builder).not.toMatch(/Asked once/);
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
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/layoutWithoutDealDetailsLandlord/);
    expect(builder).toMatch(/data-ff-field-visibility-hint/);
    expect(builder).toMatch(/Shown when lived here is No/);
    expect(builder).toMatch(/layoutWithoutDealDetailsLandlord/);
    expect(builder).toMatch(/isPreviousAddressFieldKey/);
    expect(builder).toMatch(/shouldShowPreviousAddressFields/);
    expect(builder).toMatch(/occupationValueAfterIndustryChange/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/upsertFieldDef/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(
      /flashAction\(fieldBuilderHref\(module, line\), "layout-saved"\)/,
    );
  });

  it("renders each field type as that type — not a text-box fake", () => {
    const control = source("src/components/custom-fields/field-control.tsx");
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(control).toMatch(/data-ff-control-type=\{cascadeField.type\}/);
    expect(control).toMatch(/occupationIndustryParentKey/);
    expect(control).toMatch(/data-ff-currency-input/);
    expect(control).toMatch(/\$/);
    expect(control).toMatch(/data-ff-percent-input/);
    expect(control).toMatch(/>%<\/span>/);
    expect(control).toMatch(/type="checkbox"/);
    expect(control).toMatch(/data-ff-picklist/);
    expect(control).toMatch(/<select/);
    expect(control).toMatch(/htmlInputTypeForField/);
    expect(control).toMatch(/type=\{inputType\}/);
    expect(control).toMatch(/id=\{name\}/);
    expect(control).toMatch(/type="tel"/);
    expect(source("src/lib/custom-fields/identity-field.ts")).toMatch(/"date"/);
    expect(source("src/lib/custom-fields/identity-field.ts")).toMatch(/datetime-local/);
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
    const card = source("src/components/settings/picklist-card.tsx");
    expect(builder).toMatch(/PicklistConfig/);
    expect(builder).toMatch(/data-ff-edit-properties/);
    expect(builder).toMatch(/type === "picklist" \|\| type === "multi_select"/);
    expect(config).toMatch(/data-ff-picklist-config/);
    expect(config).toMatch(/data-ff-option-count/);
    expect(config).toMatch(/data-ff-global-list/);
    expect(config).toMatch(/data-ff-option-set/);
    expect(config).toMatch(/OPTION_SET_POLICY_CATEGORY/);
    expect(config).toMatch(/OPTION_SET_CUSTOM_CATEGORY/);
    expect(config).toMatch(/groupedOptionSetChoices/);
    expect(config).toMatch(/data-ff-add-option/);
    expect(config).toMatch(/max-h-44/);
    expect(config).toMatch(/overflow-y-auto/);
    expect(builder).toMatch(/max-h-\[min\(90vh,42rem\)\]/);
    expect(builder).toMatch(/data-ff-edit-properties-body/);
    expect(builder).toMatch(/data-ff-save-properties/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/globalLists=\{globalLists\}/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/loadGlobalLists/);
    // Key by slot index only. Including the typed value remounts the input each keystroke.
    expect(config).toMatch(/options\.map\(\(option, index\) => \(/);
    expect(config).toMatch(/<div key=\{index\}/);
    expect(config).not.toMatch(/key=\{`\$\{index\}-\$\{option\}`\}/);
    expect(config).not.toMatch(/key=\{option\}/);
    expect(config).toMatch(/ListOptionInput/);
    expect(config).toMatch(/onCommit=/);
    expect(config).not.toMatch(/next\[index\] = event\.target\.value/);
    expect(config).toMatch(/\/settings\/picklists/);
    expect(page).toMatch(/SettingsShell title="Picklists"/);
    expect(page).toMatch(/current="picklists"/);
    expect(page).toMatch(/data-ff-new-picklist/);
    expect(page).toMatch(/lg:grid-cols-2/);
    expect(card).toMatch(/data-ff-picklist-name/);
    expect(page).toMatch(/US states/);
    expect(source("src/lib/settings/nav.ts")).toMatch(/"picklists"/);
    expect(source("src/lib/settings/nav.ts")).toMatch(/\/settings\/picklists/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/ensureDefaultFieldPicklists/);
    expect(source("src/lib/custom-fields/picklist-store.ts")).toMatch(/STARTER_FIELD_PICKLISTS/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/listFieldPicklists/);
  });

  it("keeps a multi-letter picklist option after each keystroke update", () => {
    const typed = ["C", "Ca", "Cal", "Call", "Calls"];
    for (const value of typed) {
      const html = renderToString(
        createElement(PicklistConfig, {
          field: {
            key: "preferred_method_of_communication",
            label: "Preferred method of communication",
            type: "picklist",
            options: [value, ""],
          },
          lists: [],
          onChange: () => {},
        }),
      );
      expect(html).toContain('data-ff-option-row="0"');
      expect(html).toContain(`value="${value}"`);
      expect(html).toContain('data-ff-option-row="1"');
    }
  });

  it("uses the same icon set on palette, canvas, and settings", () => {
    expect(FIELD_TYPE_ICON_NAMES.single_line).toBe("Type");
    expect(FIELD_TYPE_ICON_NAMES.multi_line).toBe("AlignLeft");
    expect(FIELD_TYPE_ICON_NAMES.email).toBe("Mail");
    expect(FIELD_TYPE_ICON_NAMES.phone).toBe("Phone");
    expect(FIELD_TYPE_ICON_NAMES.address).toBe("MapPin");
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
    expect(source("src/components/settings/picklist-card.tsx")).toMatch(/FieldTypeIcon/);
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
    expect(STARTER_FIELD_PICKLISTS.map((list) => list.name)).toEqual(
      expect.arrayContaining([
        STARTER_PICKLIST_US_STATES,
        STARTER_PICKLIST_LINES,
        STARTER_PICKLIST_CARRIERS,
        STARTER_PICKLIST_LEAD_CADENCE,
        STARTER_PICKLIST_OCCUPATIONS,
        STARTER_PICKLIST_DEAL_NOTICES,
      ]),
    );
    expect(US_STATE_OPTIONS).toHaveLength(51);
    expect(US_STATE_OPTIONS).toContain("FL — Florida");
    expect(LINE_OF_BUSINESS_OPTIONS).toEqual(expect.arrayContaining(["Homeowners", "Auto", "Flood", "Workers Comp"]));
    expect(LINE_OF_BUSINESS_OPTIONS).not.toContain("Home");
    expect(LINE_OF_BUSINESS_OPTIONS).not.toContain("Workers' Comp");
    expect(COMMON_CARRIER_OPTIONS).toEqual(
      expect.arrayContaining(["Tailrow", "Progressive", "Citizens", "Trident Reciprocal Exchange"]),
    );
    expect(missingStarterPicklistNames([])).toEqual([...STARTER_FIELD_PICKLISTS.map((list) => list.name)]);
    expect(
      missingStarterPicklistNames(STARTER_FIELD_PICKLISTS.map((list) => list.name)),
    ).toEqual([]);
    expect(missingStarterPicklistNames(["US states"])).toContain(STARTER_PICKLIST_DEAL_NOTICES);
    expect(formatCurrencyDisplay("321000")).toBe("321,000.00");
    expect(parseNumericInput("$321,000.00")).toBe("321000");
  });

  it("strips empty and duplicate picklist options from field defs before they hit FieldControl", () => {
    expect(sanitizePicklistOptions(["", " ", "Frame", "Frame", "", "Masonry", "  Frame  "])).toEqual([
      "Frame",
      "Masonry",
    ]);
    expect(sanitizePicklistOptions(["", ""])).toEqual([]);
    expect(sanitizePicklistOptions(null)).toEqual([]);
    const custom = {
      key: "construction",
      label: "Construction",
      type: "picklist" as const,
      options: ["", "", "Frame", "Frame"],
    };
    expect(resolveFieldOptions(custom)).toEqual(["Frame"]);
    const global = {
      ...custom,
      picklistId: "list-1",
      options: ["", "leftover"],
    };
    expect(
      resolveFieldOptions(global, [{ id: "list-1", name: "Construction", options: ["", "Masonry", "Masonry", " "] }]),
    ).toEqual(["Masonry"]);
    const control = source("src/components/custom-fields/field-control.tsx");
    expect(control).toMatch(/sanitizePicklistOptions/);
    expect(control).toMatch(/<option value="">Select<\/option>/);
    expect(control).toMatch(/key=\{`\$\{field\.key\}:\$\{index\}:\$\{option\}`\}/);
    expect(control).not.toMatch(/key=\{option\}/);
    expect(source("src/lib/custom-fields/store.ts")).toMatch(/resolveFieldOptions\(field, lists, globalLists\)/);
    expect(source("src/lib/custom-fields/store.ts")).not.toMatch(
      /field\.picklistId \? \{ \.\.\.field, options: resolveFieldOptions/,
    );
  });

  it("renders a picklist FieldControl without duplicate empty keys", () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });
    const html = renderToString(
      createElement(FieldControl, {
        field: {
          key: "construction",
          label: "Construction",
          type: "picklist",
          options: ["", " ", "Frame", "Frame", "", "Masonry"],
        },
        value: "Frame",
        values: { coverage_a: "321000" },
        name: "field_construction",
      }),
    );
    spy.mockRestore();
    expect(errors.some((line) => line.includes("same key") || line.includes('key, ``'))).toBe(false);
    expect(html.match(/<option/g)?.length).toBe(3);
    expect(html).toMatch(/<option value="">Select<\/option>/);
    expect(html).toContain('value="Frame"');
    expect(html).toContain('value="Masonry"');
    expect(html.match(/value="Frame"/g)?.length).toBe(1);
    expect(html).not.toMatch(/<option value="">\s*<\/option>/);
    const multi = renderToString(
      createElement(FieldControl, {
        field: {
          key: "plan_type",
          label: "Plan type",
          type: "multi_select",
          options: ["", "PPO", "PPO", "HMO"],
        },
        value: "PPO",
        values: {},
        name: "field_plan_type",
      }),
    );
    // Menu is a closed portal on SSR — option checkboxes are not in the markup.
    expect(multi).toMatch(/data-ff-multi-select="plan_type"/);
    expect(multi).toMatch(/data-ff-multi-option-count="2"/);
    expect(multi).toContain('value="PPO"');
    expect(multi.match(/value="PPO"/g)?.length).toBe(1);
  });

  it("renders Deal Details picklists with dirty field-def options and no duplicate-key warning", () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });
    const html = renderToString(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: {
          columns: [
            {
              id: "left",
              sections: [{ id: "contact", label: "Contact", fieldKeys: ["construction"] }],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [
          {
            key: "construction",
            label: "Construction",
            type: "picklist",
            options: ["", "", "Frame", "Masonry", "Frame"],
          },
        ],
        values: { coverage_a: "321000" },
      }),
    );
    spy.mockRestore();
    expect(errors.some((line) => line.includes("same key") || line.includes("key, ``"))).toBe(false);
    expect(html).toMatch(/data-ff-deal-details/);
    expect(html).toMatch(/data-ff-picklist="construction"/);
    const construction = html.match(/data-ff-picklist="construction"[\s\S]*?<\/select>/)?.[0] ?? "";
    expect(construction.match(/<option/g)?.length).toBe(3);
    expect(construction).toMatch(/<option value=""[^>]*>Select<\/option>/);
    expect(html.match(/value="Frame"/g)?.length).toBe(1);
    expect(html.match(/value="Masonry"/g)?.length).toBe(1);
  });

  it("defaults every line of business to Contact + Applicant + Insured/Mailing Address", () => {
    const home = defaultLayoutForLine("HO");
    const salon = defaultLayoutForLine("GL");
    expect(home.columns).toHaveLength(2);
    expect(salon.columns).toHaveLength(2);
    const homeKeys = home.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    const salonKeys = salon.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    expect(homeKeys).toEqual(
      expect.arrayContaining([
        ...ESSENTIAL_CONTACT_KEYS,
        ...ESSENTIAL_ADDRESS_KEYS,
        "contact_mailing_address",
        "contact_mailing_city",
        "contact_mailing_state",
        "contact_mailing_zip",
        ...APPLICANT_SECTION_FIELD_KEYS,
        ...CO_APPLICANT_SECTION_FIELD_KEYS,
      ]),
    );
    expect(salonKeys).toEqual(homeKeys);
    expect(homeKeys).not.toContain("roof_year");
    expect(homeKeys).not.toContain("occupancy");
    expect(home.columns[0].sections.map((section) => section.label)).toEqual([
      "Contact",
      "Applicant",
      "Insured Address",
    ]);
    expect(home.columns[1].sections.map((section) => section.label)).toEqual([
      "Co-applicant",
      "Mailing Address",
      "Pipeline",
    ]);
    expect(homeKeys).toEqual(expect.arrayContaining(["insurance_type", "insurance_category", "insurance_subtype"]));
    expect(homeKeys).not.toContain("lease_term");
    expect(homeKeys).not.toContain("primary_heat");
  });

  it("keeps LOB field catalogs so the builder can add them later", () => {
    expect(defaultFieldsForLine("HO").map((field) => field.key)).toEqual(
      expect.arrayContaining(["roof_year", "coverage_a", "roof_photo"]),
    );
    expect(defaultFieldsForLine("HO").map((field) => field.key)).not.toContain("lease_term");
    expect(defaultFieldsForLine("HO").map((field) => field.key)).not.toContain("primary_heat");
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
      "entity_type",
      "first_name",
      "first_name_copy",
      "middle_name",
      "last_name",
      "date_of_birth",
      "phone",
      "email",
      "epolicy",
    ]);
  });


  it("removes only one slot when the same field key appears twice", () => {
    const start = {
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "co_applicant",
              label: "Co-applicant",
              fieldKeys: ["co_applicant_marital_status", "co_applicant_occupation"],
            },
            {
              id: "co_applicant_copy",
              label: "Co-applicant (copy)",
              fieldKeys: ["co_applicant_marital_status", "co_applicant_occupation"],
            },
          ],
        },
        { id: "right", sections: [] },
      ],
    };
    const next = removeFieldOccurrence(start, "co_applicant", "co_applicant_marital_status");
    expect(next.columns[0].sections[0].fieldKeys).toEqual(["co_applicant_occupation"]);
    expect(next.columns[0].sections[1].fieldKeys).toEqual([
      "co_applicant_marital_status",
      "co_applicant_occupation",
    ]);
    expect(layoutContainsFieldKey(next, "co_applicant_marital_status")).toBe(true);
  });


  it("allows clearing a section label while typing and duplicates a section", () => {
    const start = addSection(defaultLayoutForLine("HO"), "left", "New section");
    const id = start.columns[0].sections.at(-1)!.id;
    const mid = relabelSection(start, id, "N", { allowEmpty: true });
    expect(mid.columns[0].sections.at(-1)!.label).toBe("N");
    const cleared = relabelSection(mid, id, "", { allowEmpty: true });
    expect(cleared.columns[0].sections.at(-1)!.label).toBe("");
    const blurred = relabelSection(cleared, id, "");
    expect(blurred.columns[0].sections.at(-1)!.label).toBe("Section");
    const withCo = addSection(start, "left", "Co-applicant");
    const coId = withCo.columns[0].sections.at(-1)!.id;
    const duped = duplicateSection(withCo, coId);
    const labels = duped.columns[0].sections.map((s) => s.label);
    expect(labels.filter((l) => l.startsWith("Co-applicant")).length).toBeGreaterThanOrEqual(2);
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
