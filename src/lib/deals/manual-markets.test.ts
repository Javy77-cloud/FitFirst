import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MANUAL_MARKET_MARKER,
  bucketForMatch,
  hasMarketLookupData,
  manualCarrierIdsFromLogs,
  marketBucketLabel,
} from "./manual-markets";

describe("manual markets", () => {
  it("treats a manual log as an appetite override", () => {
    expect(bucketForMatch("red", true)).toBe("appetite");
    expect(bucketForMatch("yellow", false)).toBe("stretch");
    expect(bucketForMatch("green", false)).toBe("appetite");
    expect(marketBucketLabel("appetite")).toBe("In appetite");
    expect(
      manualCarrierIdsFromLogs([
        { carrierId: "c1", why: `${MANUAL_MARKET_MARKER} override` },
        { carrierId: "c2", why: "portal closed" },
      ]),
    ).toEqual(["c1"]);
  });

  it("treats Markets as empty until a lookup or manual carrier exists", () => {
    expect(hasMarketLookupData([], [])).toBe(false);
    expect(hasMarketLookupData([], ["c1"])).toBe(true);
    expect(hasMarketLookupData([{ carrierId: "c1" }], [])).toBe(true);
    const panel = readFileSync("src/components/deal/markets-panel.tsx", "utf8");
    expect(panel).toMatch(/data-ff-markets-empty/);
    expect(panel).toMatch(/hasMarketLookupData/);
    expect(panel).toMatch(/appetite\.length > 0/);
    expect(panel).toMatch(/stretch\.length > 0/);
    expect(panel).toMatch(/skip\.length > 0/);
    expect(panel).not.toMatch(/No in-appetite markets/);
    expect(panel).not.toMatch(/No stretch markets/);
    expect(panel).not.toMatch(/Nothing to skip/);
    expect(panel).toMatch(/marketBucketLabel\("appetite"\)/);
    expect(panel).toMatch(/Approve & request quotes/);
  });
});
