import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./premium-change.tsx", import.meta.url), "utf8");

describe("PremiumChangeSummary", () => {
  it("keeps one $/% badge + quiet arrow and drops the duplicate summary sentence", () => {
    expect(source).toMatch(/formatSignedMoney\(change\.delta\)/);
    expect(source).toMatch(/formatDeltaPct\(change\.pct\)/);
    expect(source).toMatch(/formatMoney\(change\.current\).*→.*formatMoney\(change\.proposed\)/s);
    expect(source).not.toMatch(/compareSummary/);
    expect(source).not.toMatch(/premiumShopStayHint/);
    expect(source).toMatch(/premiumLapseRisk/);
    expect(source).toMatch(/Premium renewal risk/);
    expect(source).toMatch(/Open full compare/);
    expect(source).toMatch(/data-ff-premium-lapse/);
  });
});
