import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import {
  isBoundQuote,
  pickBoundQuoteId,
  resolveDealStampStage,
} from "./status-stamp";

describe("deal status stamp", () => {
  it("resolves quote_sent, bound, policy_issued, and closed_won", () => {
    expect(resolveDealStampStage("quote_sent")).toBe("quote_sent");
    expect(resolveDealStampStage("Quote Sent")).toBe("quote_sent");
    expect(resolveDealStampStage("pending_inspection")).toBe("bound");
    expect(resolveDealStampStage("bound")).toBe("bound");
    expect(resolveDealStampStage("policy_issued")).toBe("policy_issued");
    expect(resolveDealStampStage("closed_won")).toBe("closed_won");
    expect(resolveDealStampStage(null, null, "2026-09-15T12:00:00.000Z")).toBe("bound");
    expect(resolveDealStampStage("shopping")).toBeNull();
    expect(resolveDealStampStage("review")).toBeNull();
  });

  it("renders a non-blocking paper stamp for bound and pending inspection", () => {
    const bound = renderToString(createElement(DealStatusStamp, { stage: "bound" }));
    expect(bound).toMatch(/data-ff-deal-status-stamp="bound"/);
    expect(bound).toContain("BOUND");
    expect(bound).toContain("ff-deal-status-stamp");
    const issued = renderToString(
      createElement(DealStatusStamp, { stage: "policy_issued" }),
    );
    expect(issued).toMatch(/data-ff-deal-status-stamp="policy_issued"/);
    expect(issued).toContain("POLICY ISSUED");
    expect(renderToString(createElement(DealStatusStamp, { stage: null }))).toBe("");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/ff-stamp-ink-hit/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/pointer-events:\s*none/);
    expect(css).toMatch(/\.ff-deal-status-stamp \{[\s\S]*position: absolute;/);
    expect(css).not.toMatch(/\.ff-deal-status-stamp \{[\s\S]*position: sticky;/);
  });

  it("picks the real bound quote — does not invent one on an unbound deal", () => {
    expect(
      pickBoundQuoteId({
        dealBound: false,
        quotes: [
          { id: "a", bindable: true, agentStatus: "new" },
          { id: "b", bindable: false, agentStatus: "new" },
        ],
      }),
    ).toBeNull();
    expect(
      pickBoundQuoteId({
        dealBound: true,
        quotes: [
          { id: "a", bindable: true, agentStatus: "bound" },
          { id: "b", bindable: true, agentStatus: "new" },
        ],
      }),
    ).toBe("a");
    expect(
      pickBoundQuoteId({
        dealBound: true,
        quotes: [
          { id: "stub", bindable: true, agentStatus: "new", stub: true },
          { id: "live", bindable: true, agentStatus: "new", stub: false },
        ],
      }),
    ).toBeNull();
    expect(
      pickBoundQuoteId({
        dealBound: true,
        selectedQuoteIds: ["live"],
        quotes: [
          { id: "stub", bindable: true, agentStatus: "new", stub: true },
          { id: "live", bindable: true, agentStatus: "new", stub: false },
        ],
      }),
    ).toBe("live");
    expect(
      pickBoundQuoteId({
        dealBound: true,
        quotes: [{ id: "stub", bindable: true, agentStatus: "new", stub: true }],
      }),
    ).toBeNull();
    expect(isBoundQuote({ quoteId: "a", agentStatus: "bound" })).toBe(true);
    expect(isBoundQuote({ quoteId: "a", boundQuoteId: "a" })).toBe(true);
    expect(isBoundQuote({ quoteId: "a", boundQuoteId: "b" })).toBe(false);
  });
});
