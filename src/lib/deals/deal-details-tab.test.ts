import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_ADDRESS_KEYS,
  ESSENTIAL_CONTACT_KEYS,
  defaultLayoutForLine,
} from "@/lib/custom-fields/defaults";
import { needsEssentialDealMigration, stripLegacyDealLayout } from "@/lib/custom-fields/layout";
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

  it("shows only Contact essentials, Address, and Edit layout — no Property / Photos / Notes / inline add-field", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-2/);
    expect(panel).not.toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
    expect(panel).toMatch(/Edit layout/);
    expect(panel).toMatch(/data-ff-open-field-builder/);
    expect(panel).toMatch(/\/settings\/field-builder\?line=/);
    expect(panel).toMatch(/buttonVariants\(\{ variant: "default", size: "sm" \}\)/);
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
    expect(keys).toEqual([...ESSENTIAL_CONTACT_KEYS, ...ESSENTIAL_ADDRESS_KEYS]);
    expect(keys).not.toContain("middle_name");
    expect(keys).not.toContain("date_of_birth");
    expect(keys).not.toContain("year_built");
    expect(keys).not.toContain("roof_photo");
    expect(keys).not.toContain("notes");
    expect(layout.columns[0].sections.map((section) => section.id)).toEqual(["contact"]);
    expect(layout.columns[1].sections.map((section) => section.id)).toEqual(["address"]);
  });

  it("colors Edit layout as a filled primary action, still opening the field builder", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    const linkBlock = panel.slice(
      panel.indexOf("data-ff-open-field-builder") - 220,
      panel.indexOf("data-ff-open-field-builder") + 80,
    );
    expect(linkBlock).toMatch(/buttonVariants\(\{ variant: "default", size: "sm" \}\)/);
    expect(linkBlock).not.toMatch(/variant: "outline"/);
    expect(linkBlock).not.toMatch(/variant: "ghost"/);
    expect(panel).toMatch(/href=\{`\/settings\/field-builder\?line=\$\{encodeURIComponent\(line\)\}`\}/);
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-2/);
    expect(panel).not.toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
  });

  it("opens the field builder on its own settings page, not inline on the deal", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    const page = source("src/app/deals/[id]/page.tsx");
    const builderPage = source("src/app/settings/field-builder/page.tsx");
    expect(panel).toMatch(/href=\{`\/settings\/field-builder\?line=\$\{encodeURIComponent\(line\)\}`\}/);
    expect(panel).not.toMatch(/FieldBuilder/);
    expect(page).not.toMatch(/FieldBuilder/);
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
  });

  it("leaves Documents, Markets, Quotes, and the deal rail wired on the deal page", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/<DocumentsPanel/);
    expect(page).toMatch(/<MarketsPanel/);
    expect(page).toMatch(/<QuotesPanel/);
    expect(page).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/RecordContextRail/);
    expect(page.indexOf("<DocumentsPanel")).toBeLessThan(page.indexOf("<MarketsPanel"));
    expect(page.indexOf("<MarketsPanel")).toBeLessThan(page.indexOf("<QuotesPanel"));
  });
});
