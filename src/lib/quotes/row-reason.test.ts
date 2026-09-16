import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotesResultsTable } from "@/components/deal/quotes-results-table";
import type { Carrier, Quote } from "@/lib/db/schema";
import { quoteRowReason } from "./row-reason";
import {
  SPEECH_NOTE_LANGS,
  appendSpeechTranscript,
  collectFinalSpeechTranscript,
} from "./speech-note";

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
    coverageA: 250000,
    bindable: false,
    riskOutcome: "conditional",
    nextStep: "fixable",
    coverageGaps: [],
    notes: "",
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
  } as Quote;
}

const carrier = {
  id: "car-1",
  tenantId: "t",
  name: "NFIP",
  writtenLines: ["FLOOD"],
} as Carrier;

describe("quote row reasons", () => {
  it("surfaces a concrete bind requirement instead of a hollow generic", () => {
    const reason = quoteRowReason({
      notes: "HO3 · 4-point + wind mit required before bind",
      riskOutcome: "conditional",
    });
    expect(reason.provided).toBe(true);
    expect(reason.label).toMatch(/Four-point|Wind mitigation/i);
    expect(reason.label).not.toMatch(/needs follow-up/i);
  });

  it("uses flood zone / UW language from the carrier why when chips are empty", () => {
    expect(
      quoteRowReason({
        riskOutcome: "conditional",
        logWhy: "NFIP provisional · flood zone AE · waiting UW",
      }).label,
    ).toBe("Flood zone AE");
    expect(
      quoteRowReason({
        riskOutcome: "conditional",
        logWhy: "UW referral — underwriting hold on roof age",
      }).label,
    ).toBe("Underwriting hold");
  });

  it("surfaces stored lostReason / reasonForNo codes as real labels", () => {
    expect(
      quoteRowReason({ riskOutcome: "declined", lostReason: "uw_roof" }).label,
    ).toBe("Underwriting — roof");
    expect(
      quoteRowReason({ riskOutcome: "declined", reasonForNo: "too_expensive" }).label,
    ).toBe("Too expensive");
  });

  it("falls back to an honest empty state — never a fake generic", () => {
    const reason = quoteRowReason({ riskOutcome: "conditional" });
    expect(reason.provided).toBe(false);
    expect(reason.label).toBe("Reason not provided by carrier");
  });
});

describe("quote notepad + speech", () => {
  it("appends dictated chunks onto the same note field", () => {
    expect(appendSpeechTranscript("", "needs 4-point")).toBe("needs 4-point");
    expect(appendSpeechTranscript("needs 4-point", "and wind mit")).toBe(
      "needs 4-point and wind mit",
    );
    expect(SPEECH_NOTE_LANGS).toEqual(["en-US", "es-US"]);
    expect(
      collectFinalSpeechTranscript(
        [
          { isFinal: false, 0: { transcript: "hold" } },
          { isFinal: true, 0: { transcript: "needs four point" } },
        ],
        0,
      ),
    ).toBe("needs four point");
    expect(collectFinalSpeechTranscript([{ 0: { transcript: "ok" } }], 0)).toBe("ok");
  });

  it("wires notepad + save (no per-quote stage ladder) and marks the bound row", () => {
    const html = renderToString(
      createElement(QuotesResultsTable, {
        dealId: "deal-1",
        formId: "HO3",
        confirmLogs: [],
        resultByCarrier: {},
        boundQuoteId: "bound-1",
        notesByQuote: {
          "bound-1": [
            {
              id: "n1",
              tenantId: "t",
              quoteId: "bound-1",
              body: "needs 4-point + wind mit before bind",
              createdBy: "Javy",
              createdAt: new Date("2026-09-15T12:00:00.000Z"),
            },
          ],
        },
        rows: [
          {
            quote: quote({
              id: "bound-1",
              agentStatus: "bound",
              bindable: true,
              riskOutcome: "bindable",
              notes: "HO3 bindable",
            }),
            carrier,
          },
          {
            quote: quote({
              id: "cond-1",
              carrierId: "car-2",
              notes: "4-point inspection required",
            }),
            carrier: { ...carrier, id: "car-2", name: "Universal" },
          },
        ],
      }),
    );
    expect(html).not.toMatch(/data-ff-quote-agent-status=/);
    expect(html).not.toContain("Pending inspection");
    expect(html).toMatch(/data-ff-quote-notepad="bound-1"/);
    expect(html).toMatch(/data-ff-quote-bound="1"/);
    expect(html).toMatch(/data-ff-quote-bound-badge=""/);
    expect(html).toContain("BOUND");
    expect(html).toMatch(/data-ff-quote-row-reason="cond-1"/);
    expect(html).toMatch(/Four-point inspection required/);
    const notepad = readFileSync("src/components/deal/quote-note-pad.tsx", "utf8");
    expect(notepad).toMatch(/addQuoteNoteAction/);
    expect(notepad).toMatch(/data-ff-quote-note-save/);
    expect(notepad).toMatch(/en-US/);
    expect(notepad).toMatch(/es-US/);
    expect(notepad).toMatch(/speechRecognitionCtor/);
    expect(readFileSync("src/components/deal/quotes-results-table.tsx", "utf8")).not.toMatch(
      /AGENT_STATUSES/,
    );
  });
});
