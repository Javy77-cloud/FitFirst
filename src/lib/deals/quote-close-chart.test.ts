import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealQuoteCloseChart } from "@/components/deal/deal-quote-close-chart";
import { buildMotivationStats } from "./motivation";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal quote-close chart", () => {
  it("renders a colored donut from real bound and shopped counts", () => {
    const stats = buildMotivationStats({
      quotesToday: 4,
      boundThisMonth: 3,
      shoppedThisMonth: 9,
      sparkQuotes: [1, 2, 3],
    });
    const html = renderToStaticMarkup(createElement(DealQuoteCloseChart, { stats }));
    expect(html).toMatch(/data-ff-quote-close-chart="donut"/);
    expect(html).toMatch(/data-ff-quote-close-arc="bound"/);
    expect(html).toMatch(/data-ff-quote-close-arc="open"/);
    expect(html).toContain("#12b886");
    expect(html).toContain("#f26522");
    expect(html).toContain("33%");
    expect(html).toContain("Bound");
    expect(html).toContain("Open");
    expect(html).not.toMatch(/<polyline/);
    expect(html).not.toMatch(/<line /);
    expect(html).not.toMatch(/shopped this month/i);
  });

  it("keeps an empty ring and an em dash when the ratio is not real", () => {
    const stats = buildMotivationStats({
      quotesToday: 0,
      boundThisMonth: 0,
      shoppedThisMonth: 0,
      sparkQuotes: [],
    });
    const html = renderToStaticMarkup(createElement(DealQuoteCloseChart, { stats }));
    expect(html).toContain("—");
    expect(html).not.toMatch(/data-ff-quote-close-arc/);
    expect(html).not.toMatch(/\d+%/);
  });

  it("keeps the donut component off the deal rail", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const css = source("src/app/globals.css");
    expect(page).not.toMatch(/<DealQuoteCloseChart/);
    expect(page).not.toMatch(/<DealMotivation/);
    expect(page).not.toMatch(/data-ff-deal-quote-close-slot/);
    expect(css).not.toMatch(/\[data-ff-deal-quote-close-slot\]/);
    expect(source("src/components/comms/quick-comms-board.tsx")).toMatch(/Quick Communications/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/paddingTop: 50/);
    expect(source("src/lib/desk/activity-rail.ts")).toMatch(/ACTIVITY_RAIL_PX = 400/);
  });
});
