import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIELD_LAYOUT_MODULES,
  FIELD_LAYOUT_MODULE_LABEL,
  defaultFieldsForModule,
  defaultLayoutForModule,
  fieldBuilderHref,
  fieldLayoutListHref,
  isFieldLayoutModule,
  parseLayoutModule,
} from "./modules";
import { longestPaletteLabel, PALETTE_ITEMS, PALETTE_LABELS } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7bv equal-width chips + Edit Layout on every CRM module", () => {
  it("sizes every palette chip to the longest type label", () => {
    const longest = longestPaletteLabel();
    expect(longest.length).toBe(Math.max(...PALETTE_ITEMS.map((item) => PALETTE_LABELS[item].length)));
    expect(["Image upload", "Multi-select"]).toContain(longest);
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-palette-equal-width/);
    expect(builder).toMatch(/data-ff-palette-chip-width="longest"/);
    expect(builder).toMatch(/flex w-full cursor-grab/);
    expect(builder).toMatch(/grid w-max grid-cols-1/);
    expect(builder).not.toMatch(/flex w-max max-w-full cursor-grab/);
    expect(builder).not.toMatch(/max-w-\[9\.5rem\]/);
    const chipClass = builder.match(
      /className="flex w-full cursor-grab items-center gap-1.5 whitespace-nowrap[^"]+"/,
    );
    expect(chipClass?.[0]).toContain("w-full");
    expect(chipClass?.[0]).not.toMatch(/[" ]w-max /);
    expect(chipClass?.[0]).not.toMatch(/w-1\/2/);
  });

  it("exposes Edit Layout for Leads, Deals, Policies, Contacts, Business, and Carriers", () => {
    expect([...FIELD_LAYOUT_MODULES]).toEqual([
      "leads",
      "deals",
      "policies",
      "contacts",
      "businesses",
      "carriers",
    ]);
    expect(FIELD_LAYOUT_MODULE_LABEL).toEqual({
      leads: "Leads",
      deals: "Deals",
      policies: "Policies",
      contacts: "Contacts",
      businesses: "Business",
      carriers: "Carriers",
    });
    expect(parseLayoutModule("business")).toBe("businesses");
    expect(parseLayoutModule("accounts")).toBe("businesses");
    expect(parseLayoutModule("carriers")).toBe("carriers");
    expect(parseLayoutModule("")).toBe("deals");
    expect(isFieldLayoutModule("pipeline")).toBe(false);
    expect(isFieldLayoutModule("campaigns")).toBe(false);
    expect(fieldBuilderHref("leads")).toBe("/settings/field-builder?module=leads");
    expect(fieldBuilderHref("deals", "HO")).toBe("/settings/field-builder?module=deals&line=HO");
    expect(fieldBuilderHref("carriers")).toBe("/settings/field-builder?module=carriers");
    expect(fieldLayoutListHref("businesses")).toBe("/accounts");

    const link = source("src/components/custom-fields/edit-layout-link.tsx");
    expect(link).toMatch(/Edit Layout/);
    expect(link).toMatch(/data-ff-edit-layout=\{module\}/);
    expect(link).toMatch(/data-ff-open-field-builder/);

    const nav = source("src/components/custom-fields/module-layout-nav.tsx");
    expect(nav).toMatch(/data-ff-module-layout-nav/);
    for (const module of FIELD_LAYOUT_MODULES) {
      expect(nav).toMatch(`FIELD_LAYOUT_MODULE_LABEL[module]`);
    }

    const mass = source("src/components/developer-hub/list-selection.tsx");
    expect(mass).toMatch(/isFieldLayoutModule\(module\)/);
    expect(mass).toMatch(/<EditLayoutLink module=\{module\} \/>/);
    expect(mass).not.toMatch(/moduleId === "pipeline"/);

    expect(source("src/app/leads/[id]/page.tsx")).toMatch(/<EditLayoutLink module="leads" \/>/);
    expect(source("src/app/contacts/[id]/page.tsx")).toMatch(/<EditLayoutLink module="contacts" \/>/);
    expect(source("src/app/policies/[id]/page.tsx")).toMatch(/<EditLayoutLink module="policies" \/>/);
    expect(source("src/app/accounts/[id]/page.tsx")).toMatch(/<EditLayoutLink module="businesses" \/>/);
    expect(source("src/app/carriers/[id]/page.tsx")).toMatch(/<EditLayoutLink module="carriers" \/>/);
    expect(source("src/components/custom-fields/deal-details-panel.tsx")).toMatch(
      /<EditLayoutLink module="deals" line=\{line\} \/>/,
    );

    const settings = source("src/lib/settings/nav.ts");
    expect(settings).toMatch(/Field layouts/);
    expect(settings).toMatch(/Carriers/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/ModuleLayoutNav/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/parseLayoutModule/);
    expect(source("src/components/custom-fields/field-builder.tsx")).toMatch(/name="module"/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveLayoutForModule/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/upsertFieldDef\(/);
  });

  it("persists a distinct starter layout per module", () => {
    expect(defaultLayoutForModule("deals").columns[0].sections[0].id).toBe("contact");
    expect(defaultLayoutForModule("leads").columns[1].sections[0].fieldKeys).toEqual(["source", "notes"]);
    expect(defaultLayoutForModule("contacts").columns[1].sections[0].id).toBe("address");
    expect(defaultLayoutForModule("policies").columns[0].sections[0].id).toBe("policy");
    expect(defaultLayoutForModule("businesses").columns[0].sections[0].id).toBe("business");
    expect(defaultLayoutForModule("carriers").columns[0].sections[0].id).toBe("identity");
    expect(defaultFieldsForModule("carriers").some((field) => field.key === "naic")).toBe(true);
    expect(defaultFieldsForModule("businesses").some((field) => field.key === "business_name")).toBe(true);
    const store = source("src/lib/custom-fields/store.ts");
    expect(store).toMatch(/MODULE_LAYOUT_LINE/);
    expect(store).toMatch(/saveLayoutForModule/);
    expect(store).toMatch(/loadLayoutForModule/);
    expect(store).toMatch(/eq\(deskFieldLayouts\.module, module\)/);
    expect(store).toMatch(/eq\(deskCustomFields\.module, module\)/);
    expect(store).not.toMatch(/db:seed/);
  });
});
