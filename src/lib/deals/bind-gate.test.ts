import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  BIND_GATE_COPY,
  bindGateReady,
  bindRecheckTermsFingerprint,
  bindRecheckTermsFromQuote,
  canBindAfterRecheckAck,
  quoteBindRecheckAcked,
} from "./bind-gate";

const ACKED_AT = new Date("2026-09-15T12:00:00Z");

function quote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
  const base = {
    tenantId: "t",
    dealId: "deal-1",
    riskId: "risk-1",
    carrierId: "car-1",
    quoteAttemptLogId: null,
    quoteNumber: null,
    premium: "1840",
    hurricaneDeductible: "2%",
    aopDeductible: "1%",
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
    bindRecheckAckedAt: null,
    bindRecheckAckFingerprint: null,
    ...partial,
  };
  return base as Quote;
}

function ackedQuote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
  const row = quote(partial);
  return quote({
    ...row,
    bindRecheckAckedAt: row.bindRecheckAckedAt ?? ACKED_AT,
    bindRecheckAckFingerprint:
      row.bindRecheckAckFingerprint ?? bindRecheckTermsFingerprint(bindRecheckTermsFromQuote(row)),
  });
}

const carrier = {
  id: "car-1",
  tenantId: "t",
  name: "Citizens",
  writtenLines: ["HO"],
} as Carrier;

describe("bind gate", () => {
  it("blocks finalize until all three re-checks are ticked", () => {
    expect(bindGateReady({ premium: true, coverages: true, deductibles: false })).toBe(false);
    expect(bindGateReady({ premium: true, coverages: true, deductibles: true })).toBe(true);
    expect(BIND_GATE_COPY.blocked).toMatch(/Cannot finalize/);
    expect(BIND_GATE_COPY.subtitle).toMatch(/provisional|additional/i);
  });

  it("includes verify prompt for bind-recheck popup", () => {
    expect(BIND_GATE_COPY.verifyPrompt).toMatch(/confirm the premium, coverages, and deductibles/i);
    expect(BIND_GATE_COPY.acceptFloorHeading).toMatch(/Meet carrier minimum/i);
    expect(BIND_GATE_COPY.reQuote).toBe("Re-quote");
  });

  it("Save is the primary acknowledgment and turns the icon green only after a matching fingerprint", () => {
    expect(BIND_GATE_COPY.save).toBe("Save");
    expect(BIND_GATE_COPY.saveTitle).toMatch(/premium|coverage|deductible/i);
    const terms = bindRecheckTermsFromQuote(quote({ id: "q-terms" }));
    const fingerprint = bindRecheckTermsFingerprint(terms);
    expect(quoteBindRecheckAcked(null)).toBe(false);
    expect(quoteBindRecheckAcked(ACKED_AT)).toBe(false);
    expect(quoteBindRecheckAcked({ ackedAt: null, fingerprint, terms })).toBe(false);
    expect(quoteBindRecheckAcked({ ackedAt: ACKED_AT, fingerprint: null, terms })).toBe(false);
    expect(quoteBindRecheckAcked({ ackedAt: ACKED_AT, fingerprint, terms })).toBe(true);
    expect(canBindAfterRecheckAck({ bindable: true, ackedAt: null, fingerprint, terms })).toBe(false);
    expect(canBindAfterRecheckAck({ bindable: true, ackedAt: ACKED_AT, fingerprint, terms })).toBe(true);
    expect(canBindAfterRecheckAck({ bindable: false, ackedAt: ACKED_AT, fingerprint, terms })).toBe(false);
  });

  it("invalidates a saved ack when premium, coverage, deductible, or quote run change", () => {
    const terms = bindRecheckTermsFromQuote(quote({ id: "q-fp" }));
    const fingerprint = bindRecheckTermsFingerprint(terms);
    expect(
      quoteBindRecheckAcked({
        ackedAt: ACKED_AT,
        fingerprint,
        terms: { ...terms, premium: "9999" },
      }),
    ).toBe(false);
    expect(
      quoteBindRecheckAcked({
        ackedAt: ACKED_AT,
        fingerprint,
        terms: { ...terms, coverageA: 400000 },
      }),
    ).toBe(false);
    expect(
      quoteBindRecheckAcked({
        ackedAt: ACKED_AT,
        fingerprint,
        terms: { ...terms, aopDeductible: "2%" },
      }),
    ).toBe(false);
    expect(
      quoteBindRecheckAcked({
        ackedAt: ACKED_AT,
        fingerprint,
        terms: { ...terms, quoteRunId: "run-3" },
      }),
    ).toBe(false);
    expect(canBindAfterRecheckAck({ bindable: true, ackedAt: ACKED_AT, fingerprint, terms: { ...terms, premium: "1" } })).toBe(
      false,
    );
    expect(BIND_GATE_COPY.staleHint).toMatch(/terms changed/i);
    expect(BIND_GATE_COPY.bindBlockedUntilSave).toMatch(/Save/i);
  });

  it("quotes table uses Save, gates Bind, and has no manual uncheck-with-reason UI", () => {
    const table = readFileSync("src/components/deal/quotes-results-table.tsx", "utf8");
    expect(table).toMatch(/data-ff-quote-bind-alert-save=/);
    expect(table).toMatch(/BIND_GATE_COPY\.save/);
    expect(table).not.toMatch(/>\s*Close\s*</);
    expect(table).toMatch(/saveBindRecheckAckAction/);
    expect(table).not.toMatch(/clearBindRecheckAckAction/);
    expect(table).not.toMatch(/data-ff-quote-bind-alert-uncheck/);
    expect(table).toMatch(/data-ff-quote-bind-alert-state=\{recheckAcked \? "acked" : "open"\}/);
    expect(table).toMatch(/quoteCanBind|canBindAfterRecheckAck/);
    const actions = readFileSync("src/app/actions/quotes.ts", "utf8");
    expect(actions).toMatch(/export async function saveBindRecheckAckAction/);
    expect(actions).not.toMatch(/export async function clearBindRecheckAckAction/);
    expect(actions).toMatch(/bindRecheckTermsFingerprint/);
    expect(actions).toMatch(/clearBindRecheckAcks\(dealId, ids\)/);
    expect(actions).toMatch(/coverageA: floor, \.\.\.BIND_RECHECK_CLEAR_PATCH/);
    const persist = readFileSync("src/lib/deals/shop-flow-persist.ts", "utf8");
    expect(persist).toMatch(/export async function clearBindRecheckAcks/);
    expect(persist).toMatch(/await clearBindRecheckAcks\(dealId\)/);
  });

  it("renders Bind disabled until Save, then greens the warning after ack", () => {
    const blocked = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        rows: [{ quote: quote({ id: "q-open" }), carrier }],
      }),
    );
    expect(blocked).toMatch(/data-ff-quote-bind-alert="q-open"/);
    expect(blocked).toMatch(/data-ff-quote-bind-alert-state="open"/);
    expect(blocked).toMatch(/data-ff-quote-bind="q-open"/);
    expect(blocked).toMatch(/data-ff-quote-bind-gated="blocked"/);
    expect(blocked).toContain(BIND_GATE_COPY.bindBlockedUntilSave);
    expect(blocked).toContain("disabled");

    const saved = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        rows: [{ quote: ackedQuote({ id: "q-acked" }), carrier }],
      }),
    );
    expect(saved).toMatch(/data-ff-quote-bind-alert-state="acked"/);
    expect(saved).toMatch(/data-ff-quote-bind-gated="ready"/);
    expect(saved).toContain(BIND_GATE_COPY.ackedHint);
    expect(saved).toMatch(/text-fit-green/);

    const stale = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        rows: [
          {
            quote: quote({
              id: "q-stale",
              bindRecheckAckedAt: ACKED_AT,
              bindRecheckAckFingerprint: bindRecheckTermsFingerprint({
                premium: "100",
                coverageA: 1,
                hurricaneDeductible: "1%",
                aopDeductible: "1%",
                quoteRunId: "old",
              }),
            }),
            carrier,
          },
        ],
      }),
    );
    expect(stale).toMatch(/data-ff-quote-bind-alert-state="open"/);
    expect(stale).toMatch(/data-ff-quote-bind-gated="blocked"/);
  });
});
