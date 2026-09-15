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
  normalizeCommercialPackageLines,
  normalizePackageLines,
  normalizeSelectedPackageLines,
  packageCreateDraft,
  packageFamilyOf,
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
  shopLinesAfterCascadeForm,
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

  it("keeps Home + Auto + Flood in chip order and ignores Life/Commercial", () => {
    expect(normalizePackageLines(["flood", "life", "auto", "home", "bop"])).toEqual([
      "home",
      "auto",
      "flood",
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
    expect(resolveVisiblePackageLines({ lineOfBusiness: "LIFE", shopLines: ["life"] })).toEqual([]);
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
  it("does not invent a package switcher for Life / Health", () => {
    expect(resolveVisiblePackageLines({ lineOfBusiness: "LIFE", quotingLine: "life" })).toEqual([]);
    expect(resolveVisiblePackageLines({ shopLines: ["health"], lineOfBusiness: "HEALTH" })).toEqual(
      [],
    );
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

describe("commercial package selection + sheets + routing", () => {
  it("defaults to GL and keeps GL → WC → BOP order without mixing personal or Life", () => {
    expect(normalizeCommercialPackageLines([])).toEqual(["general_liability"]);
    expect(normalizeSelectedPackageLines(["bop", "life", "home", "workers_comp"])).toEqual([
      "home",
    ]);
    expect(normalizeSelectedPackageLines(["bop", "workers_comp", "general_liability"])).toEqual([
      "general_liability",
      "workers_comp",
      "bop",
    ]);
    expect(packageFamilyOf(["general_liability", "bop"])).toBe("commercial");
    expect(packageFamilyOf(["home", "general_liability"])).toBe("personal");
    expect(packageLinesFromForm({ getAll: () => ["workers_comp", "bop"], get: () => "" })).toEqual([
      "workers_comp",
      "bop",
    ]);
    expect(packageCreateDraft(["bop", "workers_comp"])).toMatchObject({
      shopLines: ["workers_comp", "bop"],
      quotingLine: "workers_comp",
      quotingForm: "WC",
      lineOfBusiness: "WC",
      family: "commercial",
      accountKind: "commercial",
      bindTarget: "account",
    });
  });

  it("seeds per-line GL / WC / BOP forms and routes ?line=", () => {
    expect(defaultFormForPackageLine("general_liability")).toBe("GL");
    expect(defaultFormForPackageLine("workers_comp")).toBe("WC");
    expect(defaultFormForPackageLine("bop")).toBe("BOP");
    expect(
      resolveVisiblePackageLines({ shopLines: ["general_liability", "bop"] }),
    ).toEqual(["general_liability", "bop"]);
    expect(resolveVisiblePackageLines({ lineOfBusiness: "WC" })).toEqual(["workers_comp"]);
    expect(
      resolveVisiblePackageLines({
        shopLines: ["home", "auto", "general_liability"],
        lineOfBusiness: "HO",
      }),
    ).toEqual(["home", "auto"]);
    expect(
      resolveActivePackageLine({
        lineParam: "bop",
        packageLines: ["general_liability", "workers_comp", "bop"],
        quotingLine: "general_liability",
        lineOfBusiness: "GL",
      }),
    ).toBe("bop");
    expect(
      dealLineSwitcherHref({ dealId: "deal-9", line: "workers_comp", tab: "quotes" }),
    ).toBe("/deals/deal-9?tab=quotes&line=workers_comp");
  });

  it("creates a commercial sheet draft and binds one policy per commercial line", () => {
    expect(packageCreateDraft(["general_liability"]).quotingForm).toBe("GL");
    expect(
      lobsToBindForDeal({
        shopLines: ["general_liability", "workers_comp", "bop"],
        lineOfBusiness: "GL",
      }),
    ).toEqual(["GL", "WC", "BOP"]);
    expect(
      unboundPolicyLines(["GL", "WC", "BOP"], [{ lineOfBusiness: "GL" }]),
    ).toEqual(["WC", "BOP"]);
    expect(
      mergePackageShopLines(["general_liability", "home"], ["general_liability", "bop"]),
    ).toEqual(["general_liability", "bop", "home"]);
  });

  it("switches family when cascade form becomes Commercial, without mixing Life/Health", () => {
    expect(shopLinesAfterCascadeForm(["home", "auto"], "general_liability")).toEqual([
      "general_liability",
    ]);
    expect(shopLinesAfterCascadeForm(["general_liability", "bop"], "home")).toEqual([
      "general_liability",
      "bop",
      "home",
    ]);
    expect(resolveVisiblePackageLines({ shopLines: ["life"], lineOfBusiness: "LIFE" })).toEqual([]);
  });
});

describe("create + detail wiring", () => {
  it("Add New Deal collects package lines and Save persists them; detail switches on ?line=", () => {
    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/data-ff-package-lines/);
    expect(dialog).toMatch(/PackageLineCheckboxes/);
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).toMatch(/shopLines/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).toMatch(/Home/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).toMatch(/Auto/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).toMatch(/Flood/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).not.toMatch(/Life/);
    expect(readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8")).not.toMatch(/Health/);
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
    const checkboxes = readFileSync("src/components/deals/package-line-checkboxes.tsx", "utf8");
    expect(checkboxes).toMatch(/COMMERCIAL_PACKAGE_LINES/);
    expect(checkboxes).toMatch(/general_liability/);
    expect(checkboxes).toMatch(/Workers' Comp/);
    expect(checkboxes).toMatch(/BOP/);
    expect(checkboxes).not.toMatch(/Life/);
    expect(checkboxes).not.toMatch(/Health/);
    expect(checkboxes).not.toMatch(/commercial_auto/);
    const pkg = readFileSync("src/lib/deals/package-lines.ts", "utf8");
    expect(pkg).toMatch(/general_liability/);
    expect(pkg).toMatch(/workers_comp/);
    expect(pkg).toMatch(/\bbop\b/);
    expect(readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8")).toMatch(
      /PackageFamilyToggle/,
    );
    expect(readFileSync("src/app/actions/quote-sheet.ts", "utf8")).toMatch(
      /normalizeSelectedPackageLines/,
    );
  });
});
