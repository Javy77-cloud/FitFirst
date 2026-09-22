import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { hasMarketLookupData } from "./manual-markets";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7bi builder rail Markets Quotes", () => {
  it("BI1 — builder keeps three columns: compact types beside Left and Right", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-builder-lock="three-col"/);
    expect(builder).toMatch(/grid-cols-\[max-content_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
    expect(builder).toMatch(/items-start/);
    expect(builder).not.toMatch(/grid-cols-3/);
    expect(builder).toMatch(/data-ff-builder-palette/);
    expect(builder).toMatch(/data-ff-palette-compact/);
    expect(builder).toMatch(/flex w-full cursor-grab/);
    expect(builder).toMatch(/data-ff-palette-chip-width="longest"/);
    const chipClass = builder.match(
      /className="flex w-full cursor-grab items-center gap-1.5 whitespace-nowrap[^"]+"/,
    );
    expect(chipClass).toBeTruthy();
    expect(chipClass?.[0]).toContain("w-full");
    expect(chipClass?.[0]).not.toMatch(/[" ]w-max /);
  });

  it("BI2 — no LOB clip filters on the field builder", () => {
    const page = source("src/app/settings/field-builder/page.tsx");
    expect(page).not.toMatch(/DEAL_LAYOUT_LINES/);
    expect(page).not.toMatch(/data-ff-builder-lobs/);
    expect(page).not.toMatch(/Homeowners/);
    expect(page).toMatch(/ModuleLayoutNav/);
    expect(page).toMatch(/FieldBuilder/);
    expect(page).not.toMatch(/Compact field-type chips sit beside Left and Right/);
    expect(source("src/components/custom-fields/field-builder.tsx")).not.toMatch(/data-ff-builder-lobs/);
  });

  it("BI3 — deal right rail is forced to 320px and Sheet health cannot be 28rem", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const tabs = source("src/components/section-tabs.tsx");
    const health = source("src/components/deal/sheet-health-toggle.tsx");
    const css = source("src/app/globals.css");
    expect(tabs).toMatch(/data-ff-deal-right-rail/);
    expect(tabs).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(page).not.toMatch(/lg:w-\[320px\]/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(health).toMatch(/w-full min-w-0 max-w-full/);
    expect(health).not.toMatch(/28rem/);
    expect(health).not.toMatch(/16rem/);
    expect(health).not.toMatch(/min-w-\[16rem\]/);
    expect(health).not.toMatch(/sm:w-\[28rem\]/);
    expect(css).toMatch(/\[data-ff-deal-right-rail\]/);
    expect(css).toMatch(/width: var\(--ff-activity-rail\) !important;/);
    expect(css).toMatch(/max-width: var\(--ff-activity-rail\) !important;/);
  });

  it("BI4 — empty sheet ignores leftover matches; a filled sheet paints appetite without a shop", () => {
    expect(hasMarketLookupData([{ carrierId: "c1" }], [])).toBe(false);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], true, true)).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [], false, true)).toBe(true);
    expect(hasMarketLookupData([], [], false, true)).toBe(false);
    expect(hasMarketLookupData([], ["c1"])).toBe(true);
    const leftover = {
      carrierId: "c1",
      carrierName: "Home Co",
      band: "green" as const,
      fitScore: 88,
      reasons: [],
      learnedDecline: false,
      shoppable: true,
    };
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-auto",
        matches: [leftover],
        manualIds: [],
        explicitLookup: true,
        sheetHasValues: false,
        carriers: [],
      }),
    );
    expect(html).toMatch(/In appetite/);
    expect(html).toMatch(/Home Co/);
    const filled = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-filled",
        matches: [leftover],
        manualIds: [],
        sheetHasValues: true,
        carriers: [],
      }),
    );
    expect(filled).toMatch(/In appetite/);
    expect(filled).toMatch(/Home Co/);
    expect(filled).toMatch(/Request Quotes/);
    expect(filled).not.toMatch(/data-ff-markets-empty/);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/hasShopMarketAction|hasExplicitMarketAction/);
    expect(page).toMatch(/evaluateDealMarkets\(risk, activeSheet\.values/);
    expect(page).toMatch(/sheetReady \|\| shopMarketsAction \|\| shopListIds\.length > 0/);
    expect(page).not.toMatch(/const matches = risk \? await evaluateDealMarkets\(risk\)/);
    expect(page).not.toMatch(/sheetReady \? await evaluateDealMarkets/);
    expect(page).toMatch(/sheetHasValues=\{sheetReady\}/);
    expect(page).toMatch(/matches=\{sheetReady \|\| shopMarketsAction \? matches : listedMatches\}/);
    expect(page).toMatch(/explicitLookup=\{shopMarketsAction\}/);
    expect(page).not.toMatch(/explicitLookup=\{sheetReady && logs\.length > 0\}/);
    expect(page).not.toMatch(/requestAppetiteQuotesAction/);
    expect(source("src/lib/appetite/evaluate-deal.ts")).toMatch(/sheetHasMarketFacts/);
  });

  it("BI5 — Quotes with no rows shows Markets handoff card", () => {
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
    expect(html).not.toMatch(/Quotes land here/);
    expect(html).not.toMatch(/border-dashed/);
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
  });
});
