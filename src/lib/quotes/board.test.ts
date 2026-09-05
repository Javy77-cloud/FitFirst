import { describe, expect, it } from "vitest";
import { attachQuotePdfs, compareHref, quoteCompareId, quoteIdentity, selectedSameDeal } from "./board";
import { quoteCardDefaultOpen, shopSectionOpen } from "./collapse";
import type { TrackingRow, TrackingShop } from "./tracking";

function row(overrides: Partial<TrackingRow> = {}): TrackingRow {
  return {
    id: "row-1",
    dealId: "deal-1",
    dealTitle: "Dib · Palm Bay HO3",
    dealStage: "shopping",
    carrierId: "c-ai",
    carrierName: "American Integrity",
    line: "HO3",
    status: "quoted",
    premium: 5607.53,
    quoteNumber: "QT-AI-321",
    attemptedAt: new Date("2026-09-02T16:00:00.000Z"),
    bindable: false,
    appetiteLogId: "log-1",
    quoteId: "quote-1",
    policyId: null,
    why: "Quoted at $321k, not bindable.",
    cheapestQuotedRank: 1,
    lostReason: null,
    coverageA: 321000,
    aopDeductible: "$2,500",
    hurricaneDeductible: "2%",
    coverageGaps: [],
    notes: "Quoted at $321k, not bindable.",
    pdfDocumentId: null,
    pdfFilename: null,
    contactId: null,
    accountId: null,
    email: "ana@example.com",
    phone: "(321) 555-0100",
    ...overrides,
  };
}

describe("quote board helpers", () => {
  it("keeps identity visible when a card is collapsed", () => {
    const identity = quoteIdentity(row());
    expect(identity).toEqual({
      carrier: "American Integrity",
      premium: "$5,607.53",
      status: "quoted",
      quoteNumber: "QT-AI-321",
    });
    expect(quoteIdentity(row({ quoteNumber: null })).quoteNumber).toBe("—");
  });

  it("starts quote cards collapsed on the board and opens quoted rows on a focused shop", () => {
    expect(quoteCardDefaultOpen({ status: "quoted" })).toBe(false);
    expect(quoteCardDefaultOpen({ status: "skip" }, true)).toBe(false);
    expect(quoteCardDefaultOpen({ status: "quoted" }, true)).toBe(true);
    expect(shopSectionOpen({ quotedCount: 1, declinedCount: 3, boundCount: 0 })).toBe(true);
  });

  it("builds compare URLs from quote ids when present", () => {
    expect(quoteCompareId(row())).toBe("quote-1");
    expect(quoteCompareId(row({ quoteId: null, id: "log-9" }))).toBe("log-9");
    expect(compareHref("deal-1", ["quote-1", "quote-2"])).toBe(
      "/deals/deal-1/compare?q=quote-1%2Cquote-2",
    );
    expect(compareHref("deal-1", [])).toBe("/deals/deal-1/compare");
  });

  it("only compares a selection when every row is the same deal", () => {
    expect(selectedSameDeal([row(), row({ id: "row-2" })])).toBe("deal-1");
    expect(selectedSameDeal([row(), row({ dealId: "deal-2" })])).toBeNull();
    expect(selectedSameDeal([])).toBeNull();
  });

  it("attaches each issued quote PDF to its own row", () => {
    const shop: TrackingShop = {
      dealId: "deal-1",
      dealTitle: "Ruiz · Melbourne HO3",
      dealStage: "bound",
      line: "HO3",
      quotedCount: 2,
      declinedCount: 0,
      skipCount: 0,
      boundCount: 0,
      cheapestQuoted: null,
      rows: [
        row({ id: "ai", carrierName: "American Integrity", quoteNumber: "Q-AI-MEL-2840" }),
        row({ id: "tr", carrierName: "Tailrow", quoteNumber: "Q-TR-MEL-3120", premium: 3120 }),
      ],
    };
    const [decorated] = attachQuotePdfs([shop], [
      {
        id: "pdf-ai",
        dealId: "deal-1",
        filename: "american-integrity-quote-2840.pdf",
        docType: "quote_pdf",
        slot: "quote_pdf",
      },
      {
        id: "pdf-tr",
        dealId: "deal-1",
        filename: "Q-TR-MEL-3120-Tailrow.pdf",
        docType: "quote_pdf",
        slot: "quote_pdf",
      },
    ]);
    expect(decorated.rows[0].pdfDocumentId).toBe("pdf-ai");
    expect(decorated.rows[1].pdfDocumentId).toBe("pdf-tr");
  });
});
