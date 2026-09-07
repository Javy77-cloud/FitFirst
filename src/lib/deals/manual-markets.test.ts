import { describe, expect, it } from "vitest";
import {
  MANUAL_MARKET_MARKER,
  bucketForMatch,
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
});
