import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeCoverageGaps } from "@/lib/coverage/gaps";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("coverage-gap cross-sell is off the deal workspace", () => {
  it("does not mount the renewals strip or GapPanel on any deal tab", () => {
    const dealPage = source("src/app/deals/[id]/page.tsx");
    const details = source("src/components/custom-fields/deal-details-panel.tsx");
    const documents = source("src/components/deal/documents-panel.tsx");
    const markets = source("src/components/deal/markets-panel.tsx");
    const quotes = source("src/components/deal/quotes-panel.tsx");
    for (const src of [dealPage, details, documents, markets, quotes]) {
      expect(src).not.toMatch(/RenewalGapStrip/);
      expect(src).not.toMatch(/GapPanel/);
      expect(src).not.toMatch(/loadRenewalGapItems/);
    }
  });

  it("only some deals showed the strip because findings require in-force household lines", () => {
    const rosaStyle = analyzeCoverageGaps({
      policies: [{ id: "rosa-ho3", status: "active", lineOfBusiness: "HO3" }],
      partyName: "Rosa Castellanos",
    });
    expect(rosaStyle.inForceCount).toBe(1);
    expect(rosaStyle.findings.map((finding) => finding.id)).toEqual([
      "home-no-auto",
      "home-no-flood",
      "no-umbrella",
    ]);

    const quoteOnly = analyzeCoverageGaps({
      policies: [],
      partyName: "Ana Dib",
      isAna: true,
      quoteCount: 8,
    });
    expect(quoteOnly.inForceCount).toBe(0);
    expect(quoteOnly.findings).toEqual([]);
  });
});
