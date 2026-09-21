import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { EXPLICIT_MARKET_ACTION_MARKER, EXCLUDE_MARKET_MARKER } from "@/lib/deals/manual-markets";
import {
  manualQuoteTarget,
  manualQuoteWrite,
  marketCarriersForManualQuote,
  parseManualQuotePremium,
} from "@/lib/deals/manual-quote";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("manual quote entry", () => {
  it("lists Markets carriers on this line and drops excluded or other-line rows", () => {
    const carriers = marketCarriersForManualQuote(
      [
        {
          carrierId: "trav",
          carrierName: "Travelers",
          lineOfBusiness: "AUTO",
          why: `${EXPLICIT_MARKET_ACTION_MARKER} appetite shop`,
        },
        {
          carrierId: "prog",
          carrierName: "Progressive",
          lineOfBusiness: "AUTO",
          why: `${EXPLICIT_MARKET_ACTION_MARKER} ${EXCLUDE_MARKET_MARKER} removed`,
        },
        {
          carrierId: "cit",
          carrierName: "Citizens",
          lineOfBusiness: "HO",
          why: `${EXPLICIT_MARKET_ACTION_MARKER} appetite shop`,
        },
      ],
      "auto",
    );
    expect(carriers).toEqual([{ id: "trav", name: "Travelers" }]);
  });

  it("parses a positive premium and rejects blanks", () => {
    expect(parseManualQuotePremium("$2,109")).toBe("2109.00");
    expect(parseManualQuotePremium("2109")).toBe("2109.00");
    expect(parseManualQuotePremium("")).toBeNull();
    expect(parseManualQuotePremium("0")).toBeNull();
    expect(parseManualQuotePremium("-5")).toBeNull();
  });

  it("shows carrier + premium on an empty Quotes tab when Markets already selected", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-auto",
        quotes: [],
        shopLine: "auto",
        product: "auto",
        logs: [
          {
            log: {
              carrierId: "trav",
              why: `${EXPLICIT_MARKET_ACTION_MARKER} appetite shop`,
              lineOfBusiness: "AUTO",
            },
            carrier: { name: "Travelers" },
          },
        ] as never,
      }),
    );
    expect(html).toMatch(/0 quote rows/);
    expect(html).toMatch(/data-ff-record-manual-quote/);
    expect(html).toMatch(/data-ff-record-manual-quote-premium/);
    expect(html).toMatch(/Travelers/);
    expect(html).toMatch(/Record Quote/);
  });

  it("does not show the premium form when Markets has no carriers", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-empty",
        quotes: [],
        logs: [],
      }),
    );
    expect(html).not.toMatch(/data-ff-record-manual-quote/);
  });

  it("writes a live quotes row from the Quotes action", () => {
    const action = source("src/app/actions/quotes.ts");
    const start = action.indexOf("export async function recordManualQuoteAction");
    const end = action.indexOf("export async function deleteSelectedQuotesAction");
    const body = action.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(body).toMatch(/parseManualQuotePremium/);
    expect(body).toMatch(/marketCarriersForManualQuote/);
    expect(body).toMatch(/\.insert\(quotes\)/);
    expect(body).not.toMatch(/\.delete\(/);
    expect(body).not.toMatch(/db:wipe|wipe-crm|delete from/i);
  });

  it("fills the same-line quote and leaves other rows alone", () => {
    const rows = [
      { id: "home-q", shopLine: "home", stub: false, notes: "Keep me", quoteRunId: "run-home" },
      { id: "auto-stub", shopLine: "auto", stub: true, notes: null, quoteRunId: null },
    ];
    expect(manualQuoteTarget(rows, "auto")?.id).toBe("auto-stub");
    const write = manualQuoteWrite({
      existing: manualQuoteTarget(rows, "auto"),
      premium: "2109.00",
      shopLine: "auto",
      quoteRunId: "run-auto",
      attemptLogId: "log-1",
      riskOutcome: "bindable",
      nextStep: "can_bind",
      bindable: true,
    });
    expect(write.premium).toBe("2109.00");
    expect(write.stub).toBe(false);
    expect(write.quoteRunId).toBe("run-auto");
    expect(write.notes).toBe("Manual quote recorded. No portal pull.");
    expect(write).not.toHaveProperty("agentStatus");
    const kept = manualQuoteWrite({
      existing: rows[0]!,
      premium: "2109.00",
      shopLine: "auto",
      quoteRunId: "run-new",
      attemptLogId: "log-2",
      riskOutcome: "bindable",
      nextStep: "can_bind",
      bindable: true,
    });
    expect(kept.notes).toBeUndefined();
    expect(kept.quoteRunId).toBeUndefined();
    expect(kept.shopLine).toBe("home");
  });
});
