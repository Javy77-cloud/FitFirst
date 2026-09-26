import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealResumeNotice } from "@/components/deal/deal-resume-notice";
import {
  DEAL_RESUME_DEAL_LIMIT,
  GLORIA_MARTINEZ_DEAL_ID,
  dealResumePlaceUnchanged,
  deletedProductNotice,
  emptyDealResumeMemory,
  parseDealResumeMemory,
  rememberDealPlace,
  selectResumeProduct,
  selectResumeTab,
  shouldPersistDealResume,
} from "./deal-resume";

/** Gloria Martinez property file: HO3, DP3, and a second HO3. */
const GLORIA_PRODUCTS = ["homeowners", "landlord", "homeowners~88uvyj"] as const;

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
      defaultTab: "details",
    });
    expect(product.productParam).toBe("landlord");
    expect(product.fallback).toBeNull();
    expect(screen).toEqual({ tab: "markets", source: "remembered" });
    expect(screen.tab).not.toBe("details");
  });

  it("keeps an explicit Markets click ahead of a stuck Details default", () => {
    expect(
      selectResumeTab({
        explicitTab: "markets",
        rememberedTab: "details",
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

describe("deal resume — last action wins over progress", () => {
  it("uses the current default entry when there is no memory", () => {
    expect(
      selectResumeProduct({ instanceKeys: GLORIA_PRODUCTS }),
    ).toEqual({ productParam: undefined, ignoreLine: false, fallback: null });
    expect(selectResumeTab({ defaultTab: "details" })).toEqual({ tab: "details", source: "default" });
    expect(shouldPersistDealResume({})).toBe(false);
    expect(parseDealResumeMemory(null).deals).toEqual({});
    expect(parseDealResumeMemory("{")).toEqual(emptyDealResumeMemory());
  });

  it("restores Gloria form B on Documents after form A is ready to bind", () => {
    const readyToBind = rememberDealPlace(emptyDealResumeMemory(), {
      dealId: GLORIA_MARTINEZ_DEAL_ID,
      productKey: "homeowners",
      tab: "quotes",
      at: 1,
    });
    const lastAction = rememberDealPlace(readyToBind, {
      dealId: GLORIA_MARTINEZ_DEAL_ID,
      productKey: "landlord",
      tab: "documents",
      at: 2,
    });
    const place = lastAction.deals[GLORIA_MARTINEZ_DEAL_ID];
    const product = selectResumeProduct({
      rememberedProductKey: place?.productKey,
      instanceKeys: GLORIA_PRODUCTS,
    });
    const screen = selectResumeTab({
      rememberedTab: place?.tab,
      defaultTab: "quotes",
    });
    expect(product.productParam).toBe("landlord");
    expect(product.productParam).not.toBe("homeowners");
    expect(screen).toEqual({ tab: "documents", source: "remembered" });
  });

  it("keeps the last screen when that step is already complete", () => {
    expect(
      selectResumeTab({
        rememberedTab: "documents",
        defaultTab: "quotes",
      }),
    ).toEqual({ tab: "documents", source: "remembered" });
    expect(
      selectResumeTab({
        rememberedTab: "markets",
        defaultTab: "quotes",
      }),
    ).toEqual({ tab: "markets", source: "remembered" });
  });

  it("does not invent a later screen when the stored tab is not a deal screen", () => {
    const screen = selectResumeTab({
      rememberedTab: "master-risk",
      defaultTab: "details",
    });
    expect(screen).toEqual({ tab: "details", source: "default" });
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
    expect(dealPage).not.toMatch(/furthest-unfinished|furthestUnfinished|nearest to bind/);
    const resume = readFileSync("src/lib/deals/deal-resume.ts", "utf8");
    expect(resume).not.toMatch(/furthest-unfinished|furthestUnfinished/);
    expect(resume).toMatch(/Last action wins/);
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
