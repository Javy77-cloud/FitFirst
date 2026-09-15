import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  STALE_SHOP_FINGERPRINT,
  fingerprintsMatch,
  groupQuotesByRun,
  inferShopLineFromQuoteNotes,
  nextShopFlowAfterQuoteRun,
  parseShopFlow,
  quoteMatchesShopLine,
  resolveQuoteShopLine,
  resolveShopFlowCompletion,
  riskFingerprint,
  sheetValuesFingerprint,
  staleShopFlow,
} from "./shop-flow";

const homeSheet = {
  line: "home",
  values: {
    quoting_form: { value: "HO3" },
    coverage_a: { value: "310000" },
    year_built: { value: "1998" },
  },
};

const autoSheet = {
  line: "auto",
  values: {
    quoting_form: { value: "PA" },
    vin: { value: "1HGCM82633A004352" },
  },
};

describe("shop-flow fingerprint + sticky completion", () => {
  it("keeps later stages complete when the agent navigates back", () => {
    const fp = riskFingerprint({ sheets: [homeSheet, autoSheet], docs: [] });
    const completion = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: true,
      currentFingerprint: fp,
      saved: { marketsFingerprint: fp, quotesFingerprint: fp },
    });
    expect(completion.completed).toEqual(["create", "details", "documents", "markets", "quotes"]);
    const html = renderToString(
      createElement(DealFlowRail, {
        current: "details",
        completed: completion.completed,
      }),
    );
    expect(html).toMatch(/data-ff-deal-flow-current="details"/);
    expect(html).toMatch(/data-ff-deal-flow-step="documents"[^>]*data-ff-deal-flow-done="true"/);
    expect(html).toMatch(/data-ff-deal-flow-step="markets"[^>]*data-ff-deal-flow-done="true"/);
    expect(html).toMatch(/data-ff-deal-flow-step="quotes"[^>]*data-ff-deal-flow-done="true"/);
    expect(html).toContain("✓");
  });

  it("does not treat later stages as done just because the URL step is earlier", () => {
    const html = renderToString(createElement(DealFlowRail, { current: "details" }));
    expect(html).toMatch(/data-ff-deal-flow-step="quotes"[^>]*data-ff-deal-flow-done="false"/);
    expect(html).not.toMatch(/data-ff-deal-flow-step="quotes"[^>]*data-ff-deal-flow-done="true"/);
  });

  it("invalidates Markets + Quotes when the master sheet fingerprint changes", () => {
    const quoted = riskFingerprint({ sheets: [homeSheet], docs: [] });
    const edited = riskFingerprint({
      sheets: [{ ...homeSheet, values: { ...homeSheet.values, coverage_a: { value: "350000" } } }],
      docs: [],
    });
    expect(quoted).not.toBe(edited);
    const afterEdit = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: true,
      currentFingerprint: edited,
      saved: { marketsFingerprint: quoted, quotesFingerprint: quoted },
    });
    expect(afterEdit.completed).toEqual(["create", "details", "documents"]);
    expect(afterEdit.isComplete("markets")).toBe(false);
    expect(afterEdit.isComplete("quotes")).toBe(false);
    expect(afterEdit.isComplete("documents")).toBe(true);
  });

  it("invalidates on a source-doc add and on the stale sentinel", () => {
    const quoted = riskFingerprint({
      sheets: [homeSheet],
      docs: [{ id: "dec-1", filename: "dec.pdf", createdAt: "2026-09-01T00:00:00.000Z" }],
    });
    const withDoc = riskFingerprint({
      sheets: [homeSheet],
      docs: [
        { id: "dec-1", filename: "dec.pdf", createdAt: "2026-09-01T00:00:00.000Z" },
        { id: "wind-1", filename: "wind-mit.pdf", createdAt: "2026-09-15T00:00:00.000Z" },
      ],
    });
    expect(fingerprintsMatch(quoted, withDoc)).toBe(false);
    expect(fingerprintsMatch(STALE_SHOP_FINGERPRINT, quoted)).toBe(false);
    expect(fingerprintsMatch(null, quoted)).toBe(true);
    const stale = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: true,
      currentFingerprint: quoted,
      saved: staleShopFlow({ marketsFingerprint: quoted, quotesFingerprint: quoted }),
    });
    expect(stale.isComplete("markets")).toBe(false);
    expect(stale.isComplete("quotes")).toBe(false);
  });

  it("ignores quote-file uploads in the risk fingerprint", () => {
    const base = riskFingerprint({ sheets: [homeSheet], docs: [] });
    const withQuotePdf = riskFingerprint({
      sheets: [homeSheet],
      docs: [{ id: "q1", filename: "carrier.pdf", slot: "quote_file", tags: ["source:carrier"] }],
    });
    expect(withQuotePdf).toBe(base);
  });

  it("treats blank vs filled sheet values as a material change", () => {
    expect(sheetValuesFingerprint(homeSheet.values)).not.toBe(
      sheetValuesFingerprint({ coverage_a: { value: "310000" } }),
    );
  });
});

describe("line-scoped quotes", () => {
  const logs = [
    { id: "log-ho", lineOfBusiness: "HO" },
    { id: "log-auto", lineOfBusiness: "AUTO" },
    { id: "log-flood", lineOfBusiness: "FLOOD" },
  ];

  it("scopes Home / Auto / Flood from shopLine, log LOB, or notes", () => {
    expect(
      resolveQuoteShopLine({
        shopLine: "flood",
        quoteAttemptLogId: "log-ho",
        notes: "HO3 leftover",
        logs,
      }),
    ).toBe("flood");
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: "log-auto", logs, notes: null },
        "auto",
        { multiLine: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: "log-auto", logs, notes: null },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(false);
    expect(inferShopLineFromQuoteNotes("Flood National General — NFIP provisional")).toBe("flood");
    expect(inferShopLineFromQuoteNotes("PA Progressive rated $700 · VIN captured")).toBe("auto");
    expect(inferShopLineFromQuoteNotes("HO3 · Floor only · Cov A forced $250,400")).toBe("home");
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: null, notes: "Flood National General", logs: [] },
        "flood",
        { multiLine: true, isPrimaryLine: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: null, notes: "Flood National General", logs: [] },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(false);
  });

  it("does not dump untagged quotes onto every chip on a multi-line deal", () => {
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: null, notes: "", logs: [] },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesShopLine(
        { quoteAttemptLogId: null, notes: "", logs: [] },
        "home",
        { multiLine: false, isPrimaryLine: true },
      ),
    ).toBe(true);
  });

  it("does not treat Progressive / Geico as Auto, and overrides a home stamp from log or notes", () => {
    expect(inferShopLineFromQuoteNotes("Progressive HO3 · Floor only · Cov A $250,400")).toBe(
      "home",
    );
    expect(inferShopLineFromQuoteNotes("Geico quoted — portal hold")).toBe(null);
    expect(inferShopLineFromQuoteNotes("PA Progressive rated $700 · VIN captured")).toBe("auto");
    expect(
      resolveQuoteShopLine({
        shopLine: "home",
        quoteAttemptLogId: "log-auto",
        notes: null,
        logs,
      }),
    ).toBe("auto");
    expect(
      resolveQuoteShopLine({
        shopLine: "home",
        quoteAttemptLogId: null,
        notes: "Flood National General — NFIP provisional",
        logs: [],
      }),
    ).toBe("flood");
    expect(
      quoteMatchesShopLine(
        {
          shopLine: "home",
          quoteAttemptLogId: "log-flood",
          notes: "Flood National General — NFIP provisional",
          logs,
        },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesShopLine(
        {
          shopLine: "home",
          quoteAttemptLogId: "log-flood",
          notes: "Flood National General — NFIP provisional",
          logs,
        },
        "flood",
        { multiLine: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesShopLine(
        { shopLine: "auto", quoteAttemptLogId: "log-auto", notes: "PA Progressive", logs },
        "auto",
        { multiLine: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesShopLine(
        { shopLine: "auto", quoteAttemptLogId: "log-auto", notes: "PA Progressive", logs },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(false);
  });
});

describe("previous quotes stay, current run is primary", () => {
  it("collapses earlier runs under Previous quotes and keeps the current set expanded", () => {
    const rows = [
      { id: "old-a", runId: "run-1", createdAt: new Date("2026-09-01T12:00:00Z") },
      { id: "old-b", runId: "run-1", createdAt: new Date("2026-09-01T12:05:00Z") },
      { id: "new-a", runId: "run-2", createdAt: new Date("2026-09-15T18:00:00Z") },
    ];
    const grouped = groupQuotesByRun(rows, (row) => ({ runId: row.runId, createdAt: row.createdAt }), "run-2");
    expect(grouped.current.map((row) => row.id)).toEqual(["new-a"]);
    expect(grouped.previous).toHaveLength(1);
    expect(grouped.previous[0]?.rows.map((row) => row.id)).toEqual(["old-a", "old-b"]);
    expect(grouped.previous[0]?.label).toMatch(/Previous quotes/);
  });

  it("treats a first-run book (no run ids) as all current", () => {
    const grouped = groupQuotesByRun(
      [
        { id: "a", runId: null, createdAt: new Date("2026-09-01T12:00:00Z") },
        { id: "b", runId: null, createdAt: new Date("2026-09-01T12:01:00Z") },
      ],
      (row) => ({ runId: row.runId, createdAt: row.createdAt }),
      null,
    );
    expect(grouped.current.map((row) => row.id)).toEqual(["a", "b"]);
    expect(grouped.previous).toEqual([]);
  });

  it("records a new per-line run id without dropping prior flow keys", () => {
    const next = nextShopFlowAfterQuoteRun({
      saved: { quoteRuns: { home: "old-home" }, marketsFingerprint: "abc" },
      line: "auto",
      fingerprint: "new-fp",
      newRunId: "auto-2",
    });
    expect(next.quoteRuns).toEqual({ home: "old-home", auto: "auto-2" });
    expect(next.quotesFingerprint).toBe("new-fp");
    expect(parseShopFlow(next).quoteRuns?.auto).toBe("auto-2");
  });
});

describe("deal page + action wiring", () => {
  it("deal page uses sticky completion and always line-filters quotes", () => {
    const page = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(page).toMatch(/completed=\{flowCompletion\.completed\}/);
    expect(page).toMatch(/currentQuoteRunId=\{shopFlow\.quoteRuns/);
    expect(page).toMatch(/multiLine=\{packageLines\.length > 1\}/);
    expect(page).toMatch(/shopLine: row\.quote\.shopLine/);
    expect(page).toMatch(/packageQuotesComplete/);
    expect(page).toMatch(/lineQuoteCompleteness/);
    expect(page).toMatch(/quoteGaps=/);
    expect(page).toMatch(/DealStatusStamp/);
    expect(page).not.toMatch(/packageLines\.length > 1\s*\? quotes\.filter/);
  });

  it("sheet save, fill, and source-doc upload invalidate Markets/Quotes", () => {
    expect(readFileSync("src/app/actions/quote-sheet.ts", "utf8")).toMatch(
      /markShopFlowStaleAfterRiskChange/,
    );
    expect(readFileSync("src/app/actions/documents.ts", "utf8")).toMatch(
      /markShopFlowStaleAfterRiskChange/,
    );
  });
});

describe("Quotes panel line + previous chrome", () => {
  const carrier = {
    id: "car-1",
    tenantId: "t",
    name: "Citizens",
    writtenLines: ["HO"],
  } as Carrier;

  function quote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
    return {
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
      createdAt: new Date("2026-09-01T12:00:00Z"),
      quoteRunId: null,
      shopLine: "home",
      bindRecheckAckedAt: null,
      bindRecheckClearedReason: null,
      ...partial,
    } as Quote;
  }

  it("shows only the active line and collapses previous runs", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-1",
        shopLine: "home",
        formId: "HO3",
        quotes: [
          { quote: quote({ id: "cur", quoteRunId: "run-2", shopLine: "home" }), carrier },
          {
            quote: quote({
              id: "prev",
              quoteRunId: "run-1",
              shopLine: "home",
              premium: "1400",
              createdAt: new Date("2026-08-01T12:00:00Z"),
            }),
            carrier,
          },
          {
            quote: quote({
              id: "auto-cur",
              quoteRunId: "run-2",
              shopLine: "auto",
              notes: "PA Progressive",
            }),
            carrier,
          },
        ],
        logs: [],
        currentQuoteRunId: "run-2",
        multiLine: true,
      }),
    );
    expect(html).toMatch(/data-ff-quotes-line="home"/);
    expect(html).toMatch(/data-ff-quotes-current=""/);
    expect(html).toMatch(/data-ff-quote-row="cur"/);
    expect(html).not.toMatch(/data-ff-quote-row="auto-cur"/);
    expect(html).toMatch(/data-ff-quotes-previous=""/);
    expect(html).toMatch(/Previous quotes/);
    expect(html).toMatch(/data-ff-quotes-previous-open="false"/);
  });
});
