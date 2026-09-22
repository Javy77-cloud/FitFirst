import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { evaluateShopFits, shopCounts } from "@/lib/appetite/shop-fits";
import {
  OLYMPUS_COUNTY_MIN_COV_A,
  OLYMPUS_EXCLUDED_COUNTIES,
  PUBLISHED_HO_APPETITE,
  type PublishedHoAppetite,
} from "@/lib/appetite/published-appetite";
import type { AppetiteRuleInput, RiskSnapshot } from "@/lib/domain";
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

  it("paints matcher rows from a filled sheet, and stays empty without sheet facts or rules", () => {
    expect(hasMarketLookupData([], [])).toBe(false);
    expect(hasMarketLookupData([], ["c1"])).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [])).toBe(false);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true, true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], false, true)).toBe(true);
    expect(hasMarketLookupData([], [], false, true)).toBe(false);
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
    expect(sheetHasMarketFacts({ year_built: { value: "2004" } })).toBe(true);
    expect(sheetHasMarketFacts({ mobile_home: { value: "yes" } })).toBe(true);
    expect(sheetHasMarketFacts({ miles_to_coast: { value: "8" } })).toBe(true);
    expect(sheetHasMarketFacts({ vin: { value: "1HGCM82633A004352" } })).toBe(true);
    expect(sheetHasMarketFacts({ flood_zone: { value: "X" } })).toBe(true);
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
    expect(html).toMatch(/Trident Reciprocal Exchange/);
    expect(html).toMatch(/data-ff-market-appetite/);
    expect(html).not.toMatch(/below min 300000/);
    expect(html).not.toMatch(/data-ff-market-appetite-note/);
    expect(html).not.toMatch(/QuoteRUSH/);
  });

  it("does not restate sheet details or quote-style whys on Markets rows", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-gloria-ho3",
        matches: [
          {
            carrierId: "citizens",
            carrierName: "Citizens",
            band: "yellow",
            fitScore: 62,
            reasons: [
              { code: "year_built", message: "Year built 1984", severity: "stretch" },
              { code: "roof_covering", message: "Clay tile roof", severity: "stretch" },
              {
                code: "appetite_note",
                message: "Roof age 37y · clay tile · year built 1984",
                severity: "pass",
              },
            ],
            learnedDecline: false,
            shoppable: true,
          },
        ],
        explicitLookup: true,
        sheetHasValues: true,
        carriers: [{ id: "citizens", name: "Citizens", writtenLines: ["HO"] }],
      }),
    );
    expect(html).toMatch(/Citizens/);
    expect(html).toMatch(/Appointed/);
    expect(html).toMatch(/data-ff-market-appetite/);
    expect(html).toMatch(/>62</);
    expect(html).not.toMatch(/>Why</);
    expect(html).not.toMatch(/Year built 1984/);
    expect(html).not.toMatch(/Clay tile/);
    expect(html).not.toMatch(/clay tile/);
    expect(html).not.toMatch(/Roof age/);
    expect(html).not.toMatch(/data-ff-market-appetite-note/);
    expect(html).not.toMatch(/Clears structured appetite/);
    const table = readFileSync("src/components/deal/markets-select-table.tsx", "utf8");
    expect(table).not.toMatch(/marketWhy/);
    expect(table).not.toMatch(/appetiteNote/);
    expect(table).not.toMatch(/<th>Why<\/th>/);
    const quotes = readFileSync("src/components/deal/quotes-results-table.tsx", "utf8");
    expect(quotes).toMatch(/quoteRowReason/);
    expect(quotes).toMatch(/Why \/ bind requirements/);
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

  it("stays blank when leftover matches arrive without sheet facts", () => {
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
        sheetHasValues: false,
        carriers: [],
      }),
    );
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/>Home Co</);
  });

  it("paints appetite bands from a filled sheet without a shop list or quote request", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-rosa-ho3",
        matches: [
          {
            carrierId: "stand",
            carrierName: "Stand",
            band: "green",
            fitScore: 88,
            reasons: [],
            learnedDecline: false,
            shoppable: true,
          },
          {
            carrierId: "olympus",
            carrierName: "Olympus Insurance Company",
            band: "yellow",
            fitScore: 61,
            reasons: [{ code: "min_cov_a", message: "Cov A below min", severity: "stretch" }],
            learnedDecline: false,
            shoppable: true,
          },
          {
            carrierId: "trident",
            carrierName: "Trident Reciprocal Exchange",
            band: "red",
            fitScore: 20,
            reasons: [
              {
                code: "mobile",
                message: "Mobile / manufactured not written",
                severity: "fail",
              },
            ],
            learnedDecline: false,
            shoppable: false,
          },
        ],
        manualIds: [],
        explicitLookup: false,
        sheetHasValues: true,
        unlocked: true,
        carriers: [],
        dealLine: "HO",
      }),
    );
    expect(html).not.toMatch(/data-ff-markets-empty/);
    expect(html).toMatch(/In appetite/);
    expect(html).toMatch(/Stretch/);
    expect(html).toMatch(/Skip/);
    expect(html).toMatch(/Stand/);
    expect(html).toMatch(/Olympus Insurance Company/);
    expect(html).toMatch(/Trident Reciprocal Exchange/);
    expect(html.replace(/<!-- -->/g, "")).toMatch(/1 in appetite · 1 stretch · 1 skip/);
    expect(html).toMatch(/data-ff-load-home-shop-list/);
    expect(html).toMatch(/Request Quotes/);
    expect(html).not.toMatch(/Mobile \/ manufactured not written/);
  });
});

function publishedHoRule(row: PublishedHoAppetite): AppetiteRuleInput {
  return {
    carrierId: row.slug,
    carrierName: row.legalName,
    lineOfBusiness: "HO",
    minCovA: row.minCovA,
    maxCovA: row.maxCovA,
    minYearBuilt: row.minYearBuilt,
    maxRoofAge: row.maxRoofAge,
    allowedRoofCoverings: row.allowedRoofCoverings,
    coastalAllowed: true,
    minMilesToCoast: row.minMilesToCoast,
    maxMilesToCoast: null,
    mobileAllowed: row.mobileAllowed,
    requiresOpeningProtection: false,
    maxStories: null,
    allowedConstruction: null,
    allowedOccupancy: null,
    allowedCounties: null,
    excludedCounties: row.slug === "olympus" ? [...OLYMPUS_EXCLUDED_COUNTIES] : null,
    countyMinCovA: row.slug === "olympus" ? { ...OLYMPUS_COUNTY_MIN_COV_A } : null,
    requireReplacementCost: false,
    rceFloorRatio: null,
    portalStatus: "open",
    dontWriteNotes: null,
    writtenLines: ["HO"],
    appointed: true,
    appetiteNotes: row.notesForAgent,
  };
}

const rosaHo3Risk: RiskSnapshot = {
  yearBuilt: 2004,
  roofYear: 2019,
  roofCovering: "shingle",
  construction: "masonry",
  openingProtection: "basic",
  occupancy: "owner",
  stories: 1,
  pool: false,
  protectionClass: "4",
  milesToCoast: 8,
  city: "Fort Myers",
  county: "Lee",
  coverageA: 350_000,
  mobileHome: false,
  replacementCostEstimate: 360_000,
  state: "FL",
};

describe("filled sheet appetite without a shop list", () => {
  const rules = PUBLISHED_HO_APPETITE.map(publishedHoRule);

  it("Rosa-shaped HO3 (mobile_home=no) paints a mix of bands from published rules", () => {
    const result = evaluateShopFits({
      risk: rosaHo3Risk,
      dealLine: "HO",
      rules,
      prior: [],
      sheetValues: {
        coverage_a: { value: "350000", status: "confirmed", source: "agent" },
        mobile_home: { value: "no", status: "confirmed", source: "agent" },
        year_built: { value: "2004", status: "confirmed", source: "agent" },
        county: { value: "Lee", status: "confirmed", source: "agent" },
      },
      asOfYear: 2026,
    });
    const counts = shopCounts(result.matches);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(counts.green).toBeGreaterThan(0);
    expect(counts.skip).toBeGreaterThan(0);
    expect(result.matches.some((row) => row.band === "green" && row.carrierId === "stand")).toBe(true);
    expect(result.matches.some((row) => row.band === "red" && row.carrierId === "olympus")).toBe(true);

    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "260de6f1-d91b-4e9f-ae0e-61e38de04b52",
        matches: result.matches,
        explicitLookup: false,
        sheetHasValues: true,
        unlocked: true,
        dealLine: "HO",
      }),
    );
    expect(html).not.toMatch(/data-ff-markets-empty/);
    expect(html).not.toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(html).toMatch(/In appetite/);
    expect(html).toMatch(/Skip/);
    expect(html).toMatch(/data-ff-load-home-shop-list/);
  });

  it("Catherine-shaped MHO (mobile_home=yes) skips carriers that do not write mobile", () => {
    const result = evaluateShopFits({
      risk: { ...rosaHo3Risk, mobileHome: true, city: "Melbourne", county: "Brevard" },
      dealLine: "HO",
      rules,
      prior: [],
      sheetValues: {
        coverage_a: { value: "350000", status: "confirmed", source: "agent" },
        mobile_home: { value: "yes", status: "confirmed", source: "agent" },
        year_built: { value: "2004", status: "confirmed", source: "agent" },
        county: { value: "Brevard", status: "confirmed", source: "agent" },
      },
      asOfYear: 2026,
    });
    expect(result.matches.length).toBe(PUBLISHED_HO_APPETITE.length);
    for (const row of result.matches) {
      const rule = rules.find((item) => item.carrierId === row.carrierId);
      expect(rule?.mobileAllowed).toBe(false);
      expect(row.band).toBe("red");
      expect(row.reasons.some((reason) => reason.message === "Mobile / manufactured not written")).toBe(
        true,
      );
    }
    expect(bucketForMatch("red", false, true)).toBe("skip");

    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "c55afeea-2850-486e-99e8-78459056fa88",
        matches: result.matches,
        explicitLookup: false,
        sheetHasValues: true,
        unlocked: true,
        dealLine: "HO",
      }),
    );
    const text = html.replace(/<!-- -->/g, "");
    expect(html).not.toMatch(/data-ff-markets-empty/);
    expect(html).toMatch(/Skip/);
    expect(text).toMatch(new RegExp(`${result.matches.length} skip`));
    expect(text).not.toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
  });

  it("paints Auto and Flood from a filled sheet and keeps the shop list as an overlay", () => {
    const carrier = {
      carrierId: "line-co",
      carrierName: "Line Co",
      band: "green" as const,
      fitScore: 84,
      reasons: [],
      learnedDecline: false,
      shoppable: true,
    };
    for (const line of ["AUTO", "FLOOD"] as const) {
      const html = renderToString(
        createElement(MarketsPanel, {
          dealId: `deal-${line}`,
          matches: [carrier],
          explicitLookup: false,
          sheetHasValues: true,
          dealLine: line,
        }),
      );
      expect(html).not.toMatch(/data-ff-markets-empty/);
      expect(html).toMatch(/In appetite/);
      expect(html).toMatch(/Line Co/);
      expect(html).toMatch(
        line === "AUTO" ? /data-ff-load-auto-shop-list/ : /data-ff-load-flood-shop-list/,
      );
    }

    const respected = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-auto-list",
        matches: [{ ...carrier, band: "red", shoppable: false, fitScore: 20 }],
        manualIds: ["line-co"],
        shopListIds: ["line-co"],
        explicitLookup: false,
        sheetHasValues: true,
        dealLine: "AUTO",
        carriers: [{ id: "line-co", name: "Line Co", writtenLines: ["AUTO"] }],
      }),
    );
    expect(respected).toMatch(/Skip/);
    expect(respected).toMatch(/Line Co/);
    expect(respected.replace(/<!-- -->/g, "")).not.toMatch(/1 in appetite/);
  });
});
