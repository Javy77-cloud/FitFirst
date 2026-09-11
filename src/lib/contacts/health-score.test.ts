import { describe, expect, it } from "vitest";
import { contactHealthScore } from "./health-score";

describe("contactHealthScore", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("green when recent activity", () => {
    const r = contactHealthScore({
      policyCount: 0,
      lastActivityAt: new Date("2026-09-01T12:00:00Z"),
      now,
    });
    expect(r.level).toBe("green");
  });

  it("yellow when policies but stale", () => {
    const r = contactHealthScore({
      policyCount: 2,
      lastActivityAt: new Date("2026-06-01T12:00:00Z"),
      now,
    });
    expect(r.level).toBe("yellow");
  });

  it("red when no policies and cold", () => {
    const r = contactHealthScore({
      policyCount: 0,
      lastActivityAt: new Date("2026-01-01T12:00:00Z"),
      now,
    });
    expect(r.level).toBe("red");
  });
});
