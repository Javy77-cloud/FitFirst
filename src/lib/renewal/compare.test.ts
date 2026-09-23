import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CONTACT_ID, DEAL_ID, HALE_POLICY_ID, NAIR_POLICY_ID } from "@/lib/fixtures/ids";
import {
  compareSummary,
  coverageRows,
  formatDeltaPct,
  formatSignedMoney,
  parseMoney,
  premiumChange,
  premiumShopStayHint,
} from "./compare";

describe("premiumChange", () => {
  it("summarizes Hale HO3 increase in dollars and percent", () => {
    const change = premiumChange(2184, 2547);
    expect(change.delta).toBe(363);
    expect(change.direction).toBe("up");
    expect(change.pct).toBeCloseTo(363 / 2184, 6);
    expect(formatSignedMoney(change.delta)).toBe("+$363");
    expect(formatDeltaPct(change.pct)).toBe("+16.6%");
    expect(compareSummary(change)).toBe(
      "Premium increase +$363 (+16.6%) from $2,184 to $2,547.",
    );
  });

  it("summarizes Nair Auto decrease in dollars and percent", () => {
    const change = premiumChange(1428, 1356);
    expect(change.delta).toBe(-72);
    expect(change.direction).toBe("down");
    expect(formatSignedMoney(change.delta)).toBe("-$72");
    expect(formatDeltaPct(change.pct)).toBe("-5.0%");
    expect(compareSummary(change)).toBe(
      "Premium decrease -$72 (-5.0%) from $1,428 to $1,356.",
    );
  });

  it("treats a zero dollar move as flat", () => {
    const change = premiumChange(1800, 1800);
    expect(change.direction).toBe("flat");
    expect(change.delta).toBe(0);
    expect(formatDeltaPct(change.pct)).toBe("0.0%");
    expect(compareSummary(change)).toBe("Premium unchanged at $1,800.");
  });

  it("does not invent a percent when current premium is zero", () => {
    const change = premiumChange(0, 500);
    expect(change.pct).toBeNull();
    expect(formatDeltaPct(change.pct)).toBe("—");
  });
});

describe("coverageRows", () => {
  it("flags only coverages that actually changed", () => {
    const rows = coverageRows(
      [
        { key: "cov_a", label: "Coverage A", value: "$275,000" },
        { key: "water_backup", label: "Water backup", value: "$10,000" },
      ],
      [
        { key: "cov_a", label: "Coverage A", value: "$285,000" },
        { key: "water_backup", label: "Water backup", value: "$10,000" },
      ],
    );
    expect(rows[0]?.changed).toBe(true);
    expect(rows[1]?.changed).toBe(false);
  });
});

describe("parseMoney", () => {
  it("reads numeric strings and formatted dollars", () => {
    expect(parseMoney("2547.00")).toBe(2547);
    expect(parseMoney("$2,547")).toBe(2547);
    expect(parseMoney("")).toBeNull();
  });
});

describe("Ana Dib fixture stays unbound at $321k", () => {
  it("does not rewrite Cov A, contact, or shop deal ids", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
    expect(CONTACT_ID).toBe("22222222-2222-4222-8222-222222222224");
    expect(DEAL_ID).toBe("22222222-2222-4222-8222-222222222222");
    expect(HALE_POLICY_ID).not.toBe(CONTACT_ID);
    expect(NAIR_POLICY_ID).not.toBe(DEAL_ID);
  });
});

describe("premiumShopStayHint", () => {
  it("hints modest stay under 5% and shop when sharp", () => {
    expect(premiumShopStayHint(premiumChange(3000, 3090))).toMatch(/Modest increase/i);
    expect(premiumShopStayHint(premiumChange(2184, 2547))).toMatch(/Sharp increase|shop strong/i);
    expect(premiumShopStayHint(premiumChange(2000, 2200))).toMatch(/Material increase|shop if needed/i);
    expect(premiumShopStayHint(premiumChange(1800, 1800))).toMatch(/Flat renewal/i);
    expect(premiumShopStayHint(premiumChange(1428, 1356))).toMatch(/Premium down/i);
  });
});
