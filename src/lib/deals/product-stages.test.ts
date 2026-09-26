import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { QuotesPanel } from "@/components/deal/quotes-panel";
import type { Carrier, Quote } from "@/lib/db/schema";
import { writesDealLine } from "@/lib/domain";
import { productQuoteCompleteness } from "./quote-completeness";
import { pickBoundQuoteId } from "./status-stamp";
import {
  canonicalizeProductStage,
  displayProductStage,
  findProductNoticeForTask,
  isBoardNoopStage,
  isQuotesOnlyBoardStage,
  lateStageNeedsQuoteSelection,
  listProductStageChips,
  listProductStageLabel,
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
  workspaceTabForProductStage,
  listProductStageHref,
  attachListProductStageHrefs,
  isDealListNotesColumn,
  isHeatherCamirandDeal,
  joinProductListNotes,
  listProductNotes,
  splitConcatenatedProductListNotes,
  syncProductListNotes,
  noticeNoteLog,
  stripStaleCamirandProductNotices,
} from "./product-stages";
import { markProductIssuedDone } from "@/lib/policy/dec-prompt";

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
    expect(parseInspectionStatus("before_bind")).toBe("inspection_before_bind");
    expect(parseInspectionStatus("carrier_post_bind")).toBe("check_mortgagee_payment");
    expect(parseInspectionStatus("")).toBe("none");
    expect(parseInspectionStatus(null)).toBe("none");
    expect(isBoardNoopStage("quote_sent")).toBe(true);
    expect(isBoardNoopStage("policy_issued")).toBe(true);
    expect(lateStageNeedsQuoteSelection({ stage: "policy_issued", selectedQuoteIds: ["q1"] })).toBe(
      false,
    );
    expect(productChipStageLabel("policy_issued")).toBe("Policy issued");
    expect(isBoardNoopStage("markets")).toBe(false);
    const customBoard = [
      { slug: "gathering", sortOrder: 0 },
      { slug: "needs_photos", sortOrder: 1 },
      { slug: "markets", sortOrder: 2 },
      { slug: "quote_review", sortOrder: 3 },
      { slug: "quote_sent", sortOrder: 4 },
      { slug: "uw_hold", sortOrder: 5 },
    ];
    expect(isQuotesOnlyBoardStage("needs_photos", customBoard)).toBe(false);
    expect(isQuotesOnlyBoardStage("uw_hold", customBoard)).toBe(true);
    expect(isQuotesOnlyBoardStage("quote_sent", customBoard)).toBe(true);
    expect(isQuotesOnlyBoardStage("markets", customBoard)).toBe(false);
    expect(shouldAutoAdvanceStage("gathering", "markets")).toBe(true);
    expect(shouldAutoAdvanceStage("quote_sent", "markets")).toBe(false);
    const leftover = parseProductStages({
      homeowners: { stage: "pending_inspection", selectedQuoteIds: ["q1"] },
    });
    expect(leftover.homeowners?.stage).toBe("bound");
    expect(leftover.homeowners?.inspectionStatus).toBe("inspection_before_bind");
    expect(leftover.homeowners?.noticeType).toBe("inspection_before_bind");
    const cleared = parseProductStages({
      homeowners: { stage: "pending_inspection", selectedQuoteIds: ["q1"], noticeType: "none" },
    });
    expect(cleared.homeowners?.noticeType).toBe("none");
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
    expect(productChipLabel({ product: "life_term", quotingForm: "HO3" })).toBe("Term Life");
    expect(productChipLabel({ product: "life_term", quotingForm: "Term Life" })).toBe("Term Life");
    expect(
      listProductStageChips({
        shopLines: ["home"],
        lineOfBusiness: "LIFE",
        quotingLine: "life",
        quotingForm: "Term Life",
      }).map((chip) => chip.label),
    ).toEqual(["Term Life"]);
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
    expect(source("src/app/actions/pipeline.ts")).toMatch(/isQuotesOnlyBoardStage/);
    expect(source("src/components/pipeline/kanban.tsx")).toMatch(/isQuotesOnlyBoardStage/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/isQuotesOnlyBoardStage/);
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(/QuotesBindableSignal/);
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(/data-ff-quotes-warning-strip/);
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(/data-ff-quotes-sheet-stale/);
    expect(source("src/components/deal/quotes-results-table.tsx")).not.toMatch(
      /data-ff-quotes-sheet-stale/,
    );
    expect(source("src/components/deal/quotes-bindable-signal.tsx")).toMatch(/rounded-full/);
    expect(source("src/components/deal/quotes-bindable-signal.tsx")).not.toMatch(
      /rounded-md border px-3 py-2 text-sm/,
    );
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
      /const scoringRisk = activePropertyRisk \?\? legacyRiskForTab/,
    );
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(
      /evaluateDealMarkets\(scoringRisk, profileValues, activeLob\)/,
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
    expect(css).toMatch(/\.ff-deal-stamp-row \{[\s\S]*position: absolute;/);
    expect(css).toMatch(/\.ff-deal-stamp-row \{[\s\S]*top: 13\.5rem;/);
    expect(css).not.toMatch(/\.ff-deal-status-stamp \{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.ff-deal-notice-stamp/);
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
    expect(source("src/app/deals/page.tsx")).toMatch(/pipelineBookToggleHrefs\(view\)/);
    expect(source("src/components/renewals/renewals-desk.tsx")).toMatch(
      /pipelineBookToggleHrefs\(view, "renewals"\)/,
    );
    expect(source("src/app/deals/page.tsx")).not.toMatch(/newHref="\/deals\?view=list"/);
    expect(source("src/components/renewals/renewals-desk.tsx")).not.toMatch(
      /newHref="\/deals\?view=board"/,
    );
  });

  it("shows one list/board stage chip per product, not a single deal stage", () => {
    const gloria = listProductStageChips({
      shopProducts: ["homeowners", "landlord"],
      quotingForm: "HO3",
      pipelineStage: "quote_sent",
      shopFlow: {
        productStages: {
          homeowners: { stage: "quote_sent", selectedQuoteIds: ["q1"] },
          landlord: { stage: "quote_review", selectedQuoteIds: [] },
        },
      },
    });
    expect(gloria.map((chip) => `${chip.label}:${chip.stageLabel}`)).toEqual([
      "HO3:Quote sent",
      "DP3:Quote review",
    ]);
    const sharedHome = listProductStageChips({
      shopProducts: ["homeowners", "landlord", "homeowners~88uvyj"],
      quotingForm: "HO3",
      sheets: [
        {
          line: "home",
          values: {
            address1: { value: "10358 NW 30th TER" },
            property_address: { value: "10358 NW 30th TER, Doral, FL 33172" },
          },
        },
        {
          line: "home~landlord",
          values: { property_address: { value: "10358 NW 30th TER, Doral, FL 33172" } },
        },
        {
          line: "home~homeowners~88uvyj",
          values: { address1: { value: "16021 Northwest 79th Court" } },
        },
      ],
      risks: [{ productKey: null, address1: "8944 Adriatico Lane", city: "Kissimmee" }],
    });
    expect(sharedHome.map((chip) => chip.label)).toEqual([
      "HO3 8944 Adriatico",
      "DP3",
      "HO3 16021 Northwest 79th",
    ]);
    const gloriaDecOnHomeLine = listProductStageChips({
      shopProducts: ["homeowners", "landlord", "homeowners~88uvyj"],
      quotingForm: "HO3",
      sheets: [
        {
          line: "home",
          values: {
            form: { value: "DP3" },
            quoting_form: { value: "HO3" },
            address1: { value: "10358 NW 30th TER" },
            city: { value: "Doral" },
            mailing_address: { value: "16021 NW 79Th CT" },
          },
        },
        {
          line: "home~landlord",
          values: {
            quoting_form: { value: "DP3" },
            address1: { value: "10358 Northwest 30th Terrace" },
            city: { value: "Doral" },
          },
        },
        {
          line: "home~homeowners~88uvyj",
          values: {
            quoting_form: { value: "HO3" },
            address1: { value: "16021 Northwest 79th Court" },
            city: { value: "Miami Lakes" },
          },
        },
      ],
      risks: [
        { productKey: null, address1: "10358 NW 30th TER", city: "Doral" },
        {
          productKey: "homeowners~88uvyj",
          address1: "16021 Northwest 79th Court",
          city: "Miami Lakes",
        },
      ],
    });
    expect(gloriaDecOnHomeLine.map((chip) => chip.label)).toEqual([
      "HO3 10358 Northwest 30th",
      "DP3",
      "HO3 16021 Northwest 79th",
    ]);
    expect(gloriaDecOnHomeLine[0]?.label).not.toMatch(/16021|8944/);
    expect(gloriaDecOnHomeLine[1]?.label).not.toMatch(/16021|10358/);
    expect(gloriaDecOnHomeLine[2]?.label).not.toMatch(/10358/);
    const heather = listProductStageChips({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      pipelineStage: "quote_sent",
      shopFlow: {
        productStages: {
          homeowners: { stage: "quote_review", selectedQuoteIds: [] },
          auto: { stage: "markets", selectedQuoteIds: [] },
          flood: { stage: "gathering", selectedQuoteIds: [] },
        },
      },
    });
    expect(heather).toHaveLength(3);
    expect(heather.map((chip) => chip.label)).toEqual(["HO3", "Auto", "Flood"]);
    expect(
      listProductStageChips({
        shopProducts: ["homeowners", "landlord", "auto", "flood", "umbrella"],
        pipelineStage: "markets",
      }),
    ).toHaveLength(5);
    expect(listProductStageLabel("gathering")).toBe("Gathering");
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/DealProductStageChips/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/listProductStageChips\(deal\)/);
    expect(source("src/components/pipeline/deal-card.tsx")).toMatch(/DealProductStageChips/);
    expect(source("src/components/pipeline/table-view.tsx")).toMatch(/DealProductStageChips/);
    expect(source("src/components/deals/deal-product-stage-chips.tsx")).toMatch(
      /data-ff-list-product-stage-chip/,
    );
    expect(source("src/components/deals/deal-product-stage-chips.tsx")).toMatch(
      /data-ff-list-product-stage-href/,
    );
    expect(source("src/components/deals/deal-product-stage-chips.tsx")).toMatch(/"use client"/);
    expect(source("src/components/deals/deal-product-stage-chips.tsx")).toMatch(/stopPropagation/);
    expect(workspaceTabForProductStage("quote_review")).toBe("quotes");
    expect(workspaceTabForProductStage("quote_sent")).toBe("quotes");
    expect(workspaceTabForProductStage("bound")).toBe("quotes");
    expect(workspaceTabForProductStage("policy_issued")).toBe("quotes");
    expect(workspaceTabForProductStage("closed_won")).toBe("quotes");
    expect(workspaceTabForProductStage("closed_lost")).toBe("quotes");
    expect(workspaceTabForProductStage("markets")).toBe("markets");
    expect(workspaceTabForProductStage("gathering")).toBe("details");
    expect(workspaceTabForProductStage("gathering", true)).toBe("documents");
    expect(listProductStageHref({ dealId: "d1", product: "auto", stage: "markets" })).toBe(
      "/deals/d1?tab=markets&line=auto&product=auto",
    );
    expect(
      attachListProductStageHrefs(heather, { dealId: "heather-1" }).map((chip) => chip.href),
    ).toEqual([
      "/deals/heather-1?tab=quotes&line=home&product=homeowners",
      "/deals/heather-1?tab=markets&line=auto&product=auto",
      "/deals/heather-1?tab=details&line=flood&product=flood",
    ]);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/attachListProductStageHrefs/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/DealListProductNotes/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/listProductNotes/);
    expect(source("src/components/deals/deals-table.tsx")).not.toMatch(
      /columnId: "stage"[\s\S]{0,80}filterPipeline/,
    );
    const heatherNotes = listProductNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      shopFlow: {
        productStages: {
          homeowners: { stage: "quote_review", selectedQuoteIds: [], listNote: "HO3 binder" },
          auto: { stage: "markets", selectedQuoteIds: [], listNote: "VIN pending" },
        },
      },
      fallbackNote: "old deal note",
    });
    expect(heatherNotes.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:HO3 binder",
      "Auto:VIN pending",
      "Flood:",
    ]);
    expect(
      listProductNotes({
        shopProducts: ["homeowners", "landlord"],
        quotingForm: "HO3",
        fallbackNote: "shared",
      }).map((row) => `${row.label}:${row.note}`),
    ).toEqual(["HO3:shared", "DP3:"]);
    expect(isDealListNotesColumn("new_field", { type: "multi_line", label: "Notes" })).toBe(true);
    expect(isDealListNotesColumn("notes")).toBe(true);
    expect(joinProductListNotes(heatherNotes)).toBe("HO3: HO3 binder\nAuto: VIN pending");
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(
      /data-ff-deal-list-product-note-label/,
    );
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(/sr-only/);
    expect(source("src/components/deals/deal-list-product-notes.tsx")).not.toMatch(
      /flex min-w-0 items-center gap-1/,
    );
    const notesUi = source("src/components/deals/deal-list-product-notes.tsx");
    expect(notesUi).toMatch(/className="flex w-full min-w-0 flex-col gap-1"/);
    expect(notesUi).toMatch(/className="block w-full min-w-0"/);
    expect(notesUi).toMatch(/style=\{\{ width: "100%" \}\}/);
    expect(notesUi).toMatch(/box-border w-full min-w-0/);
    expect(notesUi).not.toMatch(/min-w-\[8rem\]|min-w-\[6rem\]|max-w-\[|w-44|w-56|w-64/);
    expect(source("src/lib/list-columns.ts")).toMatch(/DEAL_NOTES_COLUMN_WIDTH = 160/);
    expect(source("src/lib/list-columns.ts")).toMatch(/NOTES_MAX_COLUMN_WIDTH = 4800/);
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(
      /key=\{`\$\{dealId\}:\$\{row\.product\}`\}/,
    );
    expect(source("src/app/actions/product-stage.ts")).toMatch(/syncProductListNotes/);
  });

  it("keeps deals-list product notes independent and splits only concatenated leftovers", () => {
    const chips = [
      { product: "homeowners" as const, label: "HO3" },
      { product: "auto" as const, label: "Auto" },
      { product: "flood" as const, label: "Flood" },
    ];
    expect(
      splitConcatenatedProductListNotes("HO3: roof inspect\nAuto: VIN pending\nFlood: NFIP hold", chips),
    ).toEqual({
      homeowners: "roof inspect",
      auto: "VIN pending",
      flood: "NFIP hold",
    });
    expect(splitConcatenatedProductListNotes("plain shared note", chips)).toBeNull();

    const concatFallback = listProductNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      fallbackNote: "HO3: roof inspect\nAuto: VIN pending\nFlood: NFIP hold",
    });
    expect(concatFallback.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:roof inspect",
      "Auto:VIN pending",
      "Flood:NFIP hold",
    ]);

    const firstRowCombo = listProductNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      shopFlow: {
        productStages: {
          homeowners: {
            stage: "quote_review",
            selectedQuoteIds: [],
            listNote: "HO3: HO3: roof inspect\nAuto: VIN pending\nFlood: NFIP hold",
          },
        },
      },
      fallbackNote: "HO3: HO3: roof inspect\nAuto: VIN pending\nFlood: NFIP hold",
    });
    expect(firstRowCombo.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:roof inspect",
      "Auto:VIN pending",
      "Flood:NFIP hold",
    ]);

    const typedAuto = syncProductListNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      fallbackNote: "HO3: roof inspect\nAuto: VIN pending\nFlood: NFIP hold",
      product: "auto",
      note: "VIN locked",
    });
    expect(typedAuto.notes.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:roof inspect",
      "Auto:VIN locked",
      "Flood:NFIP hold",
    ]);
    expect(typedAuto.productStages.homeowners?.listNote).toBe("roof inspect");
    expect(typedAuto.productStages.auto?.listNote).toBe("VIN locked");
    expect(typedAuto.productStages.flood?.listNote).toBe("NFIP hold");
    expect(joinProductListNotes(typedAuto.notes)).toBe(
      "HO3: roof inspect\nAuto: VIN locked\nFlood: NFIP hold",
    );

    const typedFlood = syncProductListNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      shopFlow: { productStages: typedAuto.productStages },
      fallbackNote: joinProductListNotes(typedAuto.notes),
      product: "flood",
      note: "NFIP quoted",
    });
    expect(typedFlood.notes.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:roof inspect",
      "Auto:VIN locked",
      "Flood:NFIP quoted",
    ]);
    expect(typedFlood.notes[0]?.note).not.toMatch(/VIN locked|NFIP quoted/);

    const independent = syncProductListNotes({
      shopProducts: ["homeowners", "auto", "flood"],
      quotingForm: "HO3",
      shopFlow: {
        productStages: {
          homeowners: { stage: "quote_review", selectedQuoteIds: [], listNote: "HO3 binder" },
          auto: { stage: "markets", selectedQuoteIds: [], listNote: "VIN pending" },
        },
      },
      fallbackNote: "HO3: HO3 binder\nAuto: VIN pending",
      product: "flood",
      note: "call NFIP",
    });
    expect(independent.notes.map((row) => `${row.label}:${row.note}`)).toEqual([
      "HO3:HO3 binder",
      "Auto:VIN pending",
      "Flood:call NFIP",
    ]);
  });

  it("strips Heather Camirand HO3/Auto leftover notices and keeps Flood", () => {
    expect(isHeatherCamirandDeal({ title: "Heather Camirand / HO3", primaryNamedInsured: "Heather Camirand" })).toBe(
      true,
    );
    expect(isHeatherCamirandDeal({ title: "Heather Cameron / HO3" })).toBe(false);
    const cleaned = stripStaleCamirandProductNotices({
      homeowners: { stage: "quote_review", selectedQuoteIds: [], noticeType: "inspection_before_bind" },
      auto: { stage: "markets", selectedQuoteIds: [], inspectionStatus: "inspection" },
      flood: { stage: "gathering", selectedQuoteIds: [], noticeType: "check_mortgagee_payment" },
    });
    expect(cleaned.homeowners?.noticeType).toBe("none");
    expect(cleaned.auto?.noticeType).toBe("none");
    expect(cleaned.flood?.noticeType).toBe("check_mortgagee_payment");
    expect(noticeNoteLog({ noticeNote: "Call lender", noticeNotes: [] })).toEqual([
      { body: "Call lender", at: "", agent: null },
    ]);
    expect(source("src/lib/db/queries.ts")).toMatch(/stripStaleCamirandProductNotices/);
    expect(source("src/app/globals.css")).toMatch(/ff-deal-stamp-stack/);
    expect(source("src/app/globals.css")).toMatch(/ff-notice-stamp-ink-hit/);
    expect(source("src/app/globals.css")).toMatch(/rotate\(-24deg\)/);
    expect(source("src/app/globals.css")).toMatch(/right: -8\.6rem;/);
    expect(source("src/app/globals.css")).toMatch(/bottom: -2\.05rem;/);
    expect(source("src/app/globals.css")).toMatch(/left: calc\(\(100% - var\(--ff-activity-rail\) - 1\.25rem\) \/ 2\)/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/ff-deal-stamp-stack/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/data-ff-deal-create-notice/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/noticeAction=/);
    expect(source("src/components/deal/quotes-panel.tsx")).not.toMatch(/noticeAction/);
    expect(source("src/components/deal/quotes-results-table.tsx")).not.toMatch(/data-ff-quotes-create-notice/);
    expect(source("src/components/deal/life-health-quotes-panel.tsx")).not.toMatch(/Create notice/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/complete: flowCompletion\.isComplete\(id\)/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/DealFlowRail/);
    expect(source("src/components/desk/pending-tab-list.tsx")).toMatch(/data-ff-tab-complete/);
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

  it("keeps Notices as a flag through Bound / Policy issued and shows a chip", () => {
    const bound = setProductStage(
      { homeowners: { stage: "quote_review", selectedQuoteIds: ["q1"], inspectionStatus: "inspection_before_bind" } },
      "homeowners",
      { stage: "bound", selectedQuoteIds: ["q1"] },
    );
    expect(bound.homeowners?.inspectionStatus).toBe("inspection_before_bind");
    expect(bound.homeowners?.noticeType).toBe("inspection_before_bind");
    const issued = setProductStage(bound, "homeowners", { stage: "policy_issued", selectedQuoteIds: ["q1"] });
    expect(issued.homeowners?.inspectionStatus).toBe("inspection_before_bind");
    expect(
      parseProductStages({
        homeowners: { stage: "bound", selectedQuoteIds: ["q1"], inspectionStatus: "carrier_post_bind" },
      }).homeowners,
    ).toMatchObject({
      stage: "bound",
      inspectionStatus: "check_mortgagee_payment",
      noticeType: "check_mortgagee_payment",
    });
    expect(source("src/app/actions/product-stage.ts")).toMatch(/setDealProductNotice/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/completeDealProductNotice/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/deleteDealProductNotice/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/cancelLinkedNoticeTask/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/linkDealProductNoticeTask/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/persistNoticeTypesFromTaskForm/);
    expect(source("src/app/actions/product-stage.ts")).not.toMatch(
      /Add a short note to complete the notice/,
    );
    expect(source("src/app/actions/product-stage.ts")).toMatch(/completeLinkedDealNoticeForTask/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/writeDeskComms/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/noticeCompleteLogBody/);
    expect(source("src/app/actions/product-stage.ts")).not.toMatch(/upsertNoticeTask/);
    expect(source("src/app/actions/product-stage.ts")).not.toMatch(/snoozeDealProductNotice/);
    expect(source("src/app/actions/product-stage.ts")).not.toMatch(
      /stageSlug === "bound"[\s\S]{0,200}noticeType: "none"/,
    );
    expect(source("src/app/actions/alerts.ts")).toMatch(/linkDealProductNoticeTask/);
    expect(source("src/app/actions/alerts.ts")).toMatch(/persistNoticeTypesFromTaskForm/);
    expect(source("src/app/actions/alerts.ts")).toMatch(/completeLinkedDealNoticeForTask/);
    expect(source("src/app/actions/alerts.ts")).not.toMatch(
      /Add a short note to clear the notice/,
    );
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/CreateTaskDialog/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/noticeTaskTitle/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/data-ff-deal-notice-chip/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/data-ff-notice-popover/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/NoticeNotePad/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/SpeechNoteDialog/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/data-ff-notice-complete-composer/);
    expect(source("src/components/deal/deal-notices.tsx")).not.toMatch(
      /disabled=\{\(noticeNote \?\? ""\)\.trim\(\)\.length < 2\}/,
    );
    expect(source("src/components/deal/notice-types-editor.tsx")).toMatch(/CreateTaskForm/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/NoticeTypesEditor/);
    expect(source("src/components/deal/deal-notices.tsx")).not.toMatch(/snoozeDealProductNotice/);
    expect(source("src/components/deal/deal-notices.tsx")).not.toMatch(/>Inspection</);
    expect(source("src/components/deal/deal-notices.tsx")).not.toMatch(/\/settings\/picklists/);
    expect(
      findProductNoticeForTask(
        {
          homeowners: {
            stage: "quote_review",
            selectedQuoteIds: [],
            noticeType: "check_mortgagee_payment",
            noticeTaskId: "task-1",
          },
        },
        "task-1",
      ),
    ).toEqual({ product: "homeowners", noticeType: "check_mortgagee_payment" });
    expect(findProductNoticeForTask({ homeowners: { stage: "bound", selectedQuoteIds: ["q1"] } }, "task-1")).toBeNull();
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/data-ff-deal-stamps/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/data-ff-deal-stage-notice/);
    expect(source("src/app/deals/[id]/page.tsx")).not.toMatch(/data-ff-deal-header-notices/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/DealNotices/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/noticeTypesForFamily/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/saveDealNoticeTypes/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/applyDealNoticeType/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/saveDealNoticeNote/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_DEAL_NOTICES/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_DEAL_NOTICES_LIFE/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_DEAL_NOTICES_HEALTH/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/Inspection before bind/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/Check mortgagee payment/);
  });

  it("persists issued-done on one product without closing siblings", () => {
    const minted = setProductStage(
      { homeowners: { stage: "bound", selectedQuoteIds: ["q-ho3"] } },
      "homeowners",
      { stage: "policy_issued", selectedQuoteIds: ["q-ho3"], mintStatus: "unpublished" },
    );
    expect(minted.homeowners?.issuedDone).toBeFalsy();
    const published = markProductIssuedDone(minted, "homeowners", { policyId: "p1" });
    expect(parseProductStages(published).homeowners).toMatchObject({
      stage: "closed_won",
      issuedDone: true,
      mintStatus: "published",
    });
    const withAuto = setProductStage(published, "auto", { stage: "bound", selectedQuoteIds: ["q-auto"] });
    expect(withAuto.auto?.stage).toBe("bound");
    expect(withAuto.auto?.issuedDone).toBeFalsy();
    expect(productStampStage(published.homeowners, null, null, ["q-ho3"])).toBe("done");
    expect(productChipStageLabelForState({ stage: "closed_won", issuedDone: true })).toBe("Done");
    expect(source("src/components/deal/deal-line-switcher.tsx")).toMatch(/data-ff-product-done-stamp/);
    expect(source("src/components/deal/deal-line-switcher.tsx")).toMatch(/data-ff-shopping-active/);
  });
});
