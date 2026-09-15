import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  dealLineSwitcherHref,
  defaultFormForPackageLine,
  formatMailingLine,
  humanizeDealStage,
  lobsToBindForDeal,
  logBelongsToLine,
  mergePackageShopLines,
  mergeShopLinesKeepExisting,
  normalizePackageLines,
  packageCreateDraft,
  packageLinesFromForm,
  packageLinesFromFormOrUndefined,
  pickQuoteForLine,
  primaryPackageLine,
  quoteBelongsToLine,
  resolveActivePackageLine,
  resolveLineQuotingForm,
  resolveShopLineAndLob,
  resolveVisiblePackageLines,
  sheetHasUserData,
  unboundPolicyLines,
} from "./package-lines";

describe("package line selection", () => {
  it("defaults to Home when nothing is picked", () => {
    expect(normalizePackageLines([])).toEqual(["home"]);
    expect(normalizePackageLines(null)).toEqual(["home"]);
    expect(packageLinesFromForm(undefined)).toEqual(["home"]);
    expect(packageCreateDraft([]).shopLines).toEqual(["home"]);
    expect(packageCreateDraft([]).quotingForm).toBe("HO3");
    expect(packageCreateDraft([]).lineOfBusiness).toBe("HO");
  });

  it("keeps catalog order and includes Life / Commercial shop lines", () => {
    expect(normalizePackageLines(["flood", "life", "auto", "home", "bop"])).toEqual([
      "home",
      "auto",
      "flood",
      "bop",
      "life",
    ]);
    expect(primaryPackageLine(["flood", "auto"])).toBe("auto");
  });

  it("reads create-dialog checkboxes from FormData-like objects", () => {
    const form = {
      getAll: (name: string) => (name === "shopLines" ? ["auto", "flood"] : []),
      get: () => "",
    };
    expect(packageLinesFromForm(form)).toEqual(["auto", "flood"]);
    expect(packageLinesFromFormOrUndefined({ getAll: () => [], get: () => "" })).toBeUndefined();
  });
});

describe("package sheet creation + switcher routing", () => {
  it("seeds per-line default forms", () => {
    expect(defaultFormForPackageLine("home")).toBe("HO3");
    expect(defaultFormForPackageLine("auto")).toBe("PA");
    expect(defaultFormForPackageLine("flood")).toBe("FLOOD");
  });

  it("resolves visible chips from shopLines and falls back to a single LOB", () => {
    expect(resolveVisiblePackageLines({ shopLines: ["home", "auto"] })).toEqual(["home", "auto"]);
    expect(resolveVisiblePackageLines({ lineOfBusiness: "FLOOD" })).toEqual(["flood"]);
    expect(resolveVisiblePackageLines({ lineOfBusiness: "LIFE", shopLines: ["life"] })).toEqual([
      "life",
    ]);
  });

  it("routes the active chip from ?line= and keeps the deal URL", () => {
    expect(
      resolveActivePackageLine({
        lineParam: "flood",
        packageLines: ["home", "auto", "flood"],
        quotingLine: "home",
        lineOfBusiness: "HO",
      }),
    ).toBe("flood");
    expect(
      resolveActivePackageLine({
        lineParam: "life",
        packageLines: ["home", "auto"],
        quotingLine: "auto",
      }),
    ).toBe("auto");
    expect(
      dealLineSwitcherHref({ dealId: "deal-1", line: "auto", tab: "markets", product: "auto" }),
    ).toBe("/deals/deal-1?tab=markets&line=auto&product=auto");
  });

  it("prefers the active sheet form over a stale deal-level HO3", () => {
    expect(
      resolveLineQuotingForm({
        sheetValues: { quoting_form: { value: "PA", status: "confirmed", source: "agent" } },
        sheetLine: "auto",
        dealQuotingForm: "HO3",
        dealQuotingLine: "home",
        dealLineOfBusiness: "HO",
      }),
    ).toBe("PA");
    expect(
      resolveLineQuotingForm({
        sheetValues: {},
        sheetLine: "auto",
        dealQuotingForm: "HO3",
        dealQuotingLine: "home",
        dealLineOfBusiness: "HO",
      }),
    ).toBe("PA");
    expect(
      resolveLineQuotingForm({
        sheetValues: {},
        sheetLine: "home",
        dealQuotingForm: "HO6",
        dealQuotingLine: "home",
        dealLineOfBusiness: "HO",
      }),
    ).toBe("HO6");
  });

  it("hides unchecked package lines but keeps companion shop lines", () => {
    expect(mergePackageShopLines(["home", "auto", "general_liability"], ["home"])).toEqual([
      "home",
      "general_liability",
    ]);
    expect(mergeShopLinesKeepExisting(["home", "flood"], ["auto", "home"])).toEqual([
      "home",
      "flood",
      "auto",
    ]);
  });

  it("does not treat default quoting_form as user data when deciding to keep a sheet", () => {
    expect(
      sheetHasUserData({
        quoting_form: { value: "HO3", status: "confirmed", source: "agent" },
        sheet_product: { value: "homeowners", status: "confirmed", source: "agent" },
        applicant_name: { value: "", status: "missing", source: "blank" },
      }),
    ).toBe(false);
    expect(
      sheetHasUserData({
        quoting_form: { value: "HO3", status: "confirmed", source: "agent" },
        coverage_a: { value: "321000", status: "confirmed", source: "agent" },
      }),
    ).toBe(true);
  });
});

describe("single-line deals stay backward compatible", () => {
  it("Life / Health resolve as their own shop lines (chips, not a PC-only switcher)", () => {
    expect(resolveVisiblePackageLines({ lineOfBusiness: "LIFE", quotingLine: "life" })).toEqual([
      "life",
    ]);
    expect(resolveVisiblePackageLines({ shopLines: ["health"], lineOfBusiness: "HEALTH" })).toEqual([
      "health",
    ]);
  });

  it("single HO shopLines still resolve as one Home line", () => {
    expect(resolveVisiblePackageLines({ shopLines: ["home"], lineOfBusiness: "HO" })).toEqual([
      "home",
    ]);
    expect(
      resolveActivePackageLine({
        packageLines: ["home"],
        lineOfBusiness: "HO",
      }),
    ).toBe("home");
    expect(packageCreateDraft(["home"]).riskType).toBe("property");
    expect(packageCreateDraft(["auto"]).riskType).toBe("auto");
  });
});

describe("multi-line bind path", () => {
  it("binds one policy per package line and skips already-bound LOBs", () => {
    expect(lobsToBindForDeal({ shopLines: ["home"], lineOfBusiness: "HO" })).toEqual(["HO"]);
    expect(lobsToBindForDeal({ shopLines: ["home", "auto", "flood"], lineOfBusiness: "HO" })).toEqual(
      ["HO", "AUTO", "FLOOD"],
    );
    expect(
      unboundPolicyLines(["HO", "AUTO", "FLOOD"], [{ lineOfBusiness: "HO" }]),
    ).toEqual(["AUTO", "FLOOD"]);
  });

  it("picks the bindable quote for the active line and leaves untagged quotes on the primary", () => {
    const logs = [
      { id: "log-ho", lineOfBusiness: "HO" },
      { id: "log-auto", lineOfBusiness: "AUTO" },
    ];
    const quotes = [
      { bindable: true, quoteAttemptLogId: "log-ho", premium: "1800" },
      { bindable: true, quoteAttemptLogId: "log-auto", premium: "900" },
    ];
    expect(pickQuoteForLine(quotes, logs, "AUTO")?.premium).toBe("900");
    expect(pickQuoteForLine(quotes, logs, "HO")?.premium).toBe("1800");
    expect(
      pickQuoteForLine([{ bindable: true, quoteAttemptLogId: null, premium: "10" }], [], "AUTO", {
        primaryLob: "HO",
      }),
    ).toBeUndefined();
    expect(
      pickQuoteForLine([{ bindable: true, quoteAttemptLogId: null, premium: "10" }], [], "HO", {
        primaryLob: "HO",
      })?.premium,
    ).toBe("10");
  });

  it("filters markets/quotes rows onto the active chip", () => {
    expect(
      quoteBelongsToLine({
        quoteAttemptLogId: "log-auto",
        logs: [{ id: "log-auto", lineOfBusiness: "AUTO" }],
        lob: "AUTO",
        isPrimaryLine: false,
      }),
    ).toBe(true);
    expect(
      quoteBelongsToLine({
        quoteAttemptLogId: "log-auto",
        logs: [{ id: "log-auto", lineOfBusiness: "AUTO" }],
        lob: "HO",
        isPrimaryLine: true,
      }),
    ).toBe(false);
    expect(
      quoteBelongsToLine({
        quoteAttemptLogId: null,
        logs: [],
        lob: "HO",
        isPrimaryLine: true,
      }),
    ).toBe(true);
    expect(logBelongsToLine("AUTO", "AUTO", false)).toBe(true);
    expect(logBelongsToLine("AUTO", "HO", true)).toBe(false);
    expect(logBelongsToLine(null, "HO", true)).toBe(true);
  });

  it("resolves shop line + LOB for market requests without changing single-line defaults", () => {
    expect(resolveShopLineAndLob({ quotingLine: "home", lineOfBusiness: "HO" })).toEqual({
      line: "home",
      lob: "HO",
    });
    expect(resolveShopLineAndLob({ override: "auto", lineOfBusiness: "HO" })).toEqual({
      line: "auto",
      lob: "AUTO",
    });
    expect(resolveShopLineAndLob({ override: "FLOOD", quotingLine: "home" })).toEqual({
      line: "flood",
      lob: "FLOOD",
    });
  });
});

describe("shared shell helpers", () => {
  it("formats mailing and stage once for the deal, not per line", () => {
    expect(
      formatMailingLine({
        address1: "12 Oak St",
        city: "Palm Bay",
        state: "FL",
        zip: "32909",
      }),
    ).toBe("12 Oak St · Palm Bay, FL · 32909");
    expect(humanizeDealStage("quote_sent")).toBe("Quote Sent");
    expect(humanizeDealStage("gather")).toBe("Gather info");
    expect(humanizeDealStage("Gather")).toBe("Gather info");
    expect(humanizeDealStage("Gather Info")).toBe("Gather info");
  });
});

describe("create + detail wiring", () => {
  it("Add New Deal collects package lines and Save persists them; detail switches on ?line=", () => {
    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/data-ff-package-lines/);
    expect(dialog).toMatch(/ProductPicker/);
    expect(dialog).toMatch(/newDealCreateHref/);
    const picker = readFileSync("src/components/deals/product-picker.tsx", "utf8");
    const catalog = readFileSync("src/lib/deals/deal-products.ts", "utf8");
    expect(picker).toMatch(/shopProducts/);
    expect(picker).toMatch(/item\.label/);
    expect(catalog).toMatch(/Home \(HO\)/);
    expect(catalog).toMatch(/label: "Auto"/);
    expect(catalog).toMatch(/label: "Flood"/);
    expect(catalog).toMatch(/label: "Term Life"/);
    expect(catalog).toMatch(/label: "Marketplace"/);
    const createPage = readFileSync("src/app/deals/new/page.tsx", "utf8");
    expect(createPage).toMatch(/NewDealCreateFields/);
    expect(createPage).toMatch(/createDeal/);
    const save = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(save).toMatch(/packageDraftForNewDealSave/);
    expect(save).toMatch(/insertSheetsForDeal\(deal\.id, shopLines\)/);
    const copy = readFileSync("src/app/actions/deal-create.ts", "utf8");
    expect(copy).toMatch(/packageCreateDraft/);
    expect(copy).toMatch(/insertBlankSheets/);
    const page = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(page).toMatch(/data-ff-deal-line-switcher|DealLineSwitcher/);
    expect(page).toMatch(/DealPackageShell/);
    expect(page).toMatch(/resolveActivePackageLine/);
    expect(page).not.toMatch(/DealLineSelector/);
  });
});
