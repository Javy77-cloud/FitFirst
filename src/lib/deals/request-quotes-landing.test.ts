import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import { quotesRequestedHref, withFlash } from "@/lib/flash";
import {
  parseProductStages,
  productChipStageLabelForState,
  productStageFor,
  productStampStage,
} from "@/lib/deals/product-stages";
import {
  groupQuotesByRun,
  quoteMatchesDealProduct,
  quoteRunIdAfterRequest,
  resolveQuoteShopLine,
} from "@/lib/deals/shop-flow";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("request quotes landing + leftover Quote sent gate", () => {
  it("always redirects Request quotes onto Quotes with line/product", () => {
    expect(quotesRequestedHref("deal-gloria", { line: "home", product: "homeowners" })).toBe(
      "/deals/deal-gloria?tab=quotes&line=home&product=homeowners",
    );
    expect(withFlash(quotesRequestedHref("deal-gloria", { line: "home" }), "quotes-requested")).toBe(
      "/deals/deal-gloria?tab=quotes&line=home&flash=quotes-requested",
    );
    const action = source("src/app/actions/quotes.ts");
    expect(action).toMatch(/finishRequestQuotes/);
    expect(action).toMatch(/quotesRequestedHref\(dealId, extras\)/);
    expect(action).toMatch(/isRedirectError/);
    expect(action).toMatch(/quoteRunIdAfterRequest/);
    expect(action).not.toMatch(/archiveCurrent/);
    expect(action).not.toMatch(/quoteRunId: prevId/);
    expect(action).toMatch(/Do not archive or restamp live premiums/);
    const panel = source("src/components/deal/markets-panel.tsx");
    expect(panel).toMatch(/name="product"/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/product=\{activeProduct\}/);
  });

  it("does not hide existing premiums behind a newly minted empty run", () => {
    expect(
      quoteRunIdAfterRequest({
        savedRunId: "brand-new",
        existingRunIds: ["run-live"],
      }),
    ).toBe("run-live");
    const grouped = groupQuotesByRun(
      [
        { id: "ho3", runId: "run-live", createdAt: new Date("2026-09-01T12:00:00Z") },
        { id: "dp3", runId: "run-live", createdAt: new Date("2026-09-01T12:01:00Z") },
      ],
      (row) => ({ runId: row.runId, createdAt: row.createdAt }),
      "brand-new",
    );
    expect(grouped.current.map((row) => row.id)).toEqual(["ho3", "dp3"]);
    expect(grouped.previous).toEqual([]);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Rated $1840", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Rated $1840", logs: [] },
        "landlord",
        { multiLine: true, splitHomeProducts: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "DP3 landlord dwelling", logs: [] },
        "landlord",
        { multiLine: true, splitHomeProducts: true },
      ),
    ).toBe(true);
  });

  it("hides Gloria leftover Quote sent stamp when Review has no selected quote", () => {
    expect(
      productStampStage({ stage: "review", selectedQuoteIds: [], lostReason: null }, "quote_sent"),
    ).toBeNull();
    expect(
      renderToString(
        createElement(DealStatusStamp, {
          stage: productStampStage(
            { stage: "review", selectedQuoteIds: [], lostReason: null },
            "quote_sent",
          ),
        }),
      ),
    ).toBe("");
    expect(
      productChipStageLabelForState({ stage: "quote_sent", selectedQuoteIds: [] }),
    ).toBe("Quotes");
    expect(
      parseProductStages({ homeowners: { stage: "quote_sent", selectedQuoteIds: [] } }).homeowners,
    ).toMatchObject({ stage: "quotes", selectedQuoteIds: [] });
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/livePicked/);
    expect(source("src/lib/deals/shop-flow-persist.ts")).toMatch(
      /shopFlow: parseShopFlow\(shopFlow\)/,
    );
    expect(
      productStampStage({ stage: "quote_sent", selectedQuoteIds: ["q1"], lostReason: null }),
    ).toBe("quote_sent");
  });

  it("matches Neon Gloria/Heather live shape: rows visible, deal Quote sent does not stamp", () => {
    const gloriaStages = parseProductStages({
      homeowners: { stage: "review", selectedQuoteIds: [] },
      landlord: { stage: "review", selectedQuoteIds: [] },
    });
    expect(productStageFor(gloriaStages, "homeowners", "quote_sent")).toMatchObject({
      stage: "review",
      selectedQuoteIds: [],
    });
    expect(
      productStampStage(productStageFor(gloriaStages, "homeowners", "quote_sent"), "quote_sent"),
    ).toBeNull();
    const gloriaRows = Array.from({ length: 19 }, (_, index) => ({
      id: `g-${index}`,
      runId: "run-home-live",
      createdAt: new Date(`2026-09-01T12:${String(index).padStart(2, "0")}:00Z`),
    }));
    const gloriaGrouped = groupQuotesByRun(
      gloriaRows,
      (row) => ({ runId: row.runId, createdAt: row.createdAt }),
      "run-home-after-request",
    );
    expect(gloriaGrouped.current).toHaveLength(19);

    const heatherRuns = { home: "run-home", auto: "run-auto", flood: "run-flood" };
    expect(
      resolveQuoteShopLine({
        shopLine: "home",
        notes: "Rated $700",
        quoteRunId: "run-auto",
        quoteRuns: heatherRuns,
      }),
    ).toBe("auto");
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Rated $700", quoteRunId: "run-auto", quoteRuns: heatherRuns },
        "auto",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Rated $1840", quoteRunId: "run-home", quoteRuns: heatherRuns },
        "homeowners",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "NFIP provisional", quoteRunId: "run-flood", quoteRuns: heatherRuns },
        "flood",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/quoteRuns: shopFlow\.quoteRuns/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/quoteRuns=\{shopFlow\.quoteRuns\}/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(
      /stage=\{displayProductStage\(/,
    );
  });

  it("sheet save stays at Confirm and does not uncheck Markets", () => {
    const save = source("src/app/actions/quote-sheet.ts");
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    const gate = source("src/components/deal/sheet-approve-gate.tsx");
    expect(save).toMatch(/persistSheetRecheckCue\(dealId, line\)/);
    expect(save).toMatch(/hash: SHEET_CONFIRM_HASH/);
    expect(save).not.toMatch(/markShopFlowStaleAfterRiskChange/);
    expect(sheet).toMatch(/data.set\("flash", "0"\)/);
    expect(sheet).toMatch(/scrollIntoView/);
    expect(sheet).toMatch(/#\$\{SHEET_CONFIRM_HASH\}/);
    expect(gate).toMatch(/id=\{SHEET_CONFIRM_HASH\}/);
    expect(gate).toMatch(/scrollIntoView/);
    expect(source("src/lib/desk/action-flash.ts")).toMatch(/SHEET_CONFIRM_HASH = "ff-sheet-confirm"/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/lineRiskFingerprint/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/hydrateCopiedLineFingerprints/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/dealTitleForActiveProduct/);
    expect(source("src/components/desk/desk-page-trail.tsx")).not.toMatch(
      /border-navy bg-navy text-white/,
    );
  });
});
