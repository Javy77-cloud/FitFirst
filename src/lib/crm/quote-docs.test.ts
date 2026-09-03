import { describe, expect, it } from "vitest";
import { QUOTE_CREATES_POLICY } from "./bind";
import { buildStubQuotePdf, quotePdfFilename } from "./quote-pdf";

describe("finalized quote PDFs", () => {
  it("names a deal attachment without implying a policy", () => {
    expect(quotePdfFilename("American Integrity", "STUB-AMER-12345")).toBe(
      "STUB-AMER-12345-American_Integrity.pdf",
    );
    expect(QUOTE_CREATES_POLICY).toBe(false);
  });

  it("builds a stub PDF that says it is not a policy", async () => {
    const buf = await buildStubQuotePdf({
      dealTitle: "Cruz · HO shop",
      carrierName: "Example Mutual",
      quoteNumber: "STUB-EXAM-1",
      premium: "1840",
      coverageA: 321000,
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      bindable: true,
    });
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(200);
  });
});
