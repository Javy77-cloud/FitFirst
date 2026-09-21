import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import type { Carrier, Quote } from "@/lib/db/schema";
import { dealTitleForActiveProduct } from "./deal-title";
import { quotesTabMark } from "./quote-completeness";
import {
  nextShopFlowAfterSheetConfirm,
  nextShopFlowAfterSheetEdit,
  sheetNeedsRecheckCue,
} from "./shop-flow";
import {
  productChipLabel,
  selectedQuoteRowLabel,
} from "./product-stages";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function quote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
  return {
    tenantId: "t",
    dealId: "deal-1",
    riskId: "risk-1",
    carrierId: "car-1",
    quoteAttemptLogId: null,
    quoteNumber: null,
    premium: "1840",
    hurricaneDeductible: null,
    aopDeductible: null,
    coverageA: 310000,
    bindable: true,
    riskOutcome: "bindable",
    nextStep: "can_bind",
    coverageGaps: [],
    notes: "HO3 bindable",
    carrierOpenUrl: null,
    lostReason: null,
    agentRating: null,
    agentStatus: "new",
    reasonForNo: null,
    bindRequirements: null,
    stub: false,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    quoteRunId: null,
    shopLine: "home",
    bindRecheckAckedAt: null,
    bindRecheckAckFingerprint: null,
    ...partial,
  } as Quote;
}

const carrier = {
  id: "car-1",
  tenantId: "t",
  name: "Citizens",
  writtenLines: ["HO"],
} as Carrier;

describe("Javy live follow-ups after PR #28", () => {
  it("Gloria HO3→DP3 chip updates the title suffix even when the shared sheet is HO3", () => {
    expect(productChipLabel({ product: "landlord", quotingForm: "HO3" })).toBe("DP3");
    expect(
      dealTitleForActiveProduct({
        title: "Gloria Martinez / HO3",
        product: "landlord",
        quotingForm: "HO3",
        sheetForm: null,
      }),
    ).toBe("Gloria Martinez / DP3");
    expect(
      dealTitleForActiveProduct({
        title: "Heather Camirand / HO3",
        product: "auto",
        quotingForm: "HO3",
      }),
    ).toBe("Heather Camirand / Auto");
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/sheetFormForProduct\(activeProduct, lineForm\)/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/dealTitleForActiveProduct/);
  });

  it("drops the misleading products ready fraction", () => {
    const html = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-gloria",
        products: ["homeowners", "landlord"],
        active: "landlord",
        tab: "quotes",
        stages: { homeowners: { stage: "quotes" }, landlord: { stage: "quotes" } },
      }),
    );
    expect(html).toContain("Products");
    expect(html).not.toMatch(/0\/2 ready|0 of 2 ready|data-ff-product-ready-count/);
    expect(source("src/components/deal/deal-line-switcher.tsx")).not.toMatch(
      /data-ff-product-ready-count/,
    );
  });

  it("marks the Quotes tab green when a bindable exists, red when none do", () => {
    expect(
      quotesTabMark({
        quotes: [{ bindable: true, stub: false }],
        requested: true,
      }),
    ).toBe("bindable");
    expect(
      quotesTabMark({
        quotes: [{ bindable: false, stub: false }],
        requested: true,
      }),
    ).toBe("none_bindable");
    expect(quotesTabMark({ quotes: [], requested: true })).toBe("none_bindable");
    expect(quotesTabMark({ quotes: [], requested: false })).toBeNull();
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/quotesTabMark/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/complete: flowCompletion\.isComplete\(id\)/);
    expect(source("src/components/desk/pending-tab-list.tsx")).toMatch(
      /data-ff-quotes-tab-mark="bindable"/,
    );
    expect(source("src/components/desk/pending-tab-list.tsx")).toMatch(
      /data-ff-quotes-tab-mark="none_bindable"/,
    );
  });

  it("keeps first-time sheet confirm on Markets and later visual approve on Quotes", () => {
    const first = renderToString(
      createElement(SheetApproveGate, {
        dealId: "deal-1",
        line: "home",
        formLabel: "HO3",
        unlocked: false,
      }),
    );
    expect(first).toMatch(/data-ff-sheet-approve-state="first"/);
    expect(first).toMatch(/data-ff-sheet-visual-review/);
    expect(first).toContain("Confirm opens Markets");

    const reedit = renderToString(
      createElement(SheetApproveGate, {
        dealId: "deal-1",
        line: "home",
        product: "landlord",
        formLabel: "DP3",
        unlocked: true,
        needsReapprove: true,
        hasRequestedQuotes: true,
      }),
    );
    expect(reedit).toMatch(/data-ff-sheet-approve-state="reapprove"/);
    expect(reedit).toMatch(/data-ff-sheet-visual-review/);
    expect(reedit).toContain("Confirm opens Quotes");
    expect(reedit).not.toContain("Go to Markets");

    const afterQuotes = renderToString(
      createElement(SheetApproveGate, {
        dealId: "deal-1",
        line: "home",
        formLabel: "HO3",
        unlocked: true,
        hasRequestedQuotes: true,
      }),
    );
    expect(afterQuotes).toMatch(/data-ff-sheet-go-quotes/);
    expect(afterQuotes).toContain("Go to Quotes");

    const cued = nextShopFlowAfterSheetEdit({
      saved: { marketsFingerprint: "abc", quotesFingerprint: "abc" },
      line: "home",
    });
    expect(sheetNeedsRecheckCue(cued, "home")).toBe(true);
    expect(sheetNeedsRecheckCue(nextShopFlowAfterSheetConfirm({ saved: cued, line: "home" }), "home")).toBe(
      false,
    );
    expect(source("src/app/actions/quoting.ts")).toMatch(/persistSheetConfirmClear/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/needsVisualReapprove/);
  });

  it("syncs the selected carrier row label with the product stage", () => {
    expect(selectedQuoteRowLabel("quote_sent")).toBe("Quote sent");
    expect(selectedQuoteRowLabel("bound")).toBe("Bound");
    expect(selectedQuoteRowLabel("pending_inspection")).toBe("Pending inspection");
    expect(selectedQuoteRowLabel("closed_won")).toBe("Closed won");
    const sent = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        selectedQuoteIds: ["q1"],
        productStage: "quote_sent",
        rows: [{ quote: quote({ id: "q1" }), carrier }],
      }),
    );
    expect(sent).toMatch(/data-ff-quote-stage-badge="Quote sent"/);
    expect(sent).toContain("Quote sent");
    expect(sent).not.toContain("BOUND");

    const bound = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        selectedQuoteIds: ["q1"],
        productStage: "bound",
        boundQuoteId: "q1",
        rows: [{ quote: quote({ id: "q1", agentStatus: "bound" }), carrier }],
      }),
    );
    expect(bound).toContain("BOUND");
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/productChipBound\(activeProductState\.stage\)/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/productStage=\{displayProductStage/);
  });

  it("moves the status stamp down and leaves trail crumbs unchanged", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\.ff-deal-stamp-row \{[\s\S]*top: 13\.5rem;/);
    expect(css).toMatch(/\.ff-deal-stamp-row \{[\s\S]*position: absolute;/);
    expect(css).not.toMatch(/\.ff-deal-status-stamp \{[^}]*position:\s*sticky/);
    const trail = source("src/components/desk/desk-page-trail.tsx");
    expect(trail).toMatch(/data-ff-desk-crumb="link"/);
    expect(trail).not.toMatch(/border-navy bg-navy text-white/);
  });
});
