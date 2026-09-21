import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { DOCS_ZOOM_DEFAULT, DOCS_ZOOM_LOCKED } from "./documents-zoom";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7bg deal page four fixes", () => {
  it("BG1 — Markets empty shows zero counters + load/add, not leftover rows", () => {
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
    expect(html).toMatch(/data-ff-load-home-shop-list/);
    expect(html).not.toMatch(/In appetite/);
    expect(html).not.toMatch(/Request Quotes/);

    const evaluate = source("src/lib/appetite/evaluate-deal.ts");
    expect(evaluate).toMatch(/hasMarketLookupInput/);
    expect(evaluate).toMatch(/return \[\]/);
  });

  it("BG2 — Documents has no Fit/100% toggle and locks the sheet at 100%", () => {
    expect(DOCS_ZOOM_LOCKED).toBe("100");
    expect(DOCS_ZOOM_DEFAULT).toBe("100");
    const panel = source("src/components/deal/documents-panel.tsx");
    expect(panel).toMatch(/data-ff-docs-zoom="100"/);
    expect(panel).not.toMatch(/DocumentsZoom/);
    expect(panel).not.toMatch(/Fit to screen/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-toolbar/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-fit/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-full/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/overflow-visible/);
  });

  it("BG3 — deal right rail is locked on section-tabs, not a 300px leftover", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const tabs = source("src/components/section-tabs.tsx");
    expect(tabs).toMatch(/data-ff-deal-right-rail/);
    expect(tabs).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(page).not.toMatch(/lg:w-\[300px\]/);
    expect(page).not.toMatch(/max-w-\[300px\]/);
  });

  it("BG4 — Deal Details Contact and Address columns split 50/50", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-2/);
    expect(panel).not.toMatch(/minmax\(0,2fr\)/);
    expect(panel).not.toMatch(/minmax\(0,3fr\)/);

    const layout = defaultLayoutForLine("HO");
    expect(layout.columns).toHaveLength(2);
    const html = renderToString(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout,
        fields: [
          { key: "first_name", label: "First name", type: "single_line" },
          { key: "mailing_address", label: "Address", type: "single_line" },
        ],
        values: {},
      }),
    );
    expect(html).toMatch(/data-ff-deal-details-col="left"/);
    expect(html).toMatch(/data-ff-deal-details-col="right"/);
    expect(html).toMatch(/grid-cols-2/);
  });

  it("BG6 — Quotes empty is a useful card (not a dead blank)", () => {
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).toMatch(/data-ff-deal-quotes-empty/);
    expect(quotes).toMatch(/data-ff-quotes-empty/);
    expect(quotes).toMatch(/Go to Markets/);
    expect(quotes).toMatch(/LoadShopListButton/);
    expect(quotes).toMatch(/ManualCarrierAdd/);
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
  });
});
