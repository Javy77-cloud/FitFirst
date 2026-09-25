import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealRailCharts } from "@/components/deal/deal-rail-charts";
import { appetiteMixForActiveProduct, chartShopListCarrierIds, shoppingProgressForDeal } from "./rail-charts";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal rail charts", () => {
  it("marks shopping progress from each product stage on this deal", () => {
    const rows = shoppingProgressForDeal([
      { key: "homeowners", label: "HO3", stage: "quote_sent" },
      { key: "auto", label: "Auto", stage: "gathering" },
    ]);
    expect(rows[0]).toMatchObject({ filled: 4, total: 7, stageLabel: "Quote sent", lost: false });
    expect(rows[1]).toMatchObject({ filled: 1, total: 7, stageLabel: "Gathering" });
    const lost = shoppingProgressForDeal([{ key: "homeowners", label: "HO3", stage: "closed_lost" }]);
    expect(lost[0]?.lost).toBe(true);
    expect(lost[0]?.filled).toBe(0);
    expect(lost[0]?.stageLabel).toBe("Closed lost");
  });

  it("counts the active product appetite mix the same way Markets does", () => {
    const mix = appetiteMixForActiveProduct({
      matches: [
        { carrierId: "a", band: "green" },
        { carrierId: "b", band: "yellow" },
        { carrierId: "c", band: "red" },
      ],
      manualIds: ["d"],
      shopListIds: ["b"],
    });
    expect(mix.slices.map((slice) => slice.count)).toEqual([2, 1, 1]);
    expect(mix.total).toBe(4);

    const life = appetiteMixForActiveProduct({
      matches: [],
      lifeOutcomes: ["accept", "decline", "unknown", "graded"],
    });
    expect(life.slices.map((slice) => slice.count)).toEqual([1, 1, 1]);
    expect(life.total).toBe(3);
  });

  it("keeps structured bands for shop-list loads and does not invent appetite", () => {
    const logs = [
      { carrierId: "vyrd", why: "[manual] [ff-markets] Loaded from Javy Home shop list." },
      { carrierId: "hoc", why: "[manual] [ff-markets] Loaded from Javy Home shop list." },
      { carrierId: "edison", why: "[manual] [ff-markets] Loaded from Javy Home shop list." },
      { carrierId: "added", why: "[manual] [ff-markets] Added by agent" },
    ];
    expect(chartShopListCarrierIds(logs).sort()).toEqual(["edison", "hoc", "vyrd"]);
    const mix = appetiteMixForActiveProduct({
      matches: [
        { carrierId: "green", band: "green" },
        { carrierId: "vyrd", band: "yellow" },
        { carrierId: "hoc", band: "red" },
      ],
      manualIds: ["vyrd", "hoc", "edison", "added"],
      shopListIds: chartShopListCarrierIds(logs),
    });
    expect(mix.slices.map((slice) => slice.count)).toEqual([2, 1, 1]);
    expect(mix.total).toBe(4);
  });

  it("renders only shopping progress and appetite mix", () => {
    const html = renderToStaticMarkup(
      createElement(DealRailCharts, {
        progress: shoppingProgressForDeal([{ key: "homeowners", label: "HO3", stage: "markets" }]),
        mix: appetiteMixForActiveProduct({
          matches: [
            { carrierId: "a", band: "green" },
            { carrierId: "b", band: "red" },
          ],
        }),
      }),
    );
    expect(html).toMatch(/data-ff-deal-shopping-progress/);
    expect(html).toMatch(/data-ff-deal-appetite-mix/);
    expect(html.indexOf("data-ff-deal-appetite-mix")).toBeLessThan(
      html.indexOf("data-ff-deal-shopping-progress"),
    );
    expect(html).toContain("Shopping progress");
    expect(html).toContain("Markets appetite mix");
    expect(html).toContain("In appetite");
    expect(html).toContain("Stretch");
    expect(html).toContain("Skip");
    expect(html).not.toMatch(/Monthly momentum/);
    expect(html).not.toMatch(/Quotes to bound/);
    expect(html).not.toMatch(/quotes pulled today/);
  });

  it("puts both graphs above Quick Communications and lines the rail up with the left panels", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const css = source("src/app/globals.css");
    const chartsAt = page.indexOf("<DealRailCharts");
    const qc = page.indexOf('data-ff-deal-quick-comms=""');
    expect(chartsAt).toBeGreaterThan(-1);
    expect(chartsAt).toBeLessThan(qc);
    expect(page).not.toMatch(/<DealMotivation/);
    expect(page).not.toMatch(/<DealQuoteCloseChart/);
    expect(page).not.toMatch(/data-ff-deal-quote-close-slot/);
    expect(page).not.toMatch(/Monthly momentum/);
    expect(page).not.toMatch(/Quotes to bound/);
    expect(css).not.toMatch(/\[data-ff-deal-quote-close-slot\]/);
    expect(css).toMatch(/\[data-ff-deal-quotes-corner\][\s\S]*align-self:\s*stretch/);
    expect(css).toMatch(/\[data-ff-deal-quotes-corner\][\s\S]*justify-content:\s*flex-end/);
    expect(css).toMatch(
      /\[data-ff-deal-workspace\] \[data-ff-deal-right-rail\] \{[^}]*margin-top:\s*0;/,
    );
    expect(css).not.toMatch(
      /margin-top:\s*calc\(-1 \* \(var\(--ff-deal-tab-group-gap\) \+ var\(--ff-deal-tab-group-pad\)\)\);/,
    );
    expect(source("src/components/section-tabs.tsx")).toMatch(/paddingTop: 50/);
    expect(source("src/components/comms/quick-comms-board.tsx")).toMatch(/Quick Communications/);
  });
});
