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
  MASTER_FILL_BUSY_COPY,
  MASTER_FILL_CANCEL,
  MASTER_FILL_REVIEW_NUDGE,
  MASTER_FILL_SKIP_NO_DOCS,
  MASTER_FILL_SKIP_NO_SOURCE_DOCS,
  MASTER_FILL_SKIP_WRONG_LINE,
  MASTER_FILL_SKIP_NO_VIN,
  masterFillDocsNote,
  MASTER_FILL_STEP_DEAL,
  MASTER_FILL_STEP_DOCS,
  MASTER_FILL_STEP_PROPERTY,
  isMasterFillAbortError,
  isMasterFillStepResult,
  masterFillBusyTitle,
  masterFillDoneSummary,
  masterFillUnexpectedMessage,
  rejectWhenAborted,
} from "@/lib/quote-sheet/master-fill";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7cs one-button master sheet Fill", () => {
  it("shows Fill Risk Profile once and drops the separate Property/Docs chips", () => {
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
    expect(button).toMatch(/masterFillStepsForLine/);
    expect(button).toMatch(/MASTER_FILL_REVIEW_NUDGE/);
    expect(button).toMatch(/fillMasterSheetStep/);
    expect(button).not.toMatch(/tab=markets/);
    expect(button).toMatch(/flashAction\(toast\)/);
    expect(button).toMatch(/router\.refresh\(\)/);
    expect(button).not.toMatch(/withFlash/);
    expect(button).toMatch(/MASTER_FILL_BUSY_COPY/);
    expect(button).toMatch(/masterFillBusyTitle/);
    expect(button).toMatch(/isMasterFillStepResult/);
    expect(button).toMatch(/masterFillUnexpectedMessage/);
    expect(button).toMatch(/WaitHold/);
    expect(button).toMatch(/AbortController/);
    expect(button).toMatch(/rejectWhenAborted/);
    expect(button).toMatch(/closeAndAbort/);
    expect(button).toMatch(/data-ff-master-fill-cancel/);
    expect(button).toMatch(/MASTER_FILL_CANCEL/);
    expect(button).toMatch(/showCloseButton/);
    expect(button).not.toMatch(/showCloseButton=\{!busy\}/);
    expect(button).not.toMatch(/!busy && setOpen/);

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
    expect(html.match(/Fill Risk Profile/g)?.length).toBe(1);
    expect(html).not.toContain("Fill from property records");
    expect(html).not.toContain("Fill from source");
  });

  it("orchestrates Deal → Property → Docs and keeps CHECK / review nudge", async () => {
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/export async function fillMasterSheetStep/);
    expect(action).toMatch(/runFillFromDealDetails/);
    expect(action).toMatch(/runFillFromPropertyRecords/);
    expect(action).toMatch(/runFillDealSheets/);
    expect(action).toMatch(/masterFillDocsNote/);
    expect(action).toMatch(/isFillSourceDoc/);
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
    expect(button).toMatch(/masterFillStepsForLine/);
    const master = source("src/lib/quote-sheet/master-fill.ts");
    expect(master).toMatch(/masterFillStepsForLine/);
    expect(master).toMatch(/Deal → Docs → VIN/);

    expect(MASTER_FILL_STEP_DEAL).toBe("Deal");
    expect(MASTER_FILL_STEP_PROPERTY).toBe("Property");
    expect(MASTER_FILL_STEP_DOCS).toBe("Docs");
    expect(MASTER_FILL_SKIP_NO_DOCS).toBe("No docs uploaded — skipped");
    expect(MASTER_FILL_SKIP_NO_SOURCE_DOCS).toMatch(/none are source docs/i);
    expect(MASTER_FILL_SKIP_WRONG_LINE).toMatch(/wrong shop line/i);
    expect(MASTER_FILL_SKIP_NO_VIN).toMatch(/did not extract a VIN/i);
    expect(
      masterFillDocsNote({
        dealFileCount: 1,
        fillSourceCount: 0,
        filledCount: 0,
        skippedWrongLine: 0,
      }),
    ).toBe(MASTER_FILL_SKIP_NO_SOURCE_DOCS);
    expect(
      masterFillDocsNote({
        dealFileCount: 1,
        fillSourceCount: 1,
        filledCount: 0,
        skippedWrongLine: 1,
      }),
    ).toBe(MASTER_FILL_SKIP_WRONG_LINE);
    expect(MASTER_FILL_REVIEW_NUDGE).toMatch(/Review CHECK fields and Confirm when ready/);

    const summary = masterFillDoneSummary([
      { step: "deal", filledCount: 3, skippedCount: 1 },
      { step: "property", filledCount: 2, skippedCount: 0 },
      { step: "docs", filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NO_DOCS },
    ]);
    expect(summary).toMatch(/Filled 5, skipped 1/);
    expect(summary).toMatch(/No docs uploaded — skipped/);
    expect(summary).toMatch(/Review CHECK fields and Confirm when ready/);
    expect(MASTER_FILL_BUSY_COPY).toMatch(/Working on it/);
    expect(masterFillBusyTitle(MASTER_FILL_STEP_DOCS)).toBe(MASTER_FILL_STEP_DOCS);
    expect(isMasterFillStepResult({ step: "docs", filledCount: 1, skippedCount: 0 })).toBe(true);
    expect(isMasterFillStepResult("not-json")).toBe(false);
    expect(masterFillUnexpectedMessage(MASTER_FILL_STEP_DOCS)).toMatch(/Docs/);
    expect(masterFillUnexpectedMessage(MASTER_FILL_STEP_DOCS)).toMatch(/unexpected response/i);
    expect(action).toMatch(/purpose: "fill"/);
    expect(action).toMatch(/fillMasterSheetStepInner/);
    expect(MASTER_FILL_CANCEL).toBe("Cancel");
    const already = new AbortController();
    already.abort();
    await expect(rejectWhenAborted(already.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(isMasterFillAbortError({ name: "AbortError", message: "The operation was aborted" })).toBe(
      true,
    );
    expect(isMasterFillAbortError(new Error("Docs failed"))).toBe(false);
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
    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.applicant_dob).toBeUndefined();
    expect(result.values.mailing_address.value).toBe("99 Mail Ln");
    expect(result.values.address1.value).toBe("412 Harbor Isle Dr");
    expect(result.values.county.value).toBe("Brevard");
    expect(result.values.current_carrier.value).toBe("Citizens");
    expect(result.values.coverage_a.value).toBe("385000");
    expect(result.values.coverage_a.status).toBe("check");
    expect(result.filledKeys).not.toContain("applicant_name");
    expect(result.filledKeys).not.toContain("named_insured");
  });
});
