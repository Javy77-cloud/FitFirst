import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MarketsPanel } from "@/components/deal/markets-panel";
import {
  EXPLICIT_MARKET_ACTION_MARKER,
  MANUAL_MARKET_MARKER,
  SHOP_LIST_MARKET_MARKER,
  bucketForMatch,
  hasExplicitMarketAction,
  hasMarketLookupData,
  hasMarketLookupInput,
  manualCarrierIdsFromLogs,
  marketBucketLabel,
  riskHasMarketFacts,
  sheetHasMarketFacts,
  shopListCarrierIdsFromLogs,
} from "./manual-markets";

describe("manual markets", () => {
  it("treats a manual log as an appetite override", () => {
    expect(bucketForMatch("red", true)).toBe("appetite");
    expect(bucketForMatch("yellow", false)).toBe("stretch");
    expect(bucketForMatch("green", false)).toBe("appetite");
    expect(bucketForMatch("red", true, true)).toBe("skip");
    expect(bucketForMatch("yellow", true, true)).toBe("stretch");
    expect(marketBucketLabel("appetite")).toBe("In appetite");
    expect(
      manualCarrierIdsFromLogs([
        { carrierId: "c1", why: `${MANUAL_MARKET_MARKER} ${EXPLICIT_MARKET_ACTION_MARKER} override` },
        { carrierId: "c2", why: "portal closed" },
        { carrierId: "c3", why: `${MANUAL_MARKET_MARKER} leftover seed` },
      ]),
    ).toEqual(["c1"]);
    expect(
      shopListCarrierIdsFromLogs([
        {
          carrierId: "trident",
          why: `${MANUAL_MARKET_MARKER} ${EXPLICIT_MARKET_ACTION_MARKER} ${SHOP_LIST_MARKET_MARKER} Loaded from Javy Home shop list.`,
        },
        { carrierId: "c1", why: `${MANUAL_MARKET_MARKER} ${EXPLICIT_MARKET_ACTION_MARKER} override` },
      ]),
    ).toEqual(["trident"]);
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
    expect(panel).toMatch(/Request Quotes/);
    const emptyBranch = panel.slice(
      panel.indexOf("if (!hasData)"),
      panel.indexOf("const approveLabel"),
    );
    expect(emptyBranch).toMatch(/data-ff-markets-empty/);
    expect(emptyBranch).toMatch(/ManualCarrierAdd/);
    expect(emptyBranch).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
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

  it("soft-filters a shop-list row when structured appetite says skip", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-trident",
        matches: [
          {
            carrierId: "trident",
            carrierName: "Trident Reciprocal Exchange",
            band: "red",
            fitScore: 20,
            reasons: [
              { code: "min_cov_a", message: "Cov A 250000 below min 300000", severity: "fail" },
              {
                code: "appetite_note",
                message: "FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000.",
                severity: "pass",
              },
            ],
            learnedDecline: false,
            shoppable: false,
          },
        ],
        manualIds: ["trident"],
        shopListIds: ["trident"],
        explicitLookup: false,
        sheetHasValues: true,
        carriers: [{ id: "trident", name: "Trident Reciprocal Exchange", writtenLines: ["HO"] }],
      }),
    );
    expect(html).toMatch(/Skip/);
    expect(html).toMatch(/below min 300000/);
    expect(html).toMatch(/data-ff-market-appetite-note/);
    expect(html).toMatch(/QuoteRUSH/);
  });

  it("renders empty Markets with zero counters + load/add when no matches", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-empty",
        matches: [],
        manualIds: [],
        carriers: [],
      }),
    );
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(html).toMatch(/Add carrier manually/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/Request Quotes/);
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
    expect(html).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/>Home Co</);
  });
});
