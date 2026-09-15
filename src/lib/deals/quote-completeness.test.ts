import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { EXPLICIT_MARKET_ACTION_MARKER } from "@/lib/deals/manual-markets";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  classifyShopGap,
  lineQuoteCompleteness,
  packageQuotesComplete,
} from "./quote-completeness";

const MARK = EXPLICIT_MARKET_ACTION_MARKER;

describe("quote completeness", () => {
  it("classifies timeout, portal error, skip, and pending", () => {
    expect(classifyShopGap("portal timed out", "timeout")).toMatchObject({
      reason: "timeout",
      why: "Portal timed out",
    });
    expect(classifyShopGap("password expired", "portal_error")).toEqual({
      reason: "portal_error",
      why: "Portal error",
    });
    expect(classifyShopGap("not appointed for this LOB", "error")).toEqual({
      reason: "not_appointed",
      why: "Not appointed",
    });
    expect(classifyShopGap("quote-gate skip-decline", "skipped")).toEqual({
      reason: "skip",
      why: "Hard decline / skip",
    });
    expect(classifyShopGap(null, "pending")).toEqual({
      reason: "pending",
      why: "Carrier still pending",
    });
  });

  it("does not treat visiting Quotes as complete when expected carriers are still pending", () => {
    const home = lineQuoteCompleteness({
      line: "home",
      logs: [
        {
          id: "l1",
          carrierId: "citizens",
          lineOfBusiness: "HO",
          result: "quoted",
          why: `${MARK} quoted`,
          attemptedAt: "2026-09-15T12:00:00.000Z",
        },
        {
          id: "l2",
          carrierId: "universal",
          lineOfBusiness: "HO",
          result: "timeout",
          why: `${MARK} timed out waiting for portal`,
          attemptedAt: "2026-09-15T12:01:00.000Z",
        },
      ],
      quotes: [{ carrierId: "citizens", stub: false, shopLine: "home" }],
      carriers: [
        { id: "citizens", name: "Citizens" },
        { id: "universal", name: "Universal" },
      ],
    });
    expect(home.complete).toBe(false);
    expect(home.missing).toEqual([
      {
        carrierId: "universal",
        carrierName: "Universal",
        reason: "timeout",
        why: "Portal timed out",
      },
    ]);
    expect(home.summary).toMatch(/Missing quotes — Universal \(Portal timed out\)/);
  });

  it("treats declined / skip as resolved, not missing", () => {
    const home = lineQuoteCompleteness({
      line: "home",
      logs: [
        {
          id: "l1",
          carrierId: "citizens",
          lineOfBusiness: "HO",
          result: "quoted",
          why: `${MARK} quoted`,
        },
        {
          id: "l2",
          carrierId: "skipco",
          lineOfBusiness: "HO",
          result: "declined",
          why: `${MARK} quote-gate skip-decline`,
        },
      ],
      quotes: [{ carrierId: "citizens", stub: false, shopLine: "home" }],
    });
    expect(home.complete).toBe(true);
    expect(home.missing).toEqual([]);
  });

  it("keeps completeness per product — Home can be done while Auto warns", () => {
    const logs = [
      {
        id: "h1",
        carrierId: "citizens",
        lineOfBusiness: "HO",
        result: "quoted",
        why: `${MARK} quoted`,
      },
      {
        id: "a1",
        carrierId: "prog",
        lineOfBusiness: "AUTO",
        result: "pending",
        why: `${MARK} still running`,
      },
    ];
    const quotes = [
      { carrierId: "citizens", stub: false, shopLine: "home" as const },
    ];
    const home = lineQuoteCompleteness({ line: "home", logs, quotes });
    const auto = lineQuoteCompleteness({ line: "auto", logs, quotes });
    expect(home.complete).toBe(true);
    expect(auto.complete).toBe(false);
    expect(auto.summary).toMatch(/Missing quotes/);
    expect(packageQuotesComplete(["home", "auto"], { home, auto })).toBe(false);
    expect(packageQuotesComplete(["home"], { home, auto })).toBe(true);
  });

  it("renders a per-product Missing quotes chip instead of a green check", () => {
    const html = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-1",
        products: ["homeowners", "auto"],
        active: "homeowners",
        tab: "quotes",
        complete: { homeowners: true, auto: true },
        quoteGaps: {
          homeowners: { complete: true, shopped: true, summary: "1 quote in" },
          auto: {
            complete: false,
            shopped: true,
            summary: "Missing quotes — Progressive (Portal timed out)",
          },
        },
      }),
    );
    expect(html).toMatch(/data-ff-product-missing-quotes="1"/);
    expect(html).toMatch(/data-ff-deal-product-chip="auto"[^>]*data-ff-product-quotes-complete="0"/);
    expect(html).toMatch(/data-ff-product-missing-quotes-chip=""/);
    expect(html).toContain("Missing quotes");
    expect(html).toMatch(/data-ff-deal-product-chip="homeowners"[^>]*data-ff-product-quotes-complete="1"/);
    expect(html).not.toMatch(
      /data-ff-deal-product-chip="auto"[^>]*data-ff-product-complete="1"/,
    );
  });

  it("shows the Quotes missing-quote warning on the active line", () => {
    const carrier = {
      id: "car-1",
      tenantId: "t",
      name: "Citizens",
      writtenLines: ["HO"],
    } as Carrier;
    const quote = {
      id: "q1",
      tenantId: "t",
      dealId: "deal-1",
      riskId: "risk-1",
      carrierId: "car-1",
      quoteAttemptLogId: null,
      quoteNumber: null,
      premium: "1200",
      hurricaneDeductible: null,
      aopDeductible: null,
      coverageA: 310000,
      bindable: true,
      riskOutcome: "bindable",
      nextStep: "can_bind",
      coverageGaps: [],
      notes: "HO3 bindable",
      carrierOpenUrl: null,
      lostReason: null,
      agentRating: null,
      agentStatus: "new",
      reasonForNo: null,
      bindRequirements: null,
      stub: false,
      createdAt: new Date("2026-09-01T12:00:00.000Z"),
      quoteRunId: "run-2",
      shopLine: "home",
    } as Quote;
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-1",
        shopLine: "home",
        quotes: [{ quote, carrier }],
        logs: [],
        currentQuoteRunId: "run-2",
        completeness: {
          line: "home",
          shopped: true,
          complete: false,
          expected: 2,
          retrieved: 1,
          missing: [
            {
              carrierName: "Universal",
              reason: "timeout",
              why: "Portal timed out",
            },
          ],
          summary: "Missing quotes — Universal (Portal timed out)",
        },
      }),
    );
    expect(html).toMatch(/data-ff-quotes-missing-warning=""/);
    expect(html).toContain("Missing quotes — Universal (Portal timed out)");
  });
});
