import { describe, expect, it } from "vitest";
import { ELENA_QUOTE_AI_ID, ELENA_QUOTE_TAILROW_ID } from "@/lib/fixtures/ids";
import type { CompareQuote } from "./compare";
import { buildBrandedProposalPdf, proposalFilename, resolveProposalBrand } from "./proposal-pdf";

const elena: CompareQuote[] = [
  {
    id: ELENA_QUOTE_AI_ID,
    source: "quote",
    carrierName: "American Integrity",
    quoteNumber: "Q-AI-MEL-2840",
    premium: 2840,
    hurricaneDeductible: "2%",
    aopDeductible: "$2,500",
    coverageA: 385000,
    bindable: true,
    coverageGaps: [],
    result: "quoted",
    notes: null,
    why: null,
  },
  {
    id: ELENA_QUOTE_TAILROW_ID,
    source: "quote",
    carrierName: "Tailrow",
    quoteNumber: "Q-TR-MEL-3120",
    premium: 3120,
    hurricaneDeductible: "2%",
    aopDeductible: "$2,500",
    coverageA: 385000,
    bindable: true,
    coverageGaps: [],
    result: "quoted",
    notes: null,
    why: null,
  },
];

describe("branded proposal PDF", () => {
  it("names the file from the deal title", () => {
    expect(proposalFilename("Ruiz · Melbourne HO3")).toBe("proposal-Ruiz_Melbourne_HO3.pdf");
  });

  it("falls back to the agency brand when Settings has no name", () => {
    expect(resolveProposalBrand({}).agencyName).toBe("Javier Garcia Insurance");
  });

  it("writes a real PDF with the selected quotes", async () => {
    const bytes = await buildBrandedProposalPdf({
      dealTitle: "Ruiz · Melbourne HO3",
      insuredName: "Elena Ruiz",
      quotes: elena,
      videoProposalUrl: "https://fitfirst.example/video/ruiz-melbourne-ho3",
    });
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(800);
  });
});
