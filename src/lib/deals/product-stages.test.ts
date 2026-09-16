import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import type { Carrier, Quote } from "@/lib/db/schema";
import { writesDealLine } from "@/lib/domain";
import { productQuoteCompleteness } from "./quote-completeness";
import { pickBoundQuoteId } from "./status-stamp";
import {
  canonicalizeProductStage,
  displayProductStage,
  isBoardNoopStage,
  lateStageNeedsQuoteSelection,
  parseInspectionStatus,
  parseProductStages,
  productChipBound,
  productChipLabel,
  productChipStageLabel,
  productChipStageLabelForState,
  productStampStage,
  productReadyFromQuotes,
  productStageFor,
  PRODUCT_LOST_REASON_LABELS,
  selectedQuoteRowLabel,
  setProductStage,
  sheetFormForProduct,
  shouldAutoAdvanceStage,
} from "./product-stages";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const carrier = {
  id: "car-1",
  tenantId: "t",
  name: "Citizens",
  writtenLines: ["HO"],
} as Carrier;

function quote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
  return {
    tenantId: "t",
    dealId: "deal-1",
    riskId: "risk-1",
    carrierId: "car-1",
    quoteAttemptLogId: null,
    quoteNumber: null,
    premium: "1200",
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

describe("per-product stages", () => {
  it("canonicalizes leftover slugs and treats inspection as a flag", () => {
    expect(canonicalizeProductStage("review")).toBe("quote_review");
    expect(canonicalizeProductStage("gather")).toBe("gathering");
    expect(canonicalizeProductStage("quotes")).toBe("markets");
    expect(canonicalizeProductStage("pending_inspection")).toBe("bound");
    expect(parseInspectionStatus("before_bind")).toBe("before_bind");
    expect(parseInspectionStatus("nope")).toBe("none");
    expect(isBoardNoopStage("quote_sent")).toBe(true);
    expect(isBoardNoopStage("policy_issued")).toBe(true);
    expect(isBoardNoopStage("markets")).toBe(false);
    expect(shouldAutoAdvanceStage("gathering", "markets")).toBe(true);
    expect(shouldAutoAdvanceStage("quote_sent", "markets")).toBe(false);
    const leftover = parseProductStages({
      homeowners: { stage: "pending_inspection", selectedQuoteIds: ["q1"] },
    });
    expect(leftover.homeowners?.stage).toBe("bound");
    expect(leftover.homeowners?.inspectionStatus).toBe("before_bind");
  });

  it("keeps Gloria Homeowners Quote sent off Landlord", () => {
    const next = setProductStage({}, "homeowners", { stage: "quote_sent", selectedQuoteIds: ["q-ho3"] });
    expect(productStageFor(next, "homeowners").stage).toBe("quote_sent");
    expect(productStageFor(next, "landlord").stage).toBe("gathering");
    expect(productStageFor({}, "homeowners", "quote_sent").stage).toBe("quote_review");
    expect(productStageFor(next, "landlord").selectedQuoteIds).toEqual([]);
    expect(parseProductStages(next).landlord).toBeUndefined();
    expect(productChipLabel({ product: "homeowners", quotingForm: "HO3" })).toBe("HO3");
    expect(productChipLabel({ product: "landlord", quotingForm: "DP3" })).toBe("DP3");
    expect(productChipLabel({ product: "landlord", quotingForm: "HO3" })).toBe("DP3");
    expect(productChipLabel({ product: "homeowners", quotingForm: "DP3" })).toBe("HO3");
    expect(productChipLabel({ product: "homeowners" })).toBe("HO3");
    expect(productChipLabel({ product: "landlord" })).toBe("DP3");
    expect(productChipLabel({ product: "auto", quotingForm: "PA" })).toBe("Auto");
    expect(productChipLabel({ product: "auto" })).toBe("Auto");
    expect(productChipLabel({ product: "flood", quotingForm: "FLOT" })).toBe("Flood");
    expect(productChipLabel({ product: "flood" })).toBe("Flood");
    expect(sheetFormForProduct("homeowners", "HO5")).toBe("HO5");
    expect(sheetFormForProduct("landlord", "HO3")).toBeNull();
    expect(sheetFormForProduct("landlord", "DP3")).toBe("DP3");
  });

  it("blocks late stages until a quote is selected — never auto-binds cheapest", () => {
    expect(lateStageNeedsQuoteSelection({ stage: "quote_sent", selectedQuoteIds: [] })).toBe(true);
    expect(lateStageNeedsQuoteSelection({ stage: "bound", selectedQuoteIds: ["q1"] })).toBe(false);
    expect(lateStageNeedsQuoteSelection({ stage: "policy_issued", selectedQuoteIds: [] })).toBe(true);
    expect(
      lateStageNeedsQuoteSelection({
        stage: "quote_sent",
        selectedQuoteIds: ["gone"],
        liveQuoteIds: [],
      }),
    ).toBe(true);
    expect(
      lateStageNeedsQuoteSelection({
        stage: "quote_sent",
        selectedQuoteIds: ["q1"],
        liveQuoteIds: ["q1"],
      }),
    ).toBe(false);
    expect(setProductStage({}, "homeowners", { stage: "quote_sent", selectedQuoteIds: [] }).homeowners)
      .toMatchObject({ stage: "quote_review", selectedQuoteIds: [] });
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/livePicked/);
    expect(lateStageNeedsQuoteSelection({ stage: "pending_inspection", selectedQuoteIds: [] })).toBe(
      true,
    );
    expect(
      pickBoundQuoteId({
        dealBound: true,
        quotes: [
          { id: "cheap", bindable: true, agentStatus: "new" },
          { id: "other", bindable: true, agentStatus: "new" },
        ],
      }),
    ).toBeNull();
    expect(
      pickBoundQuoteId({
        selectedQuoteIds: ["other"],
        quotes: [
          { id: "cheap", bindable: true, agentStatus: "new" },
          { id: "other", bindable: true, agentStatus: "new" },
        ],
      }),
    ).toBe("other");
    expect(source("src/app/actions/product-stage.ts")).toMatch(/need_quote/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/liveQuoteIdsForProduct/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/liveSelectedQuoteIds/);
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/data-ff-choose-quote-dialog/);
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/disabled=\{\!livePicked\(\)\.length/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/liveQuoteIds/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/preScoped/);
    expect(source("src/app/actions/pipeline.ts")).toMatch(/allowLate/);
    expect(source("src/app/actions/pipeline.ts")).toMatch(/isBoardNoopStage/);
    expect(source("src/components/pipeline/kanban.tsx")).toMatch(/isBoardNoopStage/);
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(/QuotesBindableSignal/);
    expect(source("src/lib/files/serve-document.ts")).toMatch(/missingFileResponse/);
    expect(source("src/lib/files/serve-document.ts")).toMatch(/readStoredFile/);
  });

  it("counts ready from product quotes, not a shared home sheet", () => {
    const ho3 = productQuoteCompleteness({
      product: "homeowners",
      multiLine: true,
      logs: [],
      quotes: [quote({ id: "ho3", notes: "HO3 bindable" })],
    });
    const dp3 = productQuoteCompleteness({
      product: "landlord",
      multiLine: true,
      logs: [],
      quotes: [quote({ id: "ho3", notes: "HO3 bindable" })],
    });
    expect(ho3.complete).toBe(true);
    expect(dp3.complete).toBe(false);
    expect(productReadyFromQuotes({ complete: ho3.complete })).toBe(true);
    expect(productReadyFromQuotes({ complete: dp3.complete })).toBe(false);
  });

  it("filters markets by written line", () => {
    expect(writesDealLine(["HO"], "HO")).toBe(true);
    expect(writesDealLine(["HO"], "AUTO")).toBe(false);
    expect(writesDealLine(["FLOOD"], "FLOOD")).toBe(true);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(
      /evaluateDealMarkets\(risk, activeSheet\.values, activeLob\)/,
    );
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/carriersForDealLine/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/lastRequestCarrierIds/);
    expect(source("src/lib/appetite/evaluate-deal.ts")).toMatch(/dealLineOverride/);
  });

  it("does not invent three Previous sections from bindable / conditional / declined", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-1",
        shopLine: "home",
        currentQuoteRunId: "run-2",
        multiLine: true,
        quotes: [
          { quote: quote({ id: "cur", quoteRunId: "run-2", riskOutcome: "bindable" }), carrier },
          {
            quote: quote({
              id: "prev-b",
              quoteRunId: "run-1",
              riskOutcome: "bindable",
              createdAt: new Date("2026-08-01T12:00:00Z"),
            }),
            carrier,
          },
          {
            quote: quote({
              id: "prev-c",
              quoteRunId: "run-1",
              riskOutcome: "conditional",
              carrierId: "car-2",
              createdAt: new Date("2026-08-01T12:00:00Z"),
            }),
            carrier: { ...carrier, id: "car-2", name: "Universal" },
          },
          {
            quote: quote({
              id: "prev-d",
              quoteRunId: "run-1",
              riskOutcome: "declined",
              carrierId: "car-3",
              createdAt: new Date("2026-08-01T12:00:00Z"),
            }),
            carrier: { ...carrier, id: "car-3", name: "Tower" },
          },
        ],
        logs: [],
      }),
    );
    expect(html).toMatch(/data-ff-quote-prior="cur"/);
    expect((html.match(/Previous quotes ·/g) ?? []).length).toBe(0);
    expect(html).not.toMatch(/data-ff-quotes-previous=/);
  });

  it("cues Quotes Recheck on sheet save and clears unlock only when rating-critical", () => {
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(
      /persistSheetRecheckCue\(dealId, line\)/,
    );
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(
      /persistSheetRecheckCue\(dealId, primary\)/,
    );
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(
      /markShopFlowStaleAfterRiskChange\(dealId, line/,
    );
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(/ratingCritical/);
    expect(source("src/lib/deals/shop-flow-persist.ts")).toMatch(/quotesOnly/);
    expect(source("src/app/actions/documents.ts")).toMatch(/shopLineFromSourceDoc/);
    expect(source("src/app/actions/comms.ts")).toMatch(/persistDealEmailAttachments/);
    expect(source("src/lib/deals/shop-flow-persist.ts")).toMatch(/sheet_invalidated/);
    expect(source("src/lib/deals/shop-flow-persist.ts")).toMatch(/staleShopFlowForLine/);
    expect(source("src/lib/crm/signals.ts")).toMatch(/sheet_invalidated/);
  });

  it("keeps the stamp off position:sticky and list stage on list", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\.ff-deal-status-stamp \{[\s\S]*position: absolute;/);
    expect(css).toMatch(/\.ff-deal-status-stamp \{[\s\S]*top: 13\.5rem;/);
    expect(css).not.toMatch(/\.ff-deal-status-stamp \{[\s\S]*position: sticky;/);
    expect(productChipStageLabel("review")).toBe("Quote review");
    expect(productChipStageLabel("quote_review")).toBe("Quote review");
    expect(productChipStageLabel("quote_sent")).toBe("Quote sent");
    expect(productChipStageLabel("policy_issued")).toBe("Policy issued");
    expect(productChipStageLabel("gather")).toBeNull();
    expect(productChipStageLabel("gathering")).toBeNull();
    expect(
      productChipStageLabelForState({ stage: "quote_sent", selectedQuoteIds: [] }),
    ).toBe("Quote review");
    expect(
      productChipStageLabelForState({ stage: "quote_sent", selectedQuoteIds: ["q1"] }),
    ).toBe("Quote sent");
    expect(
      displayProductStage({ stage: "quote_sent", selectedQuoteIds: [], fallback: "quote_sent" }),
    ).toBe("quote_review");
    expect(
      displayProductStage({ stage: "quote_sent", selectedQuoteIds: ["q1"], fallback: "gather" }),
    ).toBe("quote_sent");
    expect(productChipBound("bound")).toBe(true);
    expect(productChipBound("review")).toBe(false);
    expect(selectedQuoteRowLabel("quote_sent")).toBe("Quote sent");
    expect(selectedQuoteRowLabel("pending_inspection")).toBe("Pending inspection");
    expect(selectedQuoteRowLabel("closed_won")).toBe("Closed won");
    expect(
      productStampStage({ stage: "quote_sent", selectedQuoteIds: [], lostReason: null }),
    ).toBeNull();
    expect(
      productStampStage({ stage: "quote_sent", selectedQuoteIds: ["q1"], lostReason: null }),
    ).toBe("quote_sent");
    expect(
      productStampStage({ stage: "review", selectedQuoteIds: [], lostReason: null }, "quote_sent"),
    ).toBeNull();
    expect(
      productStampStage(
        { stage: "quote_sent", selectedQuoteIds: ["stale"], lostReason: null },
        "quote_sent",
        new Date("2026-09-01"),
        [],
      ),
    ).toBeNull();
    expect(
      displayProductStage({
        stage: "quote_sent",
        selectedQuoteIds: ["stale"],
        fallback: "quote_sent",
        liveQuoteIds: [],
      }),
    ).toBe("quote_review");
    expect(
      parseProductStages({ homeowners: { stage: "quote_sent", selectedQuoteIds: [] } }).homeowners
        ?.stage,
    ).toBe("quote_sent");
    expect(
      parseProductStages({
        homeowners: { stage: "quote_sent", selectedQuoteIds: ["q-ho3"] },
      }).homeowners?.stage,
    ).toBe("quote_sent");
    expect(source("src/lib/deals/pipeline-sheet.ts")).toMatch(/const view = input\.view \?\? "list"/);
    expect(source("src/lib/deals/pipeline-sheet.ts")).not.toMatch(/view: "board"/);
    expect(source("src/app/deals/page.tsx")).toMatch(/boardWhenNoPipeline=\{null\}/);
    expect(source("src/app/deals/page.tsx")).toMatch(/newHref="\/deals\?view=list"/);
  });

  it("wires choose-quote, lost reasons, attach ids, and speech finals", () => {
    expect(PRODUCT_LOST_REASON_LABELS.current_coverage_better).toBe("Current coverage better");
    expect(PRODUCT_LOST_REASON_LABELS.no_better_offer).toBe("No better offer");
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/data-ff-product-lost-dialog/);
    expect(source("src/app/actions/comms.ts")).toMatch(/attachmentIds/);
    expect(source("src/lib/quotes/speech-note.ts")).toMatch(/collectFinalSpeechTranscript/);
    expect(source("src/components/deal/quote-note-pad.tsx")).toMatch(/prepareSpeechMicrophone/);
    expect(source("src/components/deal/quotes-results-table.tsx")).toMatch(/data-ff-quote-select/);
  });
});
