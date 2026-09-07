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

describe("sep7bn Markets start from scratch on every deal", () => {
  it("BN1 — page load never auto-evaluates leftover sheet / logs / quotes", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/hasExplicitMarketAction/);
    expect(page).toMatch(
      /agentMarketsAction && risk \? await evaluateDealMarkets\(risk, activeSheet\.values\)/,
    );
    expect(page).not.toMatch(/sheetReady \? await evaluateDealMarkets/);
    expect(page).not.toMatch(/const matches = risk \? await evaluateDealMarkets\(risk\)/);
    expect(page).not.toMatch(/explicitLookup=\{sheetReady && logs\.length > 0\}/);
    expect(page).toMatch(/explicitLookup=\{agentMarketsAction\}/);
    expect(page).toMatch(/matches=\{agentMarketsAction \? matches : \[\]\}/);
    expect(page).not.toMatch(/localStorage/);
    expect(page).not.toMatch(/sessionStorage/);
    expect(hasExplicitMarketAction([{ why: "roof age" }], [{ notes: "Stub quote." }])).toBe(false);
    expect(hasMarketLookupData([leftoverMatch], [], false, true)).toBe(false);
    expect(manualCarrierIdsFromLogs([{ carrierId: "c1", why: "[manual] leftover seed" }])).toEqual(
      [],
    );
  });

  it("BN2 — leftover evaluateDeal matches + filled sheet stay blank (every deal)", () => {
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
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/in appetite/i);
    expect(html).not.toMatch(/Home Co/);
    expect(html).not.toMatch(/Stretch/);
    expect(html).not.toMatch(/Skip/);
    expect(html).not.toMatch(/Approve & request quotes/);
    expect(html).not.toMatch(/Add carrier manually/);
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
    expect(quotes).toMatch(/Agent requested \$\{pass\} quotes/);
    const add = source("src/app/actions/deal-desk.ts");
    expect(add).toMatch(/EXPLICIT_MARKET_ACTION_MARKER/);
    expect(add).toMatch(/MANUAL_MARKET_MARKER/);
    expect(hasExplicitMarketAction([{ why: `${EXPLICIT_MARKET_ACTION_MARKER} shop` }])).toBe(true);
  });

  it("BN4 — Quotes empty stays a blank panel (no sep7bi regression)", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-empty",
        quotes: [],
        logs: [],
      }),
    );
    expect(html).toMatch(/data-ff-quotes-empty/);
    expect(html).toMatch(/data-ff-deal-quotes-empty/);
    expect(html).not.toMatch(/Quotes land here/);
    expect(html).not.toMatch(/No quotes/);
    expect(html).not.toMatch(/border-dashed/);
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
  });

  it("BN5 — empty Markets markup has no In appetite strings", () => {
    const panel = source("src/components/deal/markets-panel.tsx");
    const emptyBranch = panel.slice(
      panel.indexOf("if (!hasData)"),
      panel.indexOf("className=\"space-y-3\""),
    );
    expect(emptyBranch).toMatch(/data-ff-markets-empty/);
    expect(emptyBranch).not.toMatch(/In appetite/);
    expect(emptyBranch).not.toMatch(/ManualCarrierAdd/);
    expect(emptyBranch).not.toMatch(/MarketTable/);
  });
});
