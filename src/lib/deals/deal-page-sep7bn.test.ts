import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import {
  EXPLICIT_MARKET_ACTION_MARKER,
  hasExplicitMarketAction,
  hasMarketLookupData,
  manualCarrierIdsFromLogs,
} from "./manual-markets";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const leftoverMatch = {
  carrierId: "c1",
  carrierName: "Home Co",
  band: "green" as const,
  fitScore: 88,
  reasons: [],
  learnedDecline: false,
  shoppable: true,
};

describe("sep7bn Markets paint from a filled sheet without a shop", () => {
  it("BN1 — a filled sheet evaluates appetite; leftover logs are not a shop and do not request quotes", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/hasShopMarketAction|hasExplicitMarketAction/);
    expect(page).toMatch(/evaluateDealMarkets\(risk, activeSheet\.values, activeLob\)/);
    expect(page).toMatch(/const marketsUseSheet = !isLifeHealthShopLine\(sheetLine\)/);
    expect(page).toMatch(/const sheetReady = marketsUseSheet && sheetFilled/);
    expect(page).toMatch(/const evalMarkets = Boolean\(risk && sheetReady\)/);
    expect(page).not.toMatch(/shopListIds\.length/);
    expect(page).not.toMatch(/listedMatches/);
    expect(page).not.toMatch(/sheetReady \? await evaluateDealMarkets/);
    expect(page).not.toMatch(/const matches = risk \? await evaluateDealMarkets\(risk\)/);
    expect(page).not.toMatch(/explicitLookup=\{sheetReady && logs\.length > 0\}/);
    expect(page).toMatch(/explicitLookup=\{shopMarketsAction\}/);
    expect(page).toMatch(/sheetHasValues=\{sheetReady\}/);
    expect(page).toMatch(/matches=\{matches\}/);
    expect(page).toMatch(/shopListIds=\{shopListIds\}/);
    expect(page).not.toMatch(/requestAppetiteQuotesAction/);
    expect(page).toMatch(/<LifeAppetiteHelper/);
    expect(page).toMatch(/<HealthMarketsEmpty/);
    expect(page).not.toMatch(/localStorage/);
    expect(page).not.toMatch(/sessionStorage/);
    expect(hasExplicitMarketAction([{ why: "roof age" }], [{ notes: "Stub quote." }])).toBe(false);
    expect(hasMarketLookupData([leftoverMatch], [], false, true)).toBe(true);
    expect(hasMarketLookupData([leftoverMatch], [], false, false)).toBe(false);
    expect(manualCarrierIdsFromLogs([{ carrierId: "c1", why: "[manual] leftover seed" }])).toEqual(
      [],
    );
  });

  it("BN2 — filled sheet paints appetite bands without shop-list rows or quote logs", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-ana-or-any",
        matches: [leftoverMatch],
        manualIds: [],
        explicitLookup: false,
        sheetHasValues: true,
        carriers: [{ id: "c1", name: "Home Co", writtenLines: ["HO"] }],
      }),
    );
    expect(html).toMatch(/In appetite/);
    expect(html).toMatch(/Home Co/);
    expect(html).toMatch(/Request Quotes/);
    expect(html).toMatch(/data-ff-load-home-shop-list|Add carrier manually/);
    expect(html).not.toMatch(/data-ff-markets-empty/);
    expect(html).not.toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
  });

  it("BN3 — leftover quote logs are not a shop; explicit shop/add paints that deal only", () => {
    expect(
      hasExplicitMarketAction(
        [{ why: "American Integrity quoted $321k but is not bindable" }],
        [{ notes: "Stub quote. Cheapest. Did not create a policy." }],
      ),
    ).toBe(false);
    const shopped = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-shopped",
        matches: [leftoverMatch],
        manualIds: [],
        explicitLookup: true,
        sheetHasValues: true,
        carriers: [],
      }),
    );
    expect(shopped).toMatch(/In appetite/);
    expect(shopped).toMatch(/Home Co/);
    const added = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-added",
        matches: [],
        manualIds: ["c2"],
        explicitLookup: true,
        carriers: [{ id: "c2", name: "Manual Co", writtenLines: ["HO"] }],
      }),
    );
    expect(added).toMatch(/Manual Co/);
    expect(added).toMatch(/manual/);
    const quotes = source("src/app/actions/quotes.ts");
    expect(quotes).toMatch(/EXPLICIT_MARKET_ACTION_MARKER/);
    expect(quotes).toMatch(/\$\{pass\} shop/);
    const add = source("src/app/actions/deal-desk.ts");
    expect(add).toMatch(/EXPLICIT_MARKET_ACTION_MARKER/);
    expect(add).toMatch(/MANUAL_MARKET_MARKER/);
    expect(hasExplicitMarketAction([{ why: `${EXPLICIT_MARKET_ACTION_MARKER} shop` }])).toBe(true);
  });

  it("BN4 — Quotes empty shows Markets handoff card (never a dead blank)", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-empty",
        quotes: [],
        logs: [],
      }),
    );
    expect(html).toMatch(/data-ff-quotes-empty/);
    expect(html).toMatch(/data-ff-deal-quotes-empty/);
    expect(html).toMatch(/Go to Markets/);
    expect(html).toMatch(/0 quote rows/);
    expect(html).toMatch(/Add carrier manually/);
    expect(html).not.toMatch(/Quotes land here/);
    expect(html).not.toMatch(/border-dashed/);
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
  });

  it("BN5 — empty Markets markup shows zeros + load/add, not In appetite buckets", () => {
    const panel = source("src/components/deal/markets-panel.tsx");
    const emptyStart = panel.indexOf("if (!hasData)");
    const emptyEnd = panel.indexOf("const approveLabel");
    const emptyBranch = panel.slice(emptyStart, emptyEnd);
    expect(emptyBranch).toMatch(/data-ff-markets-empty/);
    expect(emptyBranch).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(emptyBranch).toMatch(/LoadShopListButton/);
    expect(emptyBranch).toMatch(/ManualCarrierAdd/);
    expect(emptyBranch).not.toMatch(/In appetite/);
    expect(emptyBranch).not.toMatch(/MarketTable/);
    expect(emptyBranch).not.toMatch(/MarketsSelectTable/);
  });
});
