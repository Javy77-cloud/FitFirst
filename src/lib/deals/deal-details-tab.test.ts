import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import {
  CORE_FIELDS,
  ESSENTIAL_ADDRESS_KEYS,
  ESSENTIAL_CONTACT_KEYS,
  defaultLayoutForLine,
} from "@/lib/custom-fields/defaults";
import { APPLICANT_SECTION_FIELD_KEYS } from "@/lib/custom-fields/applicant-fields";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "@/lib/custom-fields/layout";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { compareSheetValues } from "@/lib/desk/sheet-layout";
import { STANDING_DEAL_LIST_FIELD_KEYS } from "@/lib/deals/deal-columns";
import { AGENT_DEAL_TAB_LABELS, AGENT_DEAL_TABS, parseAgentDealTab } from "./tabs";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deal Details tab", () => {
  it("is first and the default Deal tab", () => {
    expect(AGENT_DEAL_TABS).toEqual(["details", "documents", "markets", "quotes"]);
    expect(AGENT_DEAL_TAB_LABELS.details).toBe("Deal Details");
    expect(parseAgentDealTab(undefined)).toBe("details");
    expect(parseAgentDealTab("")).toBe("details");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/DealDetailsPanel/);
    expect(page).toMatch(/defaultValue="details"/);
    expect(page.indexOf('"details"')).toBeLessThan(page.indexOf('"documents"'));
  });

  it("shows Contact + Applicant + Insured/Mailing Address, and Edit layout — no Property / Photos / Notes / inline add-field", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-2/);
    expect(panel).not.toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/EditLayoutLink/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/module="deals"/);
    expect(source("src/components/custom-fields/edit-layout-link.tsx")).toMatch(/Edit Layout/);
    expect(source("src/components/custom-fields/edit-layout-link.tsx")).toMatch(/data-ff-open-field-builder/);
    expect(source("src/lib/custom-fields/modules.ts")).toMatch(/\/settings\/field-builder\?/);
    expect(source("src/components/custom-fields/edit-layout-link.tsx")).toMatch(
      /buttonVariants\(\{ variant: "default", size \}\)/,
    );
    expect(panel).not.toMatch(/Add field/);
    expect(panel).not.toMatch(/New field/);
    expect(panel).not.toMatch(/Add section/);
    expect(panel).not.toMatch(/Delete section/);
    expect(panel).not.toMatch(/Open field builder/);
    expect(panel).not.toMatch(/Property/);
    expect(panel).not.toMatch(/Photos & calc/);
    expect(panel).not.toMatch(/Year built/);
    expect(panel).not.toMatch(/Roof photo/);
    expect(panel).not.toMatch(/>Notes</);

    const layout = defaultLayoutForLine("HO");
    const keys = layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    expect(keys).toEqual(
      expect.arrayContaining([
        ...ESSENTIAL_CONTACT_KEYS,
        ...ESSENTIAL_ADDRESS_KEYS,
        "contact_mailing_address",
        ...APPLICANT_SECTION_FIELD_KEYS,
      ]),
    );
    expect(keys).not.toContain("middle_name");
    expect(CORE_FIELDS.find((field) => field.key === "middle_name")?.type).toBe("single_line");
    expect(CORE_FIELDS.find((field) => field.key === "email")?.type).toBe("email");
    expect(keys).toContain("date_of_birth");
    expect(keys).not.toContain("year_built");
    expect(keys).not.toContain("roof_photo");
    expect(keys).not.toContain("notes");
    expect(layout.columns[0].sections.map((section) => section.id)).toEqual([
      "contact",
      "applicant",
      "co_applicant",
    ]);
    expect(layout.columns[1].sections.map((section) => section.id)).toEqual([
      "details",
      "insured_address",
      "mailing_address",
    ]);
  });

  it("colors Edit layout as a filled primary action, still opening the field builder", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    const link = source("src/components/custom-fields/edit-layout-link.tsx");
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/<EditLayoutLink module="deals" line=\{activeLob\} \/>/);
    expect(link).toMatch(/buttonVariants\(\{ variant: "default", size \}\)/);
    expect(link).not.toMatch(/variant: "outline"/);
    expect(link).not.toMatch(/variant: "ghost"/);
    expect(link).toMatch(/fieldBuilderHref/);
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-2/);
    expect(panel).not.toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
  });

  it("opens the field builder on its own settings page, not inline on the deal", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    const page = source("src/app/deals/[id]/page.tsx");
    const builderPage = source("src/app/settings/field-builder/page.tsx");
    expect(page).toMatch(/EditLayoutLink/);
    expect(panel).not.toMatch(/<FieldBuilder/);
    expect(page).not.toMatch(/<FieldBuilder/);
    expect(builderPage).toMatch(/FieldBuilder/);
    expect(builderPage).not.toMatch(/data-ff-builder-lobs/);
    expect(builderPage).not.toMatch(/DEAL_LAYOUT_LINES/);
  });

  it("strips a saved sep7as layout that still packs Property / Photos / Notes", () => {
    const packed = {
      columns: [
        {
          id: "left" as const,
          sections: [
            {
              id: "contact",
              label: "Contact",
              fieldKeys: ["first_name", "middle_name", "last_name", "email", "phone", "date_of_birth"],
            },
            { id: "address", label: "Address", fieldKeys: ["mailing_address", "city", "state", "zip"] },
          ],
        },
        {
          id: "right" as const,
          sections: [
            {
              id: "property",
              label: "Property",
              fieldKeys: ["year_built", "roof_year", "construction", "stories", "coverage_a"],
            },
            { id: "photos", label: "Photos & calc", fieldKeys: ["roof_photo", "dwell_pct"] },
            { id: "notes", label: "Notes", fieldKeys: ["notes"] },
          ],
        },
      ],
    };
    expect(needsEssentialDealMigration(packed)).toBe(true);
    const stripped = stripLegacyDealLayout(packed);
    const ids = stripped.columns.flatMap((column) => column.sections.map((section) => section.id));
    const keys = stripped.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    expect(ids).not.toContain("property");
    expect(ids).not.toContain("photos");
    expect(ids).not.toContain("notes");
    expect(keys).not.toContain("year_built");
    expect(keys).not.toContain("middle_name");
    expect(keys).toEqual(expect.arrayContaining([...ESSENTIAL_CONTACT_KEYS, ...ESSENTIAL_ADDRESS_KEYS]));
    expect(stripped.columns[0].sections.map((section) => section.id)).toEqual(["contact"]);
    expect(stripped.columns[1].sections.map((section) => section.id)).toEqual(["address"]);
    // sep7js splits Address → Insured + Mailing on load; strip keeps legacy id until migrate
  });


  it("preserves list-only Priority on Details save (no blank write for omitted fields)", () => {
    const save = source("src/app/actions/custom-fields.ts");
    // Must merge via customValuesFromForm scoped to Details layout — not loop all defs → "".
    expect(save).toMatch(/export async function saveDealFieldValues/);
    expect(save).toMatch(/customValuesFromForm\(formData, defsOnDetails\)/);
    expect(save).toMatch(/allLayoutFieldKeys\(layout\)/);
    expect(save).toMatch(/formData.has\(`field_\$\{field\.key\}`\)/);
    expect(save).toMatch(/picklist_8mus/);
    expect(save).toMatch(/dealDetailsSavedHref/);
    expect(save).toMatch(/"deal-details-saved"/);
    expect(save).toMatch(/persistDealWorkTab\(dealId, "details"\)/);
    expect(save).toMatch(/canonicalizeIdentityField/);
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/data-ff-deal-details-form/);
    expect(panel).toMatch(/data-ff-deal-details-save/);
    expect(panel).toMatch(/<form action=\{saveDealFieldValues\}/);
    expect(panel.indexOf("<form action={saveDealFieldValues}")).toBeLessThan(
      panel.indexOf('data-ff-deal-details-layout="two-col"'),
    );
    expect(panel.indexOf('data-ff-deal-details-layout="two-col"')).toBeLessThan(
      panel.indexOf("data-ff-deal-details-save"),
    );
    expect(save).not.toMatch(
      /const value = formData\.has\(`field_\$\{field\.key\}`\) \? String\(formData\.get\(`field_\$\{field\.key\}`\) \?\? ""\) : ""/,
    );

    const defs = [
      { key: "first_name", label: "First name", type: "single_line" as const },
      { key: "picklist_8mus", label: "Priority", type: "picklist" as const, options: ["1", "2", "3"] },
      { key: "picklist_yp0c", label: "Selling Agency", type: "picklist" as const, options: ["A"] },
    ];
    const form = new FormData();
    form.set("field_first_name", "Gloria");
    const custom = customValuesFromForm(form, defs);
    expect(custom).toEqual({ first_name: "Gloria" });
    expect(custom).not.toHaveProperty("picklist_8mus");
    expect(custom).not.toHaveProperty("picklist_yp0c");
    expect(STANDING_DEAL_LIST_FIELD_KEYS.has("picklist_8mus")).toBe(true);

    // Priority sort: blank/cleared values sort after Priority 1 (nulls last on asc).
    expect(compareSheetValues("", "1")).toBeGreaterThan(0);
    expect(compareSheetValues("1", "")).toBeLessThan(0);
    expect(compareSheetValues("1", "2")).toBeLessThan(0);
  });

  it("renders personal name fields as text and email as type=email with matching label ids", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "rosa-castellanos",
        line: "HO",
        layout: {
          columns: [
            {
              id: "left",
              sections: [
                {
                  id: "contact",
                  label: "Contact",
                  fieldKeys: ["first_name", "middle_name", "last_name", "email"],
                },
              ],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [
          { key: "first_name", label: "First name", type: "single_line" },
          { key: "middle_name", label: "Middle name", type: "email" },
          { key: "last_name", label: "Last name", type: "single_line" },
          { key: "email", label: "Email", type: "single_line" },
        ],
        values: {
          first_name: "Rosa",
          middle_name: "Marie",
          last_name: "Castellanos",
          email: "rosa@example.com",
        },
      }),
    );
    expect(html).toMatch(/data-ff-deal-details-form/);
    expect(html).toMatch(/<label[^>]*for="field_middle_name"[^>]*>Middle name<\/label>/);
    expect(html).toMatch(/<label[^>]*for="field_email"[^>]*>Email<\/label>/);
    const middle = html.match(/<input\b[^>]*\bid="field_middle_name"[^>]*>/)?.[0];
    const email = html.match(/<input\b[^>]*\bid="field_email"[^>]*>/)?.[0];
    expect(middle).toBeTruthy();
    expect(email).toBeTruthy();
    expect(middle).toContain('type="text"');
    expect(middle).toContain('name="field_middle_name"');
    expect(middle).toMatch(/autoComplete="additional-name"|autocomplete="additional-name"/);
    expect(middle).not.toContain('type="email"');
    expect(middle).not.toMatch(/inputmode="email"/i);
    expect(email).toContain('type="email"');
    expect(email).toContain('name="field_email"');
    expect(email).toMatch(/autoComplete="email"|autocomplete="email"/);
    expect(html).toMatch(/data-ff-deal-details-save/);
    expect(html).toMatch(/Save deal details/);
  });

  it("leaves Documents, Markets, Quotes, and the deal rail wired on the deal page", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const tabs = source("src/components/section-tabs.tsx");
    expect(page).toMatch(/<DocumentsPanel/);
    expect(page).toMatch(/<MarketsPanel/);
    expect(page).toMatch(/<QuotesPanel/);
    expect(tabs).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/RecordContextRail/);
    expect(page.indexOf("<DocumentsPanel")).toBeLessThan(page.indexOf("<MarketsPanel"));
    expect(page.indexOf("<MarketsPanel")).toBeLessThan(page.indexOf("<QuotesPanel"));
  });
});
