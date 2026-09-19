import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QUOTING_FORMS } from "@/lib/domain";
import { DEFAULT_AGENCY_LINES, isKnownAgencyLine } from "./agency-lines";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("agency LOB master list wiring", () => {
  it("maps every quoting form onto a seeded master line", () => {
    for (const form of QUOTING_FORMS) {
      expect(isKnownAgencyLine(form.lob, DEFAULT_AGENCY_LINES)).toBe(true);
    }
  });

  it("extends Settings → Lines instead of adding a second catalog page", () => {
    const page = source("src/app/settings/lines/page.tsx");
    expect(page).toMatch(/AgencyLineCatalog/);
    expect(page).toMatch(/loadAgencyLines/);
    expect(page).toMatch(/listAgencyLineOrphans/);
    expect(page).toMatch(/Written books/);
    expect(page).not.toMatch(/Business→Accounts|rename Business/);
    const catalog = source("src/components/settings/agency-line-catalog.tsx");
    expect(catalog).toMatch(/data-ff-agency-lines/);
    expect(catalog).toMatch(/Every record picks one line/);
    expect(catalog).toMatch(/Adopt/);
    expect(catalog).toMatch(/Map onto/);
    expect(catalog).not.toMatch(/commission ledger|general ledger|AMS accounting/i);
  });

  it("ships an additive migrate that seeds the catalog and remaps aliases", () => {
    const sql = source("drizzle/0141_agency_lines.sql");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "agency_lines"/);
    expect(sql).toMatch(/INSERT INTO "agency_lines"/);
    expect(sql).toMatch(/ON CONFLICT|NOT EXISTS/);
    expect(sql).toMatch(/line_of_business" = 'HO'/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/db:seed/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0141_agency_lines/);
    expect(source("src/lib/db/schema.ts")).toMatch(/export const agencyLines/);
  });

  it("requires deal, policy, and form picks to resolve through the master list", () => {
    expect(source("src/components/crm/line-select.tsx")).toMatch(/lines\?:/);
    expect(source("src/components/crm/dec-drop-form.tsx")).toMatch(/agencyLineSelectOptions/);
    expect(source("src/components/policy/policy-information.tsx")).toMatch(/PolicyInlineSelect/);
    expect(source("src/app/actions/policy-record.ts")).toMatch(/Pick a line from the agency list/);
    expect(source("src/app/actions/crm.ts")).toMatch(/requireStoredLineOfBusiness/);
    expect(source("src/app/actions/pipeline-sheet.ts")).toMatch(/resolveLineCode/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/data-ff-field-builder-lines/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/agencyLineSelectOptions/);
  });
});
