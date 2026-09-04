import { describe, expect, it } from "vitest";
import { brandInk, buildBrandedProposalPdf, proposalFilename } from "./branded-pdf";
import type { ComparedQuote } from "@/lib/quotes/gap-notes";

const quotes: ComparedQuote[] = [
  {
    id: "ai",
    carrierName: "American Integrity",
    premium: 2840,
    aopDeductible: "$2,500",
    hurricaneDeductible: "2%",
    coverageA: 385000,
    bindable: true,
    coverageGaps: [],
    notes: null,
    includesFlood: false,
    cheapest: true,
    notesPlain: [
      {
        code: "no_flood",
        text: "No flood — Florida homeowners quotes do not include NFIP or private flood unless endorsed.",
        severity: "watch",
      },
    ],
  },
  {
    id: "geo",
    carrierName: "GeoVera",
    premium: 3640,
    aopDeductible: "$5,000",
    hurricaneDeductible: "5%",
    coverageA: 365000,
    bindable: true,
    coverageGaps: ["No flood"],
    notes: null,
    includesFlood: false,
    cheapest: false,
    notesPlain: [
      { code: "aop_higher", text: "AOP deductible is higher ($5,000 vs $2,500).", severity: "gap" },
      { code: "no_flood", text: "No flood coverage on this quote.", severity: "gap" },
    ],
  },
];

describe("proposal branding", () => {
  it("names the file from the deal title", () => {
    expect(proposalFilename("Ruiz · Melbourne HO3")).toMatch(/^proposal-Ruiz_Melbourne_HO3-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("maps color presets to desk ink", () => {
    expect(brandInk("agency").primary).toBe("#0c2340");
    expect(brandInk("terracotta").accent).toBe("#b4532a");
    expect(brandInk("unknown").primary).toBe("#0c2340");
  });

  it("writes a real PDF with side-by-side premiums", async () => {
    const buf = await buildBrandedProposalPdf({
      brand: { agencyName: "Javier Garcia Insurance", colorPreset: "agency", phone: "321-429-1182" },
      deal: {
        title: "Ruiz · Melbourne HO3",
        insuredName: "Elena Ruiz",
        line: "HO",
        state: "FL",
        coverageA: 385000,
      },
      quotes,
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(800);
  });
});
