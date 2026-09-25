import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HealthMarketsEmpty } from "@/components/deal/life-appetite-helper";
import { LifeHealthQuotesPanel } from "@/components/deal/life-health-quotes-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { isLifeHealthShopLine } from "@/lib/deals/deal-products";
import {
  lifeHealthQuoteCarriers,
  parseLifeHealthFaceAmount,
  parseLifeHealthPremium,
  parseLifeHealthQuoteOutcome,
} from "@/lib/life/quote-writer";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Life/Health Markets + Quotes + one Create notice", () => {
  it("keeps Life/Health Markets appetite-only and Quotes as a writer", () => {
    expect(isLifeHealthShopLine("life")).toBe(true);
    expect(isLifeHealthShopLine("health")).toBe(true);
    expect(isLifeHealthShopLine("home")).toBe(false);

    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/<LifeHealthQuotesPanel/);
    expect(page).toMatch(/HealthMarketsEmpty/);
    expect(page).toMatch(/lifeHealthLine \? \(/);
    expect(page).toMatch(/dateOfBirth/);
    expect(page).not.toMatch(/noticeAction=/);
    const marketsStart = page.indexOf('id === "markets"');
    expect(page.indexOf("<LifeAppetiteHelper", marketsStart)).toBeGreaterThan(marketsStart);
    expect(page.indexOf("<LifeHealthQuotesPanel", marketsStart)).toBeGreaterThan(
      page.indexOf("<LifeAppetiteHelper", marketsStart),
    );

    const marketsBlock = page.slice(
      marketsStart,
      page.indexOf("lifeHealthLine ?", marketsStart),
    );
    expect(marketsBlock).toMatch(/LifeAppetiteHelper/);
    expect(marketsBlock).not.toMatch(/requestAppetiteQuotesAction/);
    expect(marketsBlock).toMatch(/sheetLine === "health"/);

    expect(source("src/app/actions/quotes.ts")).toMatch(/saveLifeHealthQuoteResultAction/);
    expect(source("src/app/actions/quotes.ts")).toMatch(/Quote writer is Life\/Health only/);
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(/Go to Markets/);
    expect(source("src/components/deal/quotes-panel.tsx")).not.toMatch(/noticeAction/);
    expect(source("src/components/deal/quotes-results-table.tsx")).not.toMatch(/data-ff-quotes-create-notice/);
  });

  it("filters quote-writer carriers and parses results without inventing premiums", () => {
    const rows = lifeHealthQuoteCarriers(
      [
        { id: "americo", name: "Americo", writtenLines: ["LIFE"] },
        { id: "empty", name: "Empty Lines", writtenLines: [] },
        { id: "home", name: "Home Co", writtenLines: ["HO"] },
        { id: "moo", name: "Mutual of Omaha", writtenLines: ["AUTO"] },
      ],
      "LIFE",
    );
    expect(rows.map((row) => row.id)).toEqual(["americo"]);
    expect(lifeHealthQuoteCarriers([{ id: "moo", name: "Mutual of Omaha", writtenLines: [] }], "LIFE").map((row) => row.id)).toEqual(
      ["moo"],
    );
    expect(parseLifeHealthQuoteOutcome("declined")).toBe("declined");
    expect(parseLifeHealthQuoteOutcome("nope")).toBe("conditional");
    expect(parseLifeHealthPremium("$1,240.50")).toBe("1240.50");
    expect(parseLifeHealthPremium("")).toBeNull();
    expect(parseLifeHealthFaceAmount("250,000")).toBe(250000);
  });

  it("renders a Life quote writer instead of P&C pull or a second Create notice", () => {
    const html = renderToString(
      createElement(LifeHealthQuotesPanel, {
        dealId: "deal-life",
        quotes: [],
        logs: [],
        carriers: [
          { id: "americo", name: "Americo", writtenLines: ["LIFE"] },
          { id: "home", name: "Home Co", writtenLines: ["HO"] },
        ],
        dealLine: "LIFE",
        shopLine: "life",
        product: "life_term",
      }),
    );
    expect(html).toContain("data-ff-life-health-quotes");
    expect(html).toContain("data-ff-life-health-quote-writer");
    expect(html).not.toContain("not a P&amp;C rate pull");
    expect(html).toContain("Americo");
    expect(html).not.toContain("Home Co");
    expect(html).not.toContain("Go to Markets");
    expect(html).not.toContain("Load shop list");
    expect(html).not.toContain("Create notice");
    expect(html).not.toContain("data-ff-quotes-create-notice");

    const healthMarkets = renderToString(createElement(HealthMarketsEmpty));
    expect(healthMarkets).toContain("data-ff-health-markets-empty");
    expect(healthMarkets).toContain("Health Markets");
    expect(healthMarkets).not.toContain("no rate pull");

    const pcEmpty = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-home",
        quotes: [],
        logs: [],
      }),
    );
    expect(pcEmpty).toContain("Go to Markets");
    expect(pcEmpty).not.toContain("Create notice");
  });
});
