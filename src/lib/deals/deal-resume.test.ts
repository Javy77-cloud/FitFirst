import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealResumeNotice } from "@/components/deal/deal-resume-notice";
import {
  DEAL_RESUME_DEAL_LIMIT,
  GLORIA_MARTINEZ_DEAL_ID,
  advancedStepNotice,
  dealResumePlaceUnchanged,
  deletedProductNotice,
  emptyDealResumeMemory,
  furthestUnfinishedDealTab,
  parseDealResumeMemory,
  rememberDealPlace,
  selectResumeProduct,
  selectResumeTab,
  shouldPersistDealResume,
  type DealStepCompletion,
} from "./deal-resume";

/** Gloria Martinez property file: HO3, DP3, and a second HO3. */
const GLORIA_PRODUCTS = ["homeowners", "landlord", "homeowners~88uvyj"] as const;

const MID_MARKETS: DealStepCompletion = {
  details: true,
  documents: true,
  markets: false,
  quotes: false,
};

describe("deal resume — Markets mid-flow", () => {
  it("reopens Markets when Details and Risk Profile are done and markets are not chosen", () => {
    const memory = rememberDealPlace(emptyDealResumeMemory(), {
      dealId: GLORIA_MARTINEZ_DEAL_ID,
      productKey: "landlord",
      tab: "markets",
      at: 10,
    });
    const product = selectResumeProduct({
      rememberedProductKey: memory.deals[GLORIA_MARTINEZ_DEAL_ID]?.productKey,
      instanceKeys: GLORIA_PRODUCTS,
    });
    const screen = selectResumeTab({
      rememberedTab: memory.deals[GLORIA_MARTINEZ_DEAL_ID]?.tab,
      completion: MID_MARKETS,
      defaultTab: "details",
    });
    expect(product.productParam).toBe("landlord");
    expect(product.fallback).toBeNull();
    expect(screen).toEqual({ tab: "markets", source: "remembered" });
    expect(screen.tab).not.toBe("details");
    expect(furthestUnfinishedDealTab(MID_MARKETS)).toBe("markets");
  });

  it("keeps an explicit Markets click ahead of a stuck Details default", () => {
    expect(
      selectResumeTab({
        explicitTab: "markets",
        rememberedTab: "details",
        completion: { details: false, documents: false, markets: false, quotes: false },
        defaultTab: "details",
      }),
    ).toEqual({ tab: "markets", source: "explicit" });
    expect(shouldPersistDealResume({ tab: "markets", product: "landlord" })).toBe(true);
  });
});

describe("deal resume — Gloria multi-product", () => {
  it("restores the last insurance form, not the first product on the deal", () => {
    const memory = rememberDealPlace(emptyDealResumeMemory(), {
      dealId: GLORIA_MARTINEZ_DEAL_ID,
      productKey: "homeowners~88uvyj",
      tab: "markets",
      at: 20,
    });
    const stored = parseDealResumeMemory(JSON.parse(JSON.stringify(memory)));
    expect(stored.lastDealId).toBe(GLORIA_MARTINEZ_DEAL_ID);
    expect(stored.deals[GLORIA_MARTINEZ_DEAL_ID]).toMatchObject({
      productKey: "homeowners~88uvyj",
      tab: "markets",
    });
    const product = selectResumeProduct({
      rememberedProductKey: stored.deals[GLORIA_MARTINEZ_DEAL_ID]?.productKey,
      instanceKeys: GLORIA_PRODUCTS,
    });
    const screen = selectResumeTab({
      rememberedTab: "markets",
      completion: MID_MARKETS,
      defaultTab: "details",
    });
    expect(product).toEqual({
      productParam: "homeowners~88uvyj",
      ignoreLine: true,
      fallback: null,
    });
    expect(screen.tab).toBe("markets");
    expect(product.productParam).not.toBe(GLORIA_PRODUCTS[0]);
  });

  it("does not let one deal’s place overwrite another", () => {
    const first = rememberDealPlace(emptyDealResumeMemory(), {
      dealId: GLORIA_MARTINEZ_DEAL_ID,
      productKey: "landlord",
      tab: "markets",
      at: 1,
    });
    const next = rememberDealPlace(first, {
      dealId: "other-deal",
      productKey: "auto",
      tab: "documents",
      at: 2,
    });
    expect(next.deals[GLORIA_MARTINEZ_DEAL_ID]?.productKey).toBe("landlord");
    expect(next.lastDealId).toBe("other-deal");
    expect(
      dealResumePlaceUnchanged(next, {
        dealId: GLORIA_MARTINEZ_DEAL_ID,
        productKey: "landlord",
        tab: "markets",
      }),
    ).toBe(true);
  });
});

describe("deal resume — deleted product", () => {
  it("opens the first remaining product and names the missing form", () => {
    const product = selectResumeProduct({
      rememberedProductKey: "homeowners~gone99",
      instanceKeys: GLORIA_PRODUCTS,
    });
    expect(product.productParam).toBe("homeowners");
    expect(product.ignoreLine).toBe(true);
    expect(product.fallback).toEqual({
      missingProductKey: "homeowners~gone99",
      openedKey: "homeowners",
    });
    const note = deletedProductNotice("homeowners~gone99", "HO3 · 8944 Adriatico");
    expect(note).toContain("homeowners~gone99");
    expect(note).toContain("no longer on this deal");
    expect(note).toContain("HO3 · 8944 Adriatico");
    const html = renderToString(
      createElement(DealResumeNotice, {
        missingProductKey: "homeowners~gone99",
        openedLabel: "HO3 · 8944 Adriatico",
      }),
    );
    expect(html).toContain('data-ff-deal-resume-fallback="homeowners~gone99"');
    expect(html).toContain("HO3 · 8944 Adriatico");
    expect(html).not.toContain("homeowners~88uvyj");
  });

  it("does the same when a deep link names a product that is gone", () => {
    const product = selectResumeProduct({
      explicitProduct: "flood",
      rememberedProductKey: "landlord",
      instanceKeys: GLORIA_PRODUCTS,
    });
    expect(product.fallback?.missingProductKey).toBe("flood");
    expect(product.productParam).toBe("homeowners");
  });
});

describe("deal resume — first visit and stage advance", () => {
  it("uses the current default entry when there is no memory", () => {
    expect(
      selectResumeProduct({ instanceKeys: GLORIA_PRODUCTS }),
    ).toEqual({ productParam: undefined, ignoreLine: false, fallback: null });
    expect(
      selectResumeTab({
        completion: { details: false, documents: false, markets: false, quotes: false },
        defaultTab: "details",
      }),
    ).toEqual({ tab: "details", source: "default" });
    expect(shouldPersistDealResume({})).toBe(false);
    expect(parseDealResumeMemory(null).deals).toEqual({});
    expect(parseDealResumeMemory("{")).toEqual(emptyDealResumeMemory());
  });

  it("moves to the furthest unfinished step when the remembered step is already complete", () => {
    const screen = selectResumeTab({
      rememberedTab: "markets",
      completion: { details: true, documents: true, markets: true, quotes: false },
      defaultTab: "details",
    });
    expect(screen).toEqual({ tab: "quotes", source: "furthest-unfinished" });
    expect(advancedStepNotice("quotes")).toContain("Opened Quotes");
    const html = renderToString(
      createElement(DealResumeNotice, { advancedTab: "quotes" }),
    );
    expect(html).toContain('data-ff-deal-resume-advanced="quotes"');
    expect(html).toContain("Opened Quotes");
  });

  it("never returns a tab that is not a deal screen", () => {
    const screen = selectResumeTab({
      rememberedTab: "master-risk",
      completion: MID_MARKETS,
      defaultTab: "details",
    });
    expect(screen.tab).toBe("markets");
    expect(screen.source).toBe("furthest-unfinished");
  });

  it("drops the oldest deals once the memory cap is hit", () => {
    let memory = emptyDealResumeMemory();
    for (let index = 0; index < DEAL_RESUME_DEAL_LIMIT + 5; index += 1) {
      memory = rememberDealPlace(memory, {
        dealId: `deal-${index}`,
        productKey: "homeowners",
        tab: "documents",
        at: index,
      });
    }
    expect(Object.keys(memory.deals)).toHaveLength(DEAL_RESUME_DEAL_LIMIT);
    expect(memory.deals["deal-0"]).toBeUndefined();
    expect(memory.deals[`deal-${DEAL_RESUME_DEAL_LIMIT + 4}`]?.tab).toBe("documents");
  });
});

describe("deal resume scope", () => {
  it("wires resume on the deal workspace and leaves policy, book, and renewals alone", () => {
    const dealPage = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(dealPage).toMatch(/selectResumeProduct/);
    expect(dealPage).toMatch(/selectResumeTab/);
    expect(dealPage).toMatch(/saveDealResumePlace/);
    expect(dealPage).toMatch(/DealResumeNotice/);
    for (const file of [
      "src/app/policies/[id]/page.tsx",
      "src/app/policies/page.tsx",
      "src/app/renewals/page.tsx",
      "src/app/renewals/queue/page.tsx",
      "src/app/quotes/page.tsx",
      "src/app/deals/page.tsx",
      "src/app/deals/new/page.tsx",
      "src/app/book-health/page.tsx",
      "src/app/book-life/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/selectResumeProduct|saveDealResumePlace|DealResumeNotice/);
    }
  });
});
