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

  it("pins the chart above Quick Communications without moving the neighbors", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const css = source("src/app/globals.css");
    const motivation = source("src/components/deal/deal-motivation.tsx");
    const comms = source("src/components/comms/quick-comms-board.tsx");
    const qc = page.indexOf('data-ff-deal-quick-comms=""');
    const chartAt = page.indexOf("<DealQuoteCloseChart");
    const boardAt = page.indexOf("<QuickCommsBoard");
    expect(page.indexOf("<DealMotivation")).toBeLessThan(qc);
    expect(chartAt).toBeGreaterThan(qc);
    expect(chartAt).toBeLessThan(boardAt);
    expect(page.slice(qc, boardAt)).toMatch(/data-ff-deal-quote-close-slot/);
    expect(css).toMatch(/\[data-ff-deal-quote-close-slot\][\s\S]*position: absolute;/);
    expect(css).toMatch(/\[data-ff-deal-quote-close-slot\][\s\S]*bottom: calc\(100% \+ 1rem\);/);
    expect(css).toMatch(
      /margin-top: calc\(-1 \* \(var\(--ff-deal-tab-group-gap\) \+ var\(--ff-deal-tab-group-pad\)\)\);/,
    );
    expect(motivation).toMatch(/Monthly momentum/);
    expect(motivation).toMatch(/h-\[92px\] w-\[92px\]/);
    expect(motivation).toMatch(/text-\[11px\] font-semibold uppercase tracking-\[0\.16em\] text-muted-foreground/);
    expect(comms).toMatch(/Quick Communications/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/paddingTop: 50/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/flex items-start justify-end gap-2/);
    expect(source("src/lib/desk/activity-rail.ts")).toMatch(/ACTIVITY_RAIL_PX = 400/);
  });
});
