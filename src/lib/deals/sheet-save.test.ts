import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { mergeAgentEdits } from "@/lib/quote-sheet/apply";
import { submittedSheetValues } from "@/lib/quote-sheet/save-values";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("master sheet save / reload", () => {
  it("collects every named sheet field from the save form", () => {
    const form = new FormData();
    form.set("dealId", "deal-1");
    form.set("line", "home");
    form.set("sheet_product", "homeowners");
    form.set("applicant_name", "Jordan Lee");
    form.set("city", "Melbourne");
    const submitted = submittedSheetValues(form);
    expect(submitted.dealId).toBeUndefined();
    expect(submitted.line).toBeUndefined();
    expect(submitted.applicant_name).toBe("Jordan Lee");
    expect(submitted.city).toBe("Melbourne");
  });

  it("writes submitted values so a second merge returns the same cells", () => {
    const first = mergeAgentEdits(emptySheetValues("home"), { year_built: "1989", city: "Melbourne" }, "home");
    expect(first.year_built.value).toBe("1989");
    const again = mergeAgentEdits(first, { year_built: "1989", city: "Melbourne" }, "home");
    expect(again.year_built.value).toBe("1989");
    expect(again.city.value).toBe("Melbourne");
  });

  it("Save sheet and Confirm quotes both persist the live form, not stale client state", () => {
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    const gate = source("src/components/deal/sheet-approve-gate.tsx");
    const action = source("src/app/actions/quote-sheet.ts");
    const quoting = source("src/app/actions/quoting.ts");
    const quotes = source("src/app/actions/quotes.ts");
    expect(sheet).toMatch(/data-ff-save-sheet/);
    expect(sheet).toMatch(/type="submit"/);
    expect(sheet).toMatch(/saveQuoteSheet/);
    expect(sheet).toMatch(/persistSheet/);
    expect(gate).toMatch(/persistSheet/);
    expect(gate).toMatch(/ff-master-sheet-save/);
    expect(action).toMatch(/persistQuoteSheetValues/);
    expect(action).toMatch(/submittedSheetValues/);
    expect(action).toMatch(/applySavedSheetToDeal/);
    expect(quoting).toMatch(/persistQuoteSheetValues/);
    expect(quoting).toMatch(/submittedSheetValues/);
    expect(quotes).toMatch(/applySavedSheetToDeal/);
  });

  it("Save sheet leaves a notice=sheet-saved flash that a toast layer can hook", () => {
    const action = source("src/app/actions/quote-sheet.ts");
    const page = source("src/app/deals/[id]/page.tsx");
    const flash = source("src/lib/desk/action-flash.ts");
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(flash).toMatch(/sheet-saved/);
    expect(flash).toMatch(/dealActionFlashHref/);
    expect(action).toMatch(/ACTION_FLASH.sheetSaved/);
    expect(action).toMatch(/dealActionFlashHref/);
    expect(action).toMatch(/notice: ACTION_FLASH.sheetSaved/);
    expect(action).toMatch(/str\(formData, "flash"\) === "0"/);
    expect(sheet).toMatch(/flash", "0"/);
    expect(page).toMatch(/data-ff-action-flash/);
    expect(page).toMatch(/SavedToast/);
    expect(page).toMatch(/isActionFlash\(notice, "sheetSaved"\)/);
  });
});
