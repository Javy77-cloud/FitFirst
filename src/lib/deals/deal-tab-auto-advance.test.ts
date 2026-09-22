import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPLICIT_MARKET_ACTION_MARKER } from "@/lib/deals/manual-markets";
import { productQuoteCompleteness } from "@/lib/deals/quote-completeness";
import { resolveShopFlowCompletion } from "@/lib/deals/shop-flow";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deal tab auto-advance + checkmarks", () => {
  it("Details save → Documents; RP Confirm → Markets; Markets request → Quotes", () => {
    const details = source("src/app/actions/custom-fields.ts");
    expect(details).toMatch(/persistDealWorkTab\(dealId, "documents"\)/);
    expect(details).toMatch(/dealDetailsSavedHref/);
    expect(source("src/lib/flash.ts")).toMatch(/tab: "documents"/);

    const quoting = source("src/app/actions/quoting.ts");
    expect(quoting).toMatch(/forceDealWorkTab\(dealId, "markets"\)/);
    expect(quoting).toMatch(
      /redirect\(withFlash\(`\/deals\/\$\{dealId\}\?tab=markets&line=\$\{line\}\$\{productQuery\}`, "Sheet approved"\)\)/,
    );

    const quotes = source("src/app/actions/quotes.ts");
    expect(quotes).toMatch(/forceDealWorkTab\(dealId, "quotes"\)/);
    expect(quotes).toMatch(/flashAction\(quotesRequestedHref\(dealId, extras\), "quotes-requested"\)/);
  });

  it("lights Documents on unlock and Quotes after a market request without premiums", () => {
    const unlocked = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: false,
      hasQuotes: false,
      currentFingerprint: "fp",
      saved: {},
    });
    expect(unlocked.isComplete("details")).toBe(true);
    expect(unlocked.isComplete("documents")).toBe(true);
    expect(unlocked.isComplete("markets")).toBe(false);
    expect(unlocked.isComplete("quotes")).toBe(false);

    const afterRequest = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: true,
      currentFingerprint: "fp",
      saved: { marketsFingerprint: "fp", quotesFingerprint: "fp" },
    });
    expect(afterRequest.completed).toEqual([
      "create",
      "details",
      "documents",
      "markets",
      "quotes",
    ]);

    const completeness = productQuoteCompleteness({
      product: "homeowners",
      logs: [
        {
          id: "log-1",
          carrierId: "c1",
          lineOfBusiness: "HO",
          why: `${EXPLICIT_MARKET_ACTION_MARKER} appetite shop`,
        },
      ],
      quotes: [],
      carriers: [{ id: "c1", name: "Home Co" }],
    });
    expect(completeness.shopped).toBe(true);

    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/documentsComplete: Boolean\(unlocked\)/);
    expect(page).toMatch(/shopMarketsAction,/);
  });
});
