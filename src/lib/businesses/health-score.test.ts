import { describe, expect, it } from "vitest";
import { businessHealthScore } from "./health-score";

describe("businessHealthScore", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("is green with active policies and recent activity", () => {
    expect(
      businessHealthScore({
        activePolicyCount: 2,
        lastActivityAt: "2026-09-01T12:00:00Z",
        now,
      }).level,
    ).toBe("green");
  });

  it("is yellow with policies but quiet under 90 days", () => {
    expect(
      businessHealthScore({
        activePolicyCount: 1,
        lastActivityAt: "2026-07-20T12:00:00Z",
        now,
      }).level,
    ).toBe("yellow");
  });

  it("is red with no policies", () => {
    expect(
      businessHealthScore({ activePolicyCount: 0, lastActivityAt: "2026-09-01T12:00:00Z", now })
        .level,
    ).toBe("red");
  });

  it("is red when activity is older than 90 days", () => {
    expect(
      businessHealthScore({
        activePolicyCount: 1,
        lastActivityAt: "2026-01-01T12:00:00Z",
        now,
      }).level,
    ).toBe("red");
  });
});
