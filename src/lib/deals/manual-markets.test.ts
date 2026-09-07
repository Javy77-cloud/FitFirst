import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MarketsPanel } from "@/components/deal/markets-panel";
import {
  EXPLICIT_MARKET_ACTION_MARKER,
  MANUAL_MARKET_MARKER,
  bucketForMatch,
  hasExplicitMarketAction,
  hasMarketLookupData,
  hasMarketLookupInput,
  manualCarrierIdsFromLogs,
  marketBucketLabel,
  riskHasMarketFacts,
  sheetHasMarketFacts,
} from "./manual-markets";

describe("manual markets", () => {
  it("treats a manual log as an appetite override", () => {
    expect(bucketForMatch("red", true)).toBe("appetite");
    expect(bucketForMatch("yellow", false)).toBe("stretch");
    expect(bucketForMatch("green", false)).toBe("appetite");
    expect(marketBucketLabel("appetite")).toBe("In appetite");
    expect(
      manualCarrierIdsFromLogs([
        { carrierId: "c1", why: `${MANUAL_MARKET_MARKER} ${EXPLICIT_MARKET_ACTION_MARKER} override` },
        { carrierId: "c2", why: "portal closed" },
        { carrierId: "c3", why: `${MANUAL_MARKET_MARKER} leftover seed` },
      ]),
    ).toEqual(["c1"]);
  });

  it("treats Markets as empty until a lookup or manual carrier exists", () => {
    expect(hasMarketLookupData([], [])).toBe(false);
    expect(hasMarketLookupData([], ["c1"])).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [])).toBe(false);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true, true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], false, true)).toBe(false);
    expect(hasExplicitMarketAction([{ why: "seeded decline" }], [{ notes: "Stub quote." }])).toBe(
      false,
    );
    expect(
      hasExplicitMarketAction(
        [{ why: `${EXPLICIT_MARKET_ACTION_MARKER} Agent requested appetite quotes.` }],
        [],
      ),
    ).toBe(true);
    expect(
      hasExplicitMarketAction([], [{ notes: `${EXPLICIT_MARKET_ACTION_MARKER} portal stub` }]),
    ).toBe(true);
    const panel = readFileSync("src/components/deal/markets-panel.tsx", "utf8");
    expect(panel).toMatch(/data-ff-markets-empty/);
    expect(panel).toMatch(/hasMarketLookupData/);
    expect(panel).toMatch(/appetite\.length > 0/);
    expect(panel).toMatch(/stretch\.length > 0/);
    expect(panel).toMatch(/skip\.length > 0/);
    expect(panel).not.toMatch(/No in-appetite markets/);
    expect(panel).not.toMatch(/No stretch markets/);
    expect(panel).not.toMatch(/Nothing to skip/);
    expect(panel).toMatch(/marketBucketLabel\("appetite"\)/);
    expect(panel).toMatch(/Approve & request quotes/);
    const emptyBranch = panel.slice(
      panel.indexOf("if (!hasData)"),
      panel.indexOf("className=\"space-y-3\""),
    );
    expect(emptyBranch).toMatch(/data-ff-markets-empty/);
    expect(emptyBranch).not.toMatch(/ManualCarrierAdd/);
    expect(emptyBranch).not.toMatch(/In appetite/);
    expect(emptyBranch).not.toMatch(/MarketTable/);
  });

  it("does not treat schema defaults or an empty sheet as a lookup", () => {
    expect(riskHasMarketFacts(undefined)).toBe(false);
    expect(riskHasMarketFacts({ state: "FL" } as never)).toBe(false);
    expect(riskHasMarketFacts({ coverageA: 321000 })).toBe(true);
    expect(riskHasMarketFacts({ city: "Miami" })).toBe(true);
    expect(sheetHasMarketFacts(null)).toBe(false);
    expect(sheetHasMarketFacts({ sheet_product: { value: "homeowners" } })).toBe(false);
    expect(sheetHasMarketFacts({ coverage_a: { value: "321000" } })).toBe(true);
    expect(hasMarketLookupInput({ state: "FL" } as never, { sheet_product: { value: "homeowners" } })).toBe(
      false,
    );
    expect(hasMarketLookupInput({ coverageA: 321000 }, null)).toBe(false);
    expect(hasMarketLookupInput({ coverageA: 321000 }, { coverage_a: { value: "321000" } })).toBe(true);
  });

  it("renders a blank Markets tab when there are no matches and no manual carriers", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-empty",
        matches: [],
        manualIds: [],
        carriers: [],
      }),
    );
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/Stretch/);
    expect(html).not.toMatch(/Skip/);
    expect(html).not.toMatch(/Approve & request quotes/);
    expect(html).not.toMatch(/Add carrier manually/);
    expect(html).not.toMatch(/in appetite/i);
  });

  it("stays blank when evaluateDeal auto-returns matches and the agent has not acted", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-auto",
        matches: [
          {
            carrierId: "c1",
            carrierName: "Home Co",
            band: "green",
            fitScore: 90,
            reasons: [],
            learnedDecline: false,
            shoppable: true,
          },
        ],
        manualIds: [],
        carriers: [],
      }),
    );
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/Home Co/);
    expect(html).not.toMatch(/in appetite/i);
  });
});
