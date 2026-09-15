import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7fw Documents Confirm → Markets; Markets Approve → Quotes", () => {
  it("FW1 — Documents Confirm lands Markets; Markets Approve & request lands Quotes", () => {
    const quoting = source("src/app/actions/quoting.ts");
    expect(quoting).toMatch(
      /redirect\(withFlash\(`\/deals\/\$\{dealId\}\?tab=markets&line=\$\{line\}`, "quotes-requested"\)\)/,
    );
    expect(quoting).not.toMatch(
      /redirect\(withFlash\(`\/deals\/\$\{dealId\}\?tab=quotes&line=\$\{line\}`, "quotes-requested"\)\)/,
    );
    const quotes = source("src/app/actions/quotes.ts");
    expect(quotes).toMatch(
      /flashAction\(`\/deals\/\$\{dealId\}\?tab=quotes\$\{line \? `&line=\$\{line\}` : ""\}`, "quotes-requested"\)/,
    );
    expect(quotes).not.toMatch(
      /flashAction\(`\/deals\/\$\{dealId\}\?tab=markets`, "quotes-requested"\)/,
    );
  });

  it("FW2 — empty Markets shows 0 counters + Load list + Add carriers", () => {
    const html = renderToString(
      createElement(MarketsPanel, {
        dealId: "deal-mario",
        matches: [],
        manualIds: [],
        carriers: [{ id: "c1", name: "Home Co", writtenLines: ["HO"] }],
        dealLine: "HO",
      }),
    );
    expect(html).toMatch(/data-ff-markets-empty/);
    expect(html).toMatch(/0 in appetite · 0 stretch · 0 skip · 0 appointed/);
    expect(html).toMatch(/data-ff-load-home-shop-list/);
    expect(html).toMatch(/Add carrier manually/);
    expect(html).toMatch(/Home Co/);
  });

  it("FW3 — empty Quotes is never a bare blank; Go to Markets + load/add", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-mario",
        quotes: [],
        logs: [],
        carriers: [{ id: "c1", name: "Home Co", writtenLines: ["HO"] }],
        dealLine: "HO",
      }),
    );
    expect(html).toMatch(/data-ff-quotes-empty/);
    expect(html).toMatch(/data-ff-deal-quotes-empty/);
    expect(html).toMatch(/0 quote rows/);
    expect(html).toMatch(/Go to Markets/);
    expect(html).toMatch(/data-ff-quotes-go-markets/);
    expect(html).toMatch(/\?tab=markets/);
    expect(html).toMatch(/data-ff-load-home-shop-list/);
    expect(html).toMatch(/Add carrier manually/);
  });

  it("FW4 — deal page passes carriers into QuotesPanel for empty add", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/<QuotesPanel/);
    expect(page).toMatch(/carriers=\{carrierOptions\}/);
    expect(page).toMatch(/dealLine=\{activeLob\}/);
  });
});
