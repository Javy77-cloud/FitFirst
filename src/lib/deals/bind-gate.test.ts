import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  BIND_GATE_COPY,
  bindGateReady,
  canBindAfterRecheckAck,
  clearBindRecheckReasonOk,
  quoteBindRecheckAcked,
} from "./bind-gate";

function quote(partial: Partial<Quote> & Pick<Quote, "id">): Quote {
  return {
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
    bindRecheckClearedReason: null,
    ...partial,
  } as Quote;
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

  it("Save is the primary acknowledgment and turns the icon green only after ack", () => {
    expect(BIND_GATE_COPY.save).toBe("Save");
    expect(BIND_GATE_COPY.saveTitle).toMatch(/premium|coverage|deductible/i);
    expect(quoteBindRecheckAcked(null)).toBe(false);
    expect(quoteBindRecheckAcked("")).toBe(false);
    expect(quoteBindRecheckAcked(new Date("2026-09-15T12:00:00Z"))).toBe(true);
    expect(canBindAfterRecheckAck({ bindable: true, ackedAt: null })).toBe(false);
    expect(canBindAfterRecheckAck({ bindable: true, ackedAt: new Date() })).toBe(true);
    expect(canBindAfterRecheckAck({ bindable: false, ackedAt: new Date() })).toBe(false);
  });

  it("requires a reason to uncheck a saved acknowledgment", () => {
    expect(clearBindRecheckReasonOk("")).toBe(false);
    expect(clearBindRecheckReasonOk("   ")).toBe(false);
    expect(clearBindRecheckReasonOk("Quoted the wrong Cov A — need to re-verify")).toBe(true);
    expect(BIND_GATE_COPY.uncheckBlocked).toMatch(/reason/i);
    expect(BIND_GATE_COPY.bindBlockedUntilSave).toMatch(/Save/i);
  });

  it("quotes table uses Save, gates Bind, and greens the icon after ack", () => {
    const table = readFileSync("src/components/deal/quotes-results-table.tsx", "utf8");
    expect(table).toMatch(/data-ff-quote-bind-alert-save=/);
    expect(table).toMatch(/BIND_GATE_COPY\.save/);
    expect(table).not.toMatch(/>\s*Close\s*</);
    expect(table).toMatch(/saveBindRecheckAckAction/);
    expect(table).toMatch(/clearBindRecheckAckAction/);
    expect(table).toMatch(/data-ff-quote-bind-alert-state=\{recheckAcked \? "acked" : "open"\}/);
    expect(table).toMatch(/canBindAfterRecheckAck/);
    expect(table).toMatch(/data-ff-quote-bind-alert-uncheck-reason=/);
    const actions = readFileSync("src/app/actions/quotes.ts", "utf8");
    expect(actions).toMatch(/export async function saveBindRecheckAckAction/);
    expect(actions).toMatch(/export async function clearBindRecheckAckAction/);
    expect(actions).toMatch(/A reason is required to uncheck this disclosure/);
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
        rows: [
          {
            quote: quote({
              id: "q-acked",
              bindRecheckAckedAt: new Date("2026-09-15T12:00:00Z"),
            }),
            carrier,
          },
        ],
      }),
    );
    expect(saved).toMatch(/data-ff-quote-bind-alert-state="acked"/);
    expect(saved).toMatch(/data-ff-quote-bind-gated="ready"/);
    expect(saved).toContain(BIND_GATE_COPY.ackedHint);
    expect(saved).toMatch(/text-fit-green/);
  });
});
