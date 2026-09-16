import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  STALE_SHOP_FINGERPRINT,
  attachPriorUnderCarrier,
  fingerprintsMatch,
  groupQuotesByRun,
  quoteRunIdAfterRequest,
  inferHomeProductFromQuoteNotes,
  inferShopLineFromQuoteNotes,
  nextShopFlowAfterQuoteRun,
  requestScopeForLine,
  notesLookLikeFloodProduct,
  parseShopFlow,
  quoteMatchesDealProduct,
  quoteMatchesShopLine,
  resolveQuoteShopLine,
  resolveShopFlowCompletion,
  riskFingerprint,
  sheetValuesFingerprint,
  shopLineToPersist,
  staleShopFlow,
  staleShopFlowForLine,
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
    expect(fingerprintsMatch(null, quoted)).toBe(false);
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

  it("does not mark Markets complete from a tab click or shop-list load alone", () => {
    const fp = riskFingerprint({ sheets: [homeSheet], docs: [] });
    const afterTab = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: false,
      currentFingerprint: fp,
      saved: {},
    });
    expect(afterTab.isComplete("markets")).toBe(false);
    expect(afterTab.isComplete("quotes")).toBe(false);
    expect(afterTab.completed).toEqual(["create", "details", "documents"]);

    const afterRequest = resolveShopFlowCompletion({
      detailsComplete: true,
      documentsComplete: true,
      hasMarkets: true,
      hasQuotes: true,
      currentFingerprint: fp,
      saved: nextShopFlowAfterQuoteRun({
        saved: {},
        line: "home",
        fingerprint: fp,
        newRunId: "run-req",
        requestCarrierIds: ["citizens"],
      }),
    });
    expect(afterRequest.isComplete("markets")).toBe(true);
    expect(afterRequest.isComplete("quotes")).toBe(true);
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
    expect(inferShopLineFromQuoteNotes("Form PA rated $700")).toBe("auto");
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

  it("does not tag HO3 with-flood / without-flood package notes as flood", () => {
    const edison =
      "Floor only HO3 Edison · $5,133 without flood ($6,200 with flood) · Cov A $310,000";
    const peninsula =
      "Floor only HO3 Florida Peninsula · without flood (package with flood) · Cov A forced $250,400";
    expect(inferShopLineFromQuoteNotes(edison)).toBe("home");
    expect(inferShopLineFromQuoteNotes(peninsula)).toBe("home");
    expect(notesLookLikeFloodProduct(edison)).toBe(false);
    expect(inferShopLineFromQuoteNotes("Flood NFIP (Wright WYO) — floor $489")).toBe("flood");
    expect(inferShopLineFromQuoteNotes("Flood Flow — Quoted #CFBKXE $912.19")).toBe("flood");
    expect(inferShopLineFromQuoteNotes("Couldn’t finish quote because wrong Beyond Floods account")).toBe(
      "flood",
    );
    expect(
      shopLineToPersist({
        shopLine: "home",
        quoteAttemptLogId: null,
        notes: edison,
        logs: [],
      }),
    ).toBe("home");
    expect(
      quoteMatchesShopLine(
        { shopLine: "home", quoteAttemptLogId: null, notes: edison, logs: [] },
        "flood",
        { multiLine: true, isPrimaryLine: false },
      ),
    ).toBe(false);
    expect(
      quoteMatchesShopLine(
        { shopLine: "home", quoteAttemptLogId: null, notes: edison, logs: [] },
        "home",
        { multiLine: true, isPrimaryLine: true },
      ),
    ).toBe(true);
    expect(
      shopLineToPersist({
        shopLine: "home",
        quoteAttemptLogId: null,
        notes: "Flood NFIP (Wright WYO) — floor $489",
        logs: [],
      }),
    ).toBe("flood");
  });

  it("0122 notes backfill uses flood product cues, not a bare flood word", () => {
    const sql = readFileSync("drizzle/0122_bind_recheck_and_quote_lines.sql", "utf8");
    expect(sql).not.toContain("~* '\\y(flood|nfip)\\y'");
    expect(sql).toMatch(/beyond\[\[:space:\]\]\+floods/);
    expect(sql).toContain("\\ynfip\\y");
    expect(sql).toMatch(/with flood/);
    expect(sql).toMatch(/without flood/);
  });
});

describe("prior under carrier + line-scoped stale", () => {
  it("pairs the latest prior run under the current carrier row", () => {
    const grouped = groupQuotesByRun(
      [
        { id: "old", carrierId: "c1", runId: "run-1", createdAt: new Date("2026-08-01T12:00:00Z") },
        { id: "cur", carrierId: "c1", runId: "run-2", createdAt: new Date("2026-09-15T12:00:00Z") },
        { id: "other", carrierId: "c2", runId: "run-2", createdAt: new Date("2026-09-15T12:00:00Z") },
      ],
      (row) => ({ runId: row.runId, createdAt: row.createdAt }),
      "run-2",
    );
    const paired = attachPriorUnderCarrier(grouped.current, grouped.previous, (row) => row.carrierId);
    expect(paired).toHaveLength(2);
    expect(paired.find((row) => row.current.id === "cur")?.prior?.id).toBe("old");
    expect(paired.find((row) => row.current.id === "cur")?.priorLabel).toMatch(/^Prior ·/);
    expect(paired.find((row) => row.current.id === "other")?.prior).toBeNull();
  });

  it("stales one shop line without wiping the others", () => {
    const next = staleShopFlowForLine(
      {
        lineFingerprints: { home: { markets: "h", quotes: "h" }, auto: { markets: "a", quotes: "a" } },
        marketsFingerprint: "deal",
        quotesFingerprint: "deal",
      },
      "home",
    );
    expect(next.lineFingerprints?.home).toEqual({
      markets: STALE_SHOP_FINGERPRINT,
      quotes: STALE_SHOP_FINGERPRINT,
    });
    expect(next.lineFingerprints?.auto).toEqual({ markets: "a", quotes: "a" });
    const scoped = nextShopFlowAfterQuoteRun({
      saved: {},
      line: "home",
      fingerprint: "fp",
      newRunId: "run-9",
      requestCarrierIds: ["citizens", "universal"],
    });
    expect(requestScopeForLine(scoped, "home")).toEqual(["citizens", "universal"]);
    expect(requestScopeForLine(scoped, "auto")).toEqual([]);
    expect(
      resolveShopFlowCompletion({
        detailsComplete: true,
        documentsComplete: true,
        hasMarkets: true,
        hasQuotes: true,
        currentFingerprint: "h",
        saved: next,
        line: "home",
      }).isComplete("quotes"),
    ).toBe(false);
    expect(
      resolveShopFlowCompletion({
        detailsComplete: true,
        documentsComplete: true,
        hasMarkets: true,
        hasQuotes: true,
        currentFingerprint: "a",
        saved: next,
        line: "auto",
      }).isComplete("quotes"),
    ).toBe(true);
  });

  it("splits HO3 vs DP3 on the shared home shop line", () => {
    expect(inferHomeProductFromQuoteNotes("HO3 bindable Citizens")).toBe("homeowners");
    expect(inferHomeProductFromQuoteNotes("DP3 landlord dwelling")).toBe("landlord");
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "HO3 bindable", logs: [] },
        "landlord",
        { multiLine: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "HO3 bindable", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: null, notes: "Rated $1840", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Form PA rated $700", logs: [] },
        "auto",
        { multiLine: true, splitHomeProducts: false },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home", notes: "Form PA rated $700", logs: [] },
        "homeowners",
        { multiLine: true, splitHomeProducts: false },
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

  it("keeps existing quotes visible when request-quotes minted an empty current run", () => {
    const grouped = groupQuotesByRun(
      [
        { id: "old-a", runId: "run-1", createdAt: new Date("2026-09-01T12:00:00Z") },
        { id: "old-b", runId: "run-1", createdAt: new Date("2026-09-01T12:05:00Z") },
      ],
      (row) => ({ runId: row.runId, createdAt: row.createdAt }),
      "run-empty-new",
    );
    expect(grouped.current.map((row) => row.id)).toEqual(["old-a", "old-b"]);
    expect(grouped.previous).toEqual([]);
    expect(quoteRunIdAfterRequest({ savedRunId: null, existingRunIds: ["run-1"] })).toBe("run-1");
    expect(quoteRunIdAfterRequest({ savedRunId: "run-1", existingRunIds: ["run-1"] })).toBe("run-1");
    expect(quoteRunIdAfterRequest({ savedRunId: "fresh", existingRunIds: ["run-1"] })).toBe("run-1");
    expect(quoteRunIdAfterRequest({ savedRunId: "fresh", existingRunIds: [] })).toBe("fresh");
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
    expect(readFileSync("src/lib/deals/shop-flow-persist.ts", "utf8")).toMatch(
      /clearBindRecheckAcks\(dealId/,
    );
    expect(readFileSync("src/lib/deals/shop-flow-persist.ts", "utf8")).toMatch(
      /sheet_invalidated/,
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
      bindRecheckAckFingerprint: null,
      ...partial,
    } as Quote;
  }

  it("shows only the active line and tucks prior premium under the carrier", () => {
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
    expect(html).toMatch(/data-ff-quote-prior="cur"/);
    expect(html).toMatch(/Prior ·/);
    expect(html).not.toMatch(/data-ff-quotes-previous=/);
    expect(html).not.toMatch(/Previous quotes ·/);
  });

  it("still paints live quote rows when the saved run id matches nothing", () => {
    const html = renderToString(
      createElement(QuotesPanel, {
        dealId: "deal-1",
        shopLine: "home",
        product: "homeowners",
        formId: "HO3",
        quotes: [{ quote: quote({ id: "live-ho3", quoteRunId: "run-1", shopLine: "home" }), carrier }],
        logs: [],
        currentQuoteRunId: "run-empty-after-request",
        multiLine: true,
      }),
    );
    expect(html).toMatch(/data-ff-quote-row="live-ho3"/);
    expect(html).not.toMatch(/data-ff-quotes-current-empty/);
    expect(html).not.toMatch(/data-ff-quotes-empty/);
  });
});
