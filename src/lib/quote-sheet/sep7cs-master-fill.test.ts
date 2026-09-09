import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import {
  FILL_MASTER_SHEET_LABEL,
  MASTER_FILL_REVIEW_NUDGE,
  MASTER_FILL_SKIP_NO_DOCS,
  MASTER_FILL_STEP_DEAL,
  MASTER_FILL_STEP_DOCS,
  MASTER_FILL_STEP_PROPERTY,
  masterFillDoneSummary,
} from "@/lib/quote-sheet/master-fill";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7cs one-button master sheet Fill", () => {
  it("shows Fill master sheet once and drops the separate Property/Docs chips", () => {
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/MasterSheetFillButton/);
    expect(sheet).not.toMatch(/Fill from property records/);
    expect(sheet).not.toMatch(/Fill from source/);
    expect(sheet).not.toMatch(/fillFromPropertyRecords/);
    expect(sheet).not.toMatch(/fillQuoteSheetBlanks/);

    const button = source("src/components/deal/master-sheet-fill-button.tsx");
    expect(button).toMatch(/FILL_MASTER_SHEET_LABEL/);
    expect(button).toMatch(/data-ff-fill-master-sheet/);
    expect(button.match(/data-ff-fill-master-sheet/g)?.length).toBe(1);
    expect(button).toMatch(/MASTER_FILL_STEP_DEAL/);
    expect(button).toMatch(/MASTER_FILL_STEP_PROPERTY/);
    expect(button).toMatch(/MASTER_FILL_STEP_DOCS/);
    expect(button).toMatch(/MASTER_FILL_REVIEW_NUDGE/);
    expect(button).toMatch(/fillMasterSheetStep/);
    expect(button).toMatch(/tab=markets/);
    expect(button).toMatch(/withFlash/);

    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-1",
        line: "home",
        fields: [],
        values: {},
        product: "homeowners",
      }),
    );
    expect(html).toContain(FILL_MASTER_SHEET_LABEL);
    expect(html).toContain('data-ff-fill-master-sheet=""');
    expect(html.match(/Fill master sheet/g)?.length).toBe(1);
    expect(html).not.toContain("Fill from property records");
    expect(html).not.toContain("Fill from source");
  });

  it("orchestrates Deal → Property → Docs and keeps CHECK / review nudge", () => {
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/export async function fillMasterSheetStep/);
    expect(action).toMatch(/runFillFromDealDetails/);
    expect(action).toMatch(/runFillFromPropertyRecords/);
    expect(action).toMatch(/runFillDealSheets/);
    expect(action).toMatch(/MASTER_FILL_SKIP_NO_DOCS/);
    expect(action).toMatch(/Copied deal details into blank master-sheet fields \(CHECK\)/);
    const dealFill = source("src/lib/quote-sheet/fill-from-deal.ts");
    expect(dealFill).toMatch(/status: "check"/);
    expect(dealFill).toMatch(/never auto-confirm/);

    const dealIdx = action.indexOf('if (step === "deal")');
    const propIdx = action.indexOf('if (step === "property")');
    const docsIdx = action.indexOf("// docs");
    expect(dealIdx).toBeGreaterThan(-1);
    expect(propIdx).toBeGreaterThan(dealIdx);
    expect(docsIdx).toBeGreaterThan(propIdx);

    const button = source("src/components/deal/master-sheet-fill-button.tsx");
    const stepsBlock = button.indexOf("const STEPS = [");
    expect(stepsBlock).toBeGreaterThan(-1);
    const dealStep = button.indexOf('id: "deal"', stepsBlock);
    const propStep = button.indexOf('id: "property"', stepsBlock);
    const docsStep = button.indexOf('id: "docs"', stepsBlock);
    expect(dealStep).toBeGreaterThan(stepsBlock);
    expect(propStep).toBeGreaterThan(dealStep);
    expect(docsStep).toBeGreaterThan(propStep);

    expect(MASTER_FILL_STEP_DEAL).toBe("Loading deal details…");
    expect(MASTER_FILL_STEP_PROPERTY).toBe("Loading property details…");
    expect(MASTER_FILL_STEP_DOCS).toBe("Loading docs…");
    expect(MASTER_FILL_SKIP_NO_DOCS).toBe("No docs uploaded — skipped");
    expect(MASTER_FILL_REVIEW_NUDGE).toMatch(/Review CHECK fields and Confirm when ready/);

    const summary = masterFillDoneSummary([
      { step: "deal", filledCount: 3, skippedCount: 1 },
      { step: "property", filledCount: 2, skippedCount: 0 },
      { step: "docs", filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NO_DOCS },
    ]);
    expect(summary).toMatch(/Filled 5, skipped 1/);
    expect(summary).toMatch(/No docs uploaded — skipped/);
    expect(summary).toMatch(/Review CHECK fields and Confirm when ready/);
  });

  it("copies deal blanks as CHECK and never overwrites agent/confirmed", () => {
    const existing = emptySheetValues("home");
    existing.city = { value: "Palm Bay", status: "confirmed", source: "agent" };
    existing.named_insured = { value: "Keep Me", status: "confirmed", source: "agent" };

    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Elena Ruiz",
        propertyOneliner: "412 Harbor Isle Dr · Melbourne",
        currentCarrier: "Citizens",
        coverageAmount: 385000,
        stored: {
          first_name: "Elena",
          last_name: "Ruiz",
          date_of_birth: "1984-03-12",
          mailing_address: "99 Mail Ln",
          phone: "(321) 555-0188",
          email: "elena@example.com",
          city: "Melbourne",
          state: "FL",
          zip: "32935",
        },
        risk: {
          address1: "412 Harbor Isle Dr",
          city: "Melbourne",
          state: "FL",
          zip: "32935",
          county: "Brevard",
        },
      },
      existing,
    );

    expect(result.values.named_insured.value).toBe("Keep Me");
    expect(result.skippedKeys).toContain("named_insured");
    expect(result.values.city.value).toBe("Palm Bay");
    expect(result.values.applicant_name.value).toBe("Elena Ruiz");
    expect(result.values.applicant_name.status).toBe("check");
    expect(result.values.applicant_name.source).toBe("agent");
    expect(result.values.applicant_name.sourceLabel).toBe("deal details");
    expect(result.values.applicant_dob.value).toBe("1984-03-12");
    expect(result.values.applicant_dob.status).toBe("check");
    expect(result.values.mailing_address.value).toBe("99 Mail Ln");
    expect(result.values.address1.value).toBe("412 Harbor Isle Dr");
    expect(result.values.county.value).toBe("Brevard");
    expect(result.values.current_carrier.value).toBe("Citizens");
    expect(result.values.coverage_a.value).toBe("385000");
    expect(result.values.coverage_a.status).toBe("check");
    expect(result.filledKeys).toContain("applicant_name");
    expect(result.filledKeys).not.toContain("named_insured");
  });
});
