import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MarketsPanel } from "@/components/deal/markets-panel";
import {
  MANUAL_MARKET_MARKER,
  bucketForMatch,
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
        { carrierId: "c1", why: `${MANUAL_MARKET_MARKER} override` },
        { carrierId: "c2", why: "portal closed" },
      ]),
    ).toEqual(["c1"]);
  });

  it("treats Markets as empty until a lookup or manual carrier exists", () => {
    expect(hasMarketLookupData([], [])).toBe(false);
    expect(hasMarketLookupData([], ["c1"])).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [])).toBe(true);
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
      panel.indexOf("return (", panel.indexOf("if (!hasData)") + 1),
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
    expect(hasMarketLookupInput({ coverageA: 321000 }, null)).toBe(true);
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
});
